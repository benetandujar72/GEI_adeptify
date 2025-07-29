import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface CorsConfig {
  origin: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export class CorsMiddleware {
  private config: CorsConfig;

  constructor(config: CorsConfig) {
    this.config = {
      origin: config.origin,
      methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: config.allowedHeaders || [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Client-Version'
      ],
      exposedHeaders: config.exposedHeaders || [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count',
        'X-Page-Count'
      ],
      credentials: config.credentials !== false,
      maxAge: config.maxAge || 86400, // 24 horas
      preflightContinue: config.preflightContinue || false,
      optionsSuccessStatus: config.optionsSuccessStatus || 204
    };
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.config.origin === true) return true;
    if (this.config.origin === false) return false;
    
    if (Array.isArray(this.config.origin)) {
      return this.config.origin.includes(origin);
    }
    
    if (typeof this.config.origin === 'string') {
      return this.config.origin === origin;
    }
    
    return false;
  }

  private getOrigin(req: Request): string | null {
    const origin = req.headers.origin;
    if (!origin) return null;
    
    // Validar formato de origen
    try {
      const url = new URL(origin);
      return url.origin;
    } catch {
      return null;
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = this.getOrigin(req);
      
      // Log CORS requests for monitoring
      if (origin) {
        logger.debug('CORS request', {
          origin,
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent']
        });
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        // Set CORS headers
        if (origin && this.isOriginAllowed(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
        
        res.setHeader('Access-Control-Allow-Methods', this.config.methods!.join(', '));
        res.setHeader('Access-Control-Allow-Headers', this.config.allowedHeaders!.join(', '));
        res.setHeader('Access-Control-Expose-Headers', this.config.exposedHeaders!.join(', '));
        res.setHeader('Access-Control-Max-Age', this.config.maxAge!.toString());
        
        if (this.config.credentials) {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        if (this.config.preflightContinue) {
          next();
        } else {
          res.status(this.config.optionsSuccessStatus!).end();
        }
        return;
      }

      // Handle actual requests
      if (origin && this.isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Expose-Headers', this.config.exposedHeaders!.join(', '));
      
      if (this.config.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      next();
    };
  }

  // Configuraciones predefinidas
  static readonly PRODUCTION_CONFIG: CorsConfig = {
    origin: [
      'https://gei.adeptify.es',
      'https://www.gei.adeptify.es',
      'https://admin.gei.adeptify.es',
      'https://api.gei.adeptify.es'
    ],
    credentials: true,
    maxAge: 86400
  };

  static readonly DEVELOPMENT_CONFIG: CorsConfig = {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173'
    ],
    credentials: true,
    maxAge: 86400
  };

  static readonly STRICT_CONFIG: CorsConfig = {
    origin: ['https://gei.adeptify.es'],
    credentials: true,
    maxAge: 3600,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  };
}