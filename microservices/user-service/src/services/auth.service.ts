import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { users, sessions, auditLogs } from '../database/schema.js';
import { logger } from '../utils/logger.js';
import {
  User,
  UserRole,
  UserStatus,
  JWTPayload,
  LoginRequestSchema,
  RegisterRequestSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  EmailVerificationSchema,
  ChangePasswordRequestSchema
} from '../types/user.types.js';
import { EmailService } from './email.service.js';
import { RedisService } from './redis.service.js';

export class AuthService {
  private emailService: EmailService;
  private redisService: RedisService;
  private readonly SALT_ROUNDS = 12;
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.emailService = new EmailService();
    this.redisService = new RedisService();
  }

  /**
   * Registra un nuevo usuario
   */
  async register(userData: typeof RegisterRequestSchema._type): Promise<{ user: Omit<User, 'passwordHash'>; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    try {
      // Validar que las contraseñas coincidan
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      // Verificar si el email ya existe
      const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      if (existingUser.length > 0) {
        throw new Error('El email ya está registrado');
      }

      // Verificar si el username ya existe (si se proporciona)
      if (userData.profile.username) {
        const existingUsername = await db.select().from(users).where(eq(users.username, userData.profile.username)).limit(1);
        if (existingUsername.length > 0) {
          throw new Error('El nombre de usuario ya está en uso');
        }
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

      // Generar token de verificación de email
      const emailVerificationToken = uuidv4();

      // Crear el usuario
      const [newUser] = await db.insert(users).values({
        email: userData.email,
        username: userData.profile.username,
        passwordHash,
        role: userData.role,
        status: 'pending',
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        emailVerificationToken
      }).returning();

      // Generar tokens
      const tokens = await this.generateTokens(newUser);

      // Crear sesión
      await this.createSession(newUser.id, tokens.refreshToken);

      // Enviar email de verificación
      await this.emailService.sendEmailVerification(newUser.email, emailVerificationToken);

      // Log de auditoría
      await this.logAuditEvent(newUser.id, 'user.created', 'users', newUser.id, {
        email: newUser.email,
        role: newUser.role
      });

      logger.info(`Usuario registrado exitosamente: ${newUser.email}`, {
        userId: newUser.id,
        role: newUser.role
      });

      return {
        user: this.sanitizeUser(newUser),
        tokens
      };

    } catch (error) {
      logger.error('Error en registro de usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        email: userData.email
      });
      throw error;
    }
  }

  /**
   * Autentica un usuario
   */
  async login(loginData: typeof LoginRequestSchema._type, ipAddress: string, userAgent: string): Promise<{ user: Omit<User, 'passwordHash'>; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    try {
      // Buscar usuario por email
      const [user] = await db.select().from(users).where(eq(users.email, loginData.email)).limit(1);
      
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar si la cuenta está bloqueada
      if (user.lockUntil && user.lockUntil > new Date()) {
        throw new Error('Cuenta temporalmente bloqueada. Intente más tarde.');
      }

      // Verificar si la cuenta está activa
      if (user.status !== 'active') {
        throw new Error('Cuenta no activa. Verifique su email o contacte al administrador.');
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
      
      if (!isPasswordValid) {
        // Incrementar intentos de login
        await this.incrementLoginAttempts(user.id);
        throw new Error('Credenciales inválidas');
      }

      // Resetear intentos de login si la contraseña es correcta
      await this.resetLoginAttempts(user.id);

      // Actualizar último login
      await db.update(users)
        .set({ 
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Generar tokens
      const tokens = await this.generateTokens(user);

      // Crear sesión
      await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);

      // Log de auditoría
      await this.logAuditEvent(user.id, 'user.login', 'users', user.id, {
        ipAddress,
        userAgent
      });

      logger.info(`Usuario autenticado exitosamente: ${user.email}`, {
        userId: user.id,
        ipAddress
      });

      return {
        user: this.sanitizeUser(user),
        tokens
      };

    } catch (error) {
      logger.error('Error en login de usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        email: loginData.email,
        ipAddress
      });
      throw error;
    }
  }

  /**
   * Refresca el token de acceso
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verificar token de refresh
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JWTPayload;

      // Verificar que la sesión existe y no ha expirado
      const [session] = await db.select()
        .from(sessions)
        .where(and(
          eq(sessions.refreshToken, refreshToken),
          eq(sessions.userId, payload.userId),
          eq(sessions.expiresAt, new Date())
        ))
        .limit(1);

      if (!session) {
        throw new Error('Token de refresh inválido o expirado');
      }

      // Obtener usuario
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      
      if (!user || user.status !== 'active') {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // Generar nuevo token de acceso
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        this.JWT_SECRET,
        { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN }
      );

      const expiresIn = 15 * 60; // 15 minutes in seconds

      logger.info(`Token refrescado para usuario: ${user.email}`, {
        userId: user.id
      });

      return { accessToken, expiresIn };

    } catch (error) {
      logger.error('Error al refrescar token', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(refreshToken: string, userId: string): Promise<void> {
    try {
      // Eliminar sesión
      await db.delete(sessions)
        .where(and(
          eq(sessions.refreshToken, refreshToken),
          eq(sessions.userId, userId)
        ));

      // Log de auditoría
      await this.logAuditEvent(userId, 'user.logout', 'users', userId);

      logger.info(`Usuario cerró sesión: ${userId}`);

    } catch (error) {
      logger.error('Error al cerrar sesión', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId
      });
      throw error;
    }
  }

  /**
   * Solicita reset de contraseña
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (!user) {
        // No revelar si el email existe o no
        logger.info(`Solicitud de reset de contraseña para email no registrado: ${email}`);
        return;
      }

      // Generar token de reset
      const passwordResetToken = uuidv4();
      const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Actualizar usuario
      await db.update(users)
        .set({
          passwordResetToken,
          passwordResetExpires,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Enviar email de reset
      await this.emailService.sendPasswordReset(user.email, passwordResetToken);

      // Log de auditoría
      await this.logAuditEvent(user.id, 'password.reset.requested', 'users', user.id);

      logger.info(`Solicitud de reset de contraseña enviada: ${email}`);

    } catch (error) {
      logger.error('Error al solicitar reset de contraseña', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        email
      });
      throw error;
    }
  }

  /**
   * Confirma reset de contraseña
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      // Buscar usuario con token válido
      const [user] = await db.select()
        .from(users)
        .where(and(
          eq(users.passwordResetToken, token),
          eq(users.passwordResetExpires, new Date())
        ))
        .limit(1);

      if (!user) {
        throw new Error('Token de reset inválido o expirado');
      }

      // Hash de la nueva contraseña
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Actualizar usuario
      await db.update(users)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          loginAttempts: 0,
          lockUntil: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Invalidar todas las sesiones del usuario
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      // Log de auditoría
      await this.logAuditEvent(user.id, 'password.reset.completed', 'users', user.id);

      logger.info(`Contraseña reseteada exitosamente: ${user.email}`);

    } catch (error) {
      logger.error('Error al confirmar reset de contraseña', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Verifica email del usuario
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      // Buscar usuario con token de verificación
      const [user] = await db.select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1);

      if (!user) {
        throw new Error('Token de verificación inválido');
      }

      // Actualizar usuario
      await db.update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Log de auditoría
      await this.logAuditEvent(user.id, 'email.verified', 'users', user.id);

      logger.info(`Email verificado exitosamente: ${user.email}`);

    } catch (error) {
      logger.error('Error al verificar email', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Cambia la contraseña del usuario
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Obtener usuario
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Hash de la nueva contraseña
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Actualizar usuario
      await db.update(users)
        .set({
          passwordHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log de auditoría
      await this.logAuditEvent(userId, 'password.changed', 'users', userId);

      logger.info(`Contraseña cambiada exitosamente para usuario: ${userId}`);

    } catch (error) {
      logger.error('Error al cambiar contraseña', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId
      });
      throw error;
    }
  }

  /**
   * Verifica y decodifica un token JWT
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  /**
   * Genera tokens de acceso y refresh
   */
  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN });

    const expiresIn = 15 * 60; // 15 minutes in seconds

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Crea una nueva sesión
   */
  private async createSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await db.insert(sessions).values({
      userId,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt
    });
  }

  /**
   * Incrementa los intentos de login
   */
  private async incrementLoginAttempts(userId: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) return;

    const newAttempts = user.loginAttempts + 1;
    let lockUntil = null;

    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      lockUntil = new Date(Date.now() + this.LOCK_DURATION);
    }

    await db.update(users)
      .set({
        loginAttempts: newAttempts,
        lockUntil,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  /**
   * Resetea los intentos de login
   */
  private async resetLoginAttempts(userId: string): Promise<void> {
    await db.update(users)
      .set({
        loginAttempts: 0,
        lockUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  /**
   * Sanitiza los datos del usuario (remueve información sensible)
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash' | 'emailVerificationToken' | 'passwordResetToken'> {
    const { passwordHash, emailVerificationToken, passwordResetToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Registra eventos de auditoría
   */
  private async logAuditEvent(userId: string, action: string, resource: string, resourceId: string, details?: Record<string, any>): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId,
        action,
        resource,
        resourceId,
        details: details || {},
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error al registrar evento de auditoría', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
        action
      });
    }
  }

  // ===== NUEVOS MÉTODOS PARA MICROTAREA 4 =====

  /**
   * Obtiene un usuario por ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Actualiza el perfil del usuario
   */
  async updateProfile(userId: string, profileData: any): Promise<Omit<User, 'passwordHash'>> {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'bio', 'avatar', 
      'dateOfBirth', 'gender', 'location', 'website'
    ];

    const updateData: any = {};
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        updateData[field] = profileData[field];
      }
    });

    updateData.updatedAt = new Date();

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('Usuario no encontrado');
    }

    // Log de auditoría
    await this.logAuditEvent(userId, 'profile.updated', 'users', userId, {
      updatedFields: Object.keys(updateData)
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Obtiene las preferencias del usuario
   */
  async getUserPreferences(userId: string): Promise<any> {
    // Por ahora retornamos preferencias por defecto
    // En el futuro esto vendría de una tabla de preferencias
    return {
      theme: 'light',
      language: 'es',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false
      }
    };
  }

  /**
   * Actualiza las preferencias del usuario
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    // Por ahora solo validamos y retornamos las preferencias
    // En el futuro esto se guardaría en una tabla de preferencias
    const updatedPreferences = {
      theme: preferences.theme || 'light',
      language: preferences.language || 'es',
      notifications: {
        email: preferences.notifications?.email ?? true,
        push: preferences.notifications?.push ?? true,
        sms: preferences.notifications?.sms ?? false
      },
      privacy: {
        profileVisibility: preferences.privacy?.profileVisibility || 'public',
        showEmail: preferences.privacy?.showEmail ?? false,
        showPhone: preferences.privacy?.showPhone ?? false
      }
    };

    // Log de auditoría
    await this.logAuditEvent(userId, 'preferences.updated', 'users', userId, {
      updatedPreferences
    });

    return updatedPreferences;
  }

  /**
   * Obtiene las sesiones activas del usuario
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const userSessions = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt)
      ))
      .orderBy(sessions.createdAt);

    return userSessions.map(session => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: new Date() < session.expiresAt
    }));
  }

  /**
   * Termina una sesión específica
   */
  async terminateSession(userId: string, sessionId: string): Promise<void> {
    const [session] = await db.update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId)
      ))
      .returning();

    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    // Log de auditoría
    await this.logAuditEvent(userId, 'session.terminated', 'sessions', sessionId);
  }

  /**
   * Termina todas las sesiones excepto la actual
   */
  async terminateAllSessions(userId: string, currentToken: string): Promise<void> {
    // Primero obtenemos la sesión actual
    const currentSession = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
        eq(sessions.refreshToken, currentToken),
        isNull(sessions.revokedAt)
      ))
      .limit(1);

    // Terminamos todas las sesiones excepto la actual
    await db.update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        currentSession.length > 0 ? 
          sql`${sessions.id} != ${currentSession[0].id}` : 
          sql`1=1`
      ));

    // Log de auditoría
    await this.logAuditEvent(userId, 'sessions.terminated_all', 'sessions', userId);
  }

  /**
   * Obtiene la actividad reciente del usuario
   */
  async getUserActivity(userId: string, options: { page: number; limit: number; type: string }): Promise<any> {
    const offset = (options.page - 1) * options.limit;
    
    let whereCondition = eq(auditLogs.userId, userId);
    
    if (options.type !== 'all') {
      whereCondition = and(
        eq(auditLogs.userId, userId),
        sql`${auditLogs.action} LIKE ${`%${options.type}%`}`
      );
    }

    const activities = await db.select()
      .from(auditLogs)
      .where(whereCondition)
      .orderBy(auditLogs.timestamp)
      .limit(options.limit)
      .offset(offset);

    const total = await db.select({ count: sql`count(*)` })
      .from(auditLogs)
      .where(whereCondition);

    return {
      activities: activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        resource: activity.resource,
        details: activity.details,
        timestamp: activity.timestamp
      })),
      pagination: {
        page: options.page,
        limit: options.limit,
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / options.limit)
      }
    };
  }

  /**
   * Actualiza el avatar del usuario
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<Omit<User, 'passwordHash'>> {
    const [updatedUser] = await db.update(users)
      .set({ 
        avatar: avatarUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('Usuario no encontrado');
    }

    // Log de auditoría
    await this.logAuditEvent(userId, 'avatar.updated', 'users', userId, {
      avatarUrl
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Elimina el avatar del usuario
   */
  async removeAvatar(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const [updatedUser] = await db.update(users)
      .set({ 
        avatar: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('Usuario no encontrado');
    }

    // Log de auditoría
    await this.logAuditEvent(userId, 'avatar.removed', 'users', userId);

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Obtiene estadísticas del usuario
   */
  async getUserStats(userId: string): Promise<any> {
    // Obtener estadísticas básicas
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Contar sesiones activas
    const activeSessions = await db.select({ count: sql`count(*)` })
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt)
      ));

    // Contar eventos de auditoría
    const totalActivity = await db.select({ count: sql`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId));

    // Obtener última actividad
    const lastActivity = await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(auditLogs.timestamp)
      .limit(1);

    return {
      profile: {
        memberSince: user.createdAt,
        lastLogin: user.lastLoginAt,
        status: user.status,
        role: user.role
      },
      sessions: {
        active: activeSessions[0]?.count || 0
      },
      activity: {
        total: totalActivity[0]?.count || 0,
        lastActivity: lastActivity[0]?.timestamp || null
      },
      security: {
        emailVerified: user.emailVerified,
        twoFactorEnabled: false, // Futura implementación
        lastPasswordChange: user.updatedAt
      }
    };
  }
} 