import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface SecurityConfig {
  enableHsts?: boolean;
  enableXssProtection?: boolean;
  enableContentTypeSniffing?: boolean;
  enableFrameOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enableCsp?: boolean;
  maxRequestSize?: number;
  allowedMethods?: string[];
  blockSuspiciousIps?: boolean;
  enableRequestLogging?: boolean;
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      enableHsts: config.enableHsts !== false,
      enableXssProtection: config.enableXssProtection !== false,
      enableContentTypeSniffing: config.enableContentTypeSniffing !== false,
      enableFrameOptions: config.enableFrameOptions !== false,
      enableReferrerPolicy: config.enableReferrerPolicy !== false,
      enableCsp: config.enableCsp !== false,
      maxRequestSize: config.maxRequestSize || 10 * 1024 * 1024, // 10MB
      allowedMethods: config.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      blockSuspiciousIps: config.blockSuspiciousIps !== false,
      enableRequestLogging: config.enableRequestLogging !== false
    };
  }

  // Headers de seguridad
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // HSTS (HTTP Strict Transport Security)
      if (this.config.enableHsts) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }

      // XSS Protection
      if (this.config.enableXssProtection) {
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }

      // Content Type Sniffing Protection
      if (this.config.enableContentTypeSniffing) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // Frame Options (Clickjacking Protection)
      if (this.config.enableFrameOptions) {
        res.setHeader('X-Frame-Options', 'DENY');
      }

      // Referrer Policy
      if (this.config.enableReferrerPolicy) {
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      }

      // Content Security Policy
      if (this.config.enableCsp) {
        const csp = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https:",
          "connect-src 'self' https://api.gei.adeptify.es",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ');
        
        res.setHeader('Content-Security-Policy', csp);
      }

      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  // Validación de métodos HTTP
  methodValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.allowedMethods!.includes(req.method)) {
        logger.warn('Method not allowed', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });

        return res.status(405).json({
          success: false,
          error: {
            message: 'Method not allowed',
            allowedMethods: this.config.allowedMethods
          }
        });
      }

      next();
    };
  }

  // Validación de tamaño de request
  requestSizeValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      
      if (contentLength > this.config.maxRequestSize!) {
        logger.warn('Request too large', {
          contentLength,
          maxSize: this.config.maxRequestSize,
          path: req.path,
          ip: req.ip
        });

        return res.status(413).json({
          success: false,
          error: {
            message: 'Request entity too large',
            maxSize: this.config.maxRequestSize
          }
        });
      }

      next();
    };
  }

  // Detección de IPs sospechosas
  suspiciousIpDetection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.blockSuspiciousIps) {
        return next();
      }

      const ip = req.ip;
      const userAgent = req.headers['user-agent'] || '';
      const path = req.path;

      // Detectar patrones sospechosos
      const suspiciousPatterns = [
        /bot|crawler|spider/i,
        /sqlmap|nikto|nmap/i,
        /\.\.\/|\.\.\\/, // Path traversal
        /<script|javascript:/i, // XSS attempts
        /union.*select|select.*from/i, // SQL injection
        /eval\(|exec\(/i // Code injection
      ];

      const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(userAgent) || pattern.test(path)
      );

      if (isSuspicious) {
        logger.warn('Suspicious request detected', {
          ip,
          userAgent,
          path,
          method: req.method
        });

        // No bloquear inmediatamente, solo log
        // En producción se podría implementar un sistema de blacklist
      }

      next();
    };
  }

  // Logging de requests
  requestLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableRequestLogging) {
        return next();
      }

      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        logger.info('Request processed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          userId: (req as any).user?.id
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Validación de User-Agent
  userAgentValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAgent = req.headers['user-agent'];
      
      if (!userAgent) {
        logger.warn('Missing User-Agent', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
      } else if (userAgent.length > 500) {
        logger.warn('User-Agent too long', {
          ip: req.ip,
          userAgentLength: userAgent.length
        });
      }

      next();
    };
  }

  // Protección contra timing attacks
  timingAttackProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Añadir delay aleatorio para prevenir timing attacks
      const randomDelay = Math.random() * 100; // 0-100ms
      
      setTimeout(() => {
        next();
      }, randomDelay);
    };
  }

  // Validación de Content-Type
  contentTypeValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
      }

      const contentType = req.headers['content-type'];
      
      if (!contentType) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Content-Type header required'
          }
        });
      }

      // Validar que sea JSON
      if (!contentType.includes('application/json')) {
        return res.status(415).json({
          success: false,
          error: {
            message: 'Content-Type must be application/json'
          }
        });
      }

      next();
    };
  }

  // Middleware completo de seguridad
  complete() {
    return [
      this.securityHeaders(),
      this.methodValidation(),
      this.requestSizeValidation(),
      this.suspiciousIpDetection(),
      this.userAgentValidation(),
      this.contentTypeValidation(),
      this.requestLogging()
    ];
  }

  // Configuraciones predefinidas
  static readonly PRODUCTION_CONFIG: SecurityConfig = {
    enableHsts: true,
    enableXssProtection: true,
    enableContentTypeSniffing: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enableCsp: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    blockSuspiciousIps: true,
    enableRequestLogging: true
  };

  static readonly DEVELOPMENT_CONFIG: SecurityConfig = {
    enableHsts: false,
    enableXssProtection: true,
    enableContentTypeSniffing: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enableCsp: false,
    maxRequestSize: 50 * 1024 * 1024, // 50MB
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    blockSuspiciousIps: false,
    enableRequestLogging: true
  };
}