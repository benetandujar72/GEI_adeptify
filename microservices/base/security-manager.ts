import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import helmet from 'helmet';
import cors from 'cors';

export interface SecurityConfig {
  enableAuthentication: boolean;
  enableAuthorization: boolean;
  enableRateLimiting: boolean;
  enableInputValidation: boolean;
  enableOutputSanitization: boolean;
  enableEncryption: boolean;
  enableAuditLogging: boolean;
  enableThreatDetection: boolean;
  jwtSecret: string;
  jwtExpiration: string;
  bcryptRounds: number;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  encryptionKey: string;
  encryptionAlgorithm: string;
  auditLogLevel: 'info' | 'warn' | 'error';
  threatDetectionThreshold: number;
}

export interface SecurityAudit {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: any;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ThreatDetection {
  type: 'brute_force' | 'sql_injection' | 'xss' | 'csrf' | 'ddos' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: any;
  timestamp: Date;
  blocked: boolean;
}

export interface SecurityStats {
  totalRequests: number;
  blockedRequests: number;
  authenticationFailures: number;
  authorizationFailures: number;
  rateLimitHits: number;
  threatsDetected: number;
  auditLogs: number;
  encryptionOperations: number;
  lastThreat: ThreatDetection | null;
  securityScore: number; // 0-100
}

export class SecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private rateLimiters: Map<string, RateLimiterMemory> = new Map();
  private auditLogs: SecurityAudit[] = [];
  private threats: ThreatDetection[] = [];
  private blacklistedIPs: Set<string> = new Set();
  private whitelistedIPs: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();
  private securityStats: SecurityStats;

  constructor(config: Partial<SecurityConfig> = {}) {
    super();
    this.config = {
      enableAuthentication: true,
      enableAuthorization: true,
      enableRateLimiting: true,
      enableInputValidation: true,
      enableOutputSanitization: true,
      enableEncryption: true,
      enableAuditLogging: true,
      enableThreatDetection: true,
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      jwtExpiration: '24h',
      bcryptRounds: 12,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMaxRequests: 100,
      encryptionKey: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
      encryptionAlgorithm: 'aes-256-gcm',
      auditLogLevel: 'info',
      threatDetectionThreshold: 5,
      ...config
    };

    this.securityStats = this.initializeStats();
    this.initializeRateLimiters();
  }

  /**
   * Inicializa estadísticas de seguridad
   */
  private initializeStats(): SecurityStats {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      authenticationFailures: 0,
      authorizationFailures: 0,
      rateLimitHits: 0,
      threatsDetected: 0,
      auditLogs: 0,
      encryptionOperations: 0,
      lastThreat: null,
      securityScore: 100
    };
  }

  /**
   * Inicializa rate limiters
   */
  private initializeRateLimiters(): void {
    // Rate limiter global
    this.rateLimiters.set('global', new RateLimiterMemory({
      keyGenerator: () => 'global',
      points: this.config.rateLimitMaxRequests,
      duration: this.config.rateLimitWindow / 1000
    }));

    // Rate limiter por IP
    this.rateLimiters.set('ip', new RateLimiterMemory({
      keyGenerator: (req: any) => req.ip,
      points: this.config.rateLimitMaxRequests,
      duration: this.config.rateLimitWindow / 1000
    }));

    // Rate limiter por usuario
    this.rateLimiters.set('user', new RateLimiterMemory({
      keyGenerator: (req: any) => req.user?.id || req.ip,
      points: this.config.rateLimitMaxRequests,
      duration: this.config.rateLimitWindow / 1000
    }));
  }

  /**
   * Middleware de seguridad para Express
   */
  getSecurityMiddleware() {
    return [
      // Helmet para headers de seguridad
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
      }),

      // CORS configurado
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
      }),

      // Rate limiting
      this.rateLimitingMiddleware(),

      // Input validation
      this.inputValidationMiddleware(),

      // Authentication
      this.authenticationMiddleware(),

      // Authorization
      this.authorizationMiddleware(),

      // Threat detection
      this.threatDetectionMiddleware()
    ];
  }

  /**
   * Middleware de rate limiting
   */
  private rateLimitingMiddleware() {
    return async (req: any, res: any, next: any) => {
      if (!this.config.enableRateLimiting) return next();

      try {
        // Verificar rate limit global
        await this.rateLimiters.get('global')!.consume('global');
        
        // Verificar rate limit por IP
        await this.rateLimiters.get('ip')!.consume(req.ip);
        
        // Verificar rate limit por usuario si está autenticado
        if (req.user?.id) {
          await this.rateLimiters.get('user')!.consume(req.user.id);
        }

        next();
      } catch (error) {
        this.securityStats.rateLimitHits++;
        this.logAudit({
          action: 'RATE_LIMIT_EXCEEDED',
          resource: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          success: false,
          details: { error: 'Rate limit exceeded' },
          threatLevel: 'medium'
        });

        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(this.config.rateLimitWindow / 1000)
        });
      }
    };
  }

  /**
   * Middleware de validación de entrada
   */
  private inputValidationMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.config.enableInputValidation) return next();

      try {
        // Validar y sanitizar body
        if (req.body) {
          req.body = this.sanitizeInput(req.body);
        }

        // Validar y sanitizar query parameters
        if (req.query) {
          req.query = this.sanitizeInput(req.query);
        }

        // Validar y sanitizar URL parameters
        if (req.params) {
          req.params = this.sanitizeInput(req.params);
        }

        next();
      } catch (error) {
        this.securityStats.blockedRequests++;
        this.logAudit({
          action: 'INPUT_VALIDATION_FAILED',
          resource: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          success: false,
          details: { error: error.message },
          threatLevel: 'high'
        });

        res.status(400).json({
          success: false,
          error: 'Invalid input detected'
        });
      }
    };
  }

  /**
   * Middleware de autenticación
   */
  private authenticationMiddleware() {
    return async (req: any, res: any, next: any) => {
      if (!this.config.enableAuthentication) return next();

      try {
        const token = this.extractToken(req);
        
        if (!token) {
          this.securityStats.authenticationFailures++;
          this.logAudit({
            action: 'AUTHENTICATION_FAILED',
            resource: req.path,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || '',
            success: false,
            details: { reason: 'No token provided' },
            threatLevel: 'medium'
          });

          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const decoded = jwt.verify(token, this.config.jwtSecret) as any;
        req.user = decoded;
        
        this.logAudit({
          action: 'AUTHENTICATION_SUCCESS',
          resource: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          userId: decoded.id,
          success: true,
          details: { userId: decoded.id },
          threatLevel: 'low'
        });

        next();
      } catch (error) {
        this.securityStats.authenticationFailures++;
        this.logAudit({
          action: 'AUTHENTICATION_FAILED',
          resource: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          success: false,
          details: { error: error.message },
          threatLevel: 'high'
        });

        res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
    };
  }

  /**
   * Middleware de autorización
   */
  private authorizationMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.config.enableAuthorization) return next();

      // Verificar si el usuario tiene permisos para el recurso
      const hasPermission = this.checkPermission(req.user, req.method, req.path);
      
      if (!hasPermission) {
        this.securityStats.authorizationFailures++;
        this.logAudit({
          action: 'AUTHORIZATION_FAILED',
          resource: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          userId: req.user?.id,
          success: false,
          details: { 
            method: req.method,
            path: req.path,
            userId: req.user?.id 
          },
          threatLevel: 'high'
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      next();
    };
  }

  /**
   * Middleware de detección de amenazas
   */
  private threatDetectionMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.config.enableThreatDetection) return next();

      const threat = this.detectThreat(req);
      
      if (threat) {
        this.securityStats.threatsDetected++;
        this.threats.push(threat);
        this.lastThreat = threat;

        this.logAudit({
          action: 'THREAT_DETECTED',
          resource: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          userId: req.user?.id,
          success: false,
          details: threat,
          threatLevel: threat.severity
        });

        if (threat.blocked) {
          this.securityStats.blockedRequests++;
          return res.status(403).json({
            success: false,
            error: 'Request blocked due to security threat'
          });
        }
      }

      next();
    };
  }

  /**
   * Extrae token de la request
   */
  private extractToken(req: any): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Sanitiza entrada de datos
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Sanitiza string
   */
  private sanitizeString(str: string): string {
    // Remover caracteres peligrosos
    return str
      .replace(/[<>]/g, '') // Remover < y >
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, '') // Remover event handlers
      .replace(/script/gi, '') // Remover script
      .trim();
  }

  /**
   * Verifica permisos del usuario
   */
  private checkPermission(user: any, method: string, path: string): boolean {
    if (!user) return false;

    // Implementación básica - en producción se usaría un sistema más sofisticado
    const userRole = user.role || 'user';
    const resource = path.split('/')[1]; // Primer segmento de la URL

    // Admin tiene acceso total
    if (userRole === 'admin') return true;

    // Usuario puede acceder a sus propios recursos
    if (userRole === 'user' && resource === 'users' && path.includes(user.id)) {
      return true;
    }

    // GET requests son generalmente permitidos para usuarios autenticados
    if (method === 'GET' && userRole === 'user') {
      return true;
    }

    return false;
  }

  /**
   * Detecta amenazas en la request
   */
  private detectThreat(req: any): ThreatDetection | null {
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    const path = req.path;

    // Verificar IP en blacklist
    if (this.blacklistedIPs.has(ip)) {
      return {
        type: 'suspicious_activity',
        severity: 'high',
        source: ip,
        details: { reason: 'IP in blacklist' },
        timestamp: new Date(),
        blocked: true
      };
    }

    // Detectar SQL injection
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
      /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
      /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(union|select|insert|update|delete|drop|create|alter)\b)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(body) || pattern.test(query)) {
        return {
          type: 'sql_injection',
          severity: 'critical',
          source: ip,
          details: { pattern: pattern.source, body, query },
          timestamp: new Date(),
          blocked: true
        };
      }
    }

    // Detectar XSS
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(body) || pattern.test(query)) {
        return {
          type: 'xss',
          severity: 'high',
          source: ip,
          details: { pattern: pattern.source, body, query },
          timestamp: new Date(),
          blocked: true
        };
      }
    }

    // Detectar actividad sospechosa
    const suspiciousCount = this.suspiciousPatterns.get(ip) || 0;
    if (suspiciousCount > this.config.threatDetectionThreshold) {
      this.suspiciousPatterns.set(ip, suspiciousCount + 1);
      return {
        type: 'suspicious_activity',
        severity: 'medium',
        source: ip,
        details: { suspiciousCount },
        timestamp: new Date(),
        blocked: false
      };
    }

    return null;
  }

  /**
   * Registra auditoría
   */
  private logAudit(audit: SecurityAudit): void {
    if (!this.config.enableAuditLogging) return;

    this.auditLogs.push(audit);
    this.securityStats.auditLogs++;

    // Mantener solo los últimos 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    this.emit('auditLog', audit);
  }

  /**
   * Genera hash de contraseña
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.config.bcryptRounds);
  }

  /**
   * Verifica contraseña
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Genera token JWT
   */
  generateToken(payload: any): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiration
    });
  }

  /**
   * Verifica token JWT
   */
  verifyToken(token: string): any {
    return jwt.verify(token, this.config.jwtSecret);
  }

  /**
   * Encripta datos
   */
  encrypt(data: string): string {
    if (!this.config.enableEncryption) return data;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.config.encryptionAlgorithm, this.config.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    this.securityStats.encryptionOperations++;
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Desencripta datos
   */
  decrypt(encryptedData: string): string {
    if (!this.config.enableEncryption) return encryptedData;

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(this.config.encryptionAlgorithm, this.config.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Agrega IP a blacklist
   */
  blacklistIP(ip: string, reason: string): void {
    this.blacklistedIPs.add(ip);
    this.logAudit({
      action: 'IP_BLACKLISTED',
      resource: 'security',
      ipAddress: ip,
      userAgent: '',
      success: true,
      details: { reason },
      threatLevel: 'high'
    });
  }

  /**
   * Remueve IP de blacklist
   */
  whitelistIP(ip: string): void {
    this.blacklistedIPs.delete(ip);
    this.whitelistedIPs.add(ip);
  }

  /**
   * Obtiene estadísticas de seguridad
   */
  getSecurityStats(): SecurityStats {
    // Calcular score de seguridad
    let score = 100;
    
    if (this.securityStats.threatsDetected > 10) score -= 20;
    if (this.securityStats.authenticationFailures > 50) score -= 15;
    if (this.securityStats.authorizationFailures > 20) score -= 15;
    if (this.securityStats.rateLimitHits > 100) score -= 10;
    
    this.securityStats.securityScore = Math.max(0, score);
    
    return { ...this.securityStats };
  }

  /**
   * Obtiene logs de auditoría
   */
  getAuditLogs(limit: number = 100): SecurityAudit[] {
    return this.auditLogs.slice(-limit);
  }

  /**
   * Obtiene amenazas detectadas
   */
  getThreats(limit: number = 50): ThreatDetection[] {
    return this.threats.slice(-limit);
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    this.auditLogs = [];
    this.threats = [];
    this.blacklistedIPs.clear();
    this.whitelistedIPs.clear();
    this.suspiciousPatterns.clear();
    this.rateLimiters.clear();
  }
}