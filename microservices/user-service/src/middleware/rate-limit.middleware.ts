import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service.js';
import { logger } from '../utils/logger.js';

interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo número de peticiones
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimitMiddleware {
  private redis: RedisService;
  private store: RateLimitStore = {};

  constructor() {
    this.redis = new RedisService();
  }

  private generateKey(req: Request, type: 'ip' | 'user'): string {
    const identifier = type === 'ip' ? req.ip : req.user?.id || req.ip;
    return `rate_limit:${type}:${identifier}:${req.path}`;
  }

  private async getCurrentCount(key: string): Promise<{ count: number; resetTime: number }> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return { count: 0, resetTime: Date.now() + 60000 }; // 1 minuto por defecto
    } catch (error) {
      logger.error('Error getting rate limit count', { error, key });
      return { count: 0, resetTime: Date.now() + 60000 };
    }
  }

  private async incrementCount(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    try {
      const now = Date.now();
      const data = await this.getCurrentCount(key);
      
      if (now > data.resetTime) {
        // Reset window
        const newData = { count: 1, resetTime: now + windowMs };
        await this.redis.setex(key, Math.ceil(windowMs / 1000), JSON.stringify(newData));
        return newData;
      } else {
        // Increment count
        const newData = { count: data.count + 1, resetTime: data.resetTime };
        await this.redis.setex(key, Math.ceil((data.resetTime - now) / 1000), JSON.stringify(newData));
        return newData;
      }
    } catch (error) {
      logger.error('Error incrementing rate limit count', { error, key });
      return { count: 1, resetTime: Date.now() + windowMs };
    }
  }

  createRateLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ipKey = this.generateKey(req, 'ip');
        const userKey = req.user?.id ? this.generateKey(req, 'user') : null;

        // Check IP rate limit
        const ipData = await this.incrementCount(ipKey, config.windowMs);
        
        if (ipData.count > config.maxRequests) {
          logger.warn('Rate limit exceeded by IP', {
            ip: req.ip,
            path: req.path,
            count: ipData.count,
            maxRequests: config.maxRequests
          });

          return res.status(config.statusCode || 429).json({
            success: false,
            error: {
              message: config.message || 'Too many requests from this IP',
              retryAfter: Math.ceil((ipData.resetTime - Date.now()) / 1000)
            }
          });
        }

        // Check user rate limit if authenticated
        if (userKey) {
          const userData = await this.incrementCount(userKey, config.windowMs);
          
          if (userData.count > config.maxRequests) {
            logger.warn('Rate limit exceeded by user', {
              userId: req.user?.id,
              path: req.path,
              count: userData.count,
              maxRequests: config.maxRequests
            });

            return res.status(config.statusCode || 429).json({
              success: false,
              error: {
                message: config.message || 'Too many requests from this user',
                retryAfter: Math.ceil((userData.resetTime - Date.now()) / 1000)
              }
            });
          }
        }

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, config.maxRequests - ipData.count).toString(),
          'X-RateLimit-Reset': new Date(ipData.resetTime).toISOString()
        });

        next();
      } catch (error) {
        logger.error('Rate limit middleware error', { error });
        next(); // Continue on error
      }
    };
  }

  // Rate limiters específicos para diferentes endpoints
  static readonly AUTH_RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5, // 5 intentos de login
    message: 'Too many authentication attempts. Please try again later.',
    statusCode: 429
  };

  static readonly API_RATE_LIMIT = {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 peticiones por minuto
    message: 'API rate limit exceeded',
    statusCode: 429
  };

  static readonly STRICT_RATE_LIMIT = {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10, // 10 peticiones por minuto
    message: 'Rate limit exceeded',
    statusCode: 429
  };
}