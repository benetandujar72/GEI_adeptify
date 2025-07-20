import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { db } from '../index.js';
import { users, institutes } from '@/shared/schema.js';
import { eq } from 'drizzle-orm';
import { createAuditLog } from '../utils/audit.js';

const router = Router();

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().email('Email invàlid'),
  password: z.string().min(1, 'La contrasenya és obligatòria'),
});

const registerSchema = z.object({
  email: z.string().email('Email invàlid'),
  password: z.string().min(8, 'La contrasenya ha de tenir almenys 8 caràcters'),
  displayName: z.string().min(2, 'El nom ha de tenir almenys 2 caràcters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  instituteCode: z.string().optional(),
});

// Middleware para verificar autenticación
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autoritzat' });
};

// Middleware para verificar roles
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'No autoritzat' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accés denegat' });
    }

    next();
  };
};

// Login local
router.post('/login', async (req, res, next) => {
  try {
    // Validar datos de entrada
    const { email, password } = loginSchema.parse(req.body);

    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ error: info.message });
      }

      req.logIn(user, async (err: any) => {
        if (err) {
          return next(err);
        }

        // Actualizar último login
        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        // Crear log de auditoría
        await createAuditLog({
          userId: user.id,
          instituteId: user.instituteId,
          action: 'login',
          resource: 'auth',
          details: { method: 'local' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            instituteId: user.instituteId,
            institute: user.institute,
            photoURL: user.photoURL,
          },
        });
      });
    })(req, res, next);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

// Login con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', async (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      // Redirigir a login con error
      return res.redirect('/login?error=' + encodeURIComponent(info.message));
    }

    req.logIn(user, async (err: any) => {
      if (err) {
        return next(err);
      }

      // Actualizar último login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Crear log de auditoría
      await createAuditLog({
        userId: user.id,
        instituteId: user.instituteId,
        action: 'login',
        resource: 'auth',
        details: { method: 'google' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Redirigir al dashboard
      res.redirect('/');
    });
  })(req, res, next);
});

// Logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    // Crear log de auditoría antes del logout
    await createAuditLog({
      userId: req.user.id,
      instituteId: req.user.instituteId,
      action: 'logout',
      resource: 'auth',
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    req.logout((err: any) => {
      if (err) {
        return next(err);
      }
      res.json({ success: true });
    });
  } catch (error) {
    next(error);
  }
});

// Verificar sesión actual
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      role: req.user.role,
      instituteId: req.user.instituteId,
      institute: req.user.institute,
      photoURL: req.user.photoURL,
      preferences: req.user.preferences,
    },
  });
});

// Registrar nuevo usuario (solo super admin)
router.post('/register', requireRole(['super_admin']), async (req, res, next) => {
  try {
    const { email, password, displayName, firstName, lastName, instituteCode } =
      registerSchema.parse(req.body);

    // Verificar si el email ya existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser[0]) {
      return res.status(400).json({ error: 'L\'email ja està registrat' });
    }

    // Buscar instituto si se proporciona código
    let instituteId = null;
    if (instituteCode) {
      const institute = await db
        .select()
        .from(institutes)
        .where(eq(institutes.code, instituteCode))
        .limit(1);

      if (!institute[0]) {
        return res.status(400).json({ error: 'Codi d\'institut no vàlid' });
      }

      instituteId = institute[0].id;
    }

    // Hash de la contraseña
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName,
        firstName,
        lastName,
        instituteId,
        role: 'teacher', // Por defecto
        isActive: true,
      })
      .returning();

    // Crear log de auditoría
    await createAuditLog({
      userId: req.user.id,
      instituteId: req.user.instituteId,
      action: 'create_user',
      resource: 'users',
      details: { createdUserId: newUser[0].id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        displayName: newUser[0].displayName,
        role: newUser[0].role,
        instituteId: newUser[0].instituteId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

// Cambiar contraseña
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1, 'La contrasenya actual és obligatòria'),
      newPassword: z.string().min(8, 'La nova contrasenya ha de tenir almenys 8 caràcters'),
    }).parse(req.body);

    // Verificar contraseña actual
    const bcrypt = await import('bcryptjs');
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user[0].passwordHash) {
      return res.status(400).json({ error: 'Aquest compte només permet accés amb Google' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'La contrasenya actual és incorrecta' });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    // Crear log de auditoría
    await createAuditLog({
      userId: req.user.id,
      instituteId: req.user.instituteId,
      action: 'change_password',
      resource: 'auth',
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

export default router; 