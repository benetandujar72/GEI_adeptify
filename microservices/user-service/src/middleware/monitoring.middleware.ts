import { Request, Response, NextFunction } from 'express';
import { logger, LogContext } from '../services/logging.service.js';
import { metrics } from '../services/metrics.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface MonitoringConfig {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  recordMetrics: boolean;
  generateRequestId: boolean;
  logRequestBody: boolean;
  logResponseBody: boolean;
  sensitiveFields: string[];
}

export class MonitoringMiddleware {
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      enabled: true,
      logRequests: true,
      logResponses: true,
      logErrors: true,
      recordMetrics: true,
      generateRequestId: true,
      logRequestBody: false,
      logResponseBody: false,
      sensitiveFields: ['password', 'token', 'secret', 'key'],
      ...config
    };
  }

  // Middleware principal de monitoreo
  public monitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const startTime = Date.now();
      const requestId = this.config.generateRequestId ? uuidv4() : undefined;
      const requestStartTime = process.hrtime.bigint();

      // Agregar requestId al request para uso posterior
      if (requestId) {
        (req as any).requestId = requestId;
      }

      // Contexto base para logging
      const baseContext: LogContext = {
        requestId,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      };

      // Log del request
      if (this.config.logRequests) {
        this.logRequest(req, baseContext);
      }

      // Registrar inicio de request en métricas
      if (this.config.recordMetrics) {
        metrics.recordHttpRequestStart(req.method, req.path);
      }

      // Interceptar la respuesta para logging
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      let responseBody: any = null;

      // Interceptar send
      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Interceptar json
      res.json = function(body: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };

      // Interceptar end
      res.end = function(chunk?: any, encoding?: any) {
        if (chunk && !responseBody) {
          responseBody = chunk;
        }
        return originalEnd.call(this, chunk, encoding);
      };

      // Middleware para capturar la respuesta
      res.on('finish', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const requestDuration = Number(process.hrtime.bigint() - requestStartTime) / 1000000; // Convertir a ms

        const responseContext: LogContext = {
          ...baseContext,
          statusCode: res.statusCode,
          responseTime: duration
        };

        // Log de la respuesta
        if (this.config.logResponses) {
          this.logResponse(req, res, responseContext, responseBody);
        }

        // Registrar métricas de la respuesta
        if (this.config.recordMetrics) {
          metrics.recordHttpRequest(req.method, req.path, res.statusCode, duration);
          metrics.recordHttpRequestEnd(req.method, req.path);
          metrics.recordResponseTime(req.path, req.method, duration);
        }

        // Log de errores
        if (this.config.logErrors && res.statusCode >= 400) {
          this.logError(req, res, responseContext, responseBody);
        }

        // Actualizar métricas de memoria
        if (this.config.recordMetrics) {
          metrics.updateMemoryUsage();
        }
      });

      next();
    };
  }

  // Middleware para logging de performance
  public performanceLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const startTime = Date.now();
      const requestId = (req as any).requestId;

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Log de performance para requests lentos (> 1 segundo)
        if (duration > 1000) {
          logger.logPerformance(
            `${req.method} ${req.path}`,
            duration,
            {
              requestId,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              endpoint: req.path,
              method: req.method,
              statusCode: res.statusCode
            }
          );
        }
      });

      next();
    };
  }

  // Middleware para auditoría de operaciones sensibles
  public auditLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const sensitiveEndpoints = [
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/logout',
        '/api/v1/users',
        '/api/v1/admin'
      ];

      const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
        req.path.startsWith(endpoint)
      );

      if (isSensitiveEndpoint) {
        const requestId = (req as any).requestId;
        const userId = (req as any).user?.id;

        res.on('finish', () => {
          logger.logAudit(
            `${req.method} ${req.path}`,
            req.path,
            {
              requestId,
              userId,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              endpoint: req.path,
              method: req.method,
              statusCode: res.statusCode
            }
          );
        });
      }

      next();
    };
  }

  // Middleware para health checks
  public healthCheck() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health' || req.path === '/healthz') {
        const healthData = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid,
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        };

        return res.json(healthData);
      }

      next();
    };
  }

  // Métodos privados para logging
  private logRequest(req: Request, context: LogContext): void {
    const logData: any = {
      ...context,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params
    };

    if (this.config.logRequestBody && req.body) {
      logData.body = this.sanitizeData(req.body);
    }

    logger.info(`REQUEST: ${req.method} ${req.path}`, logData);
  }

  private logResponse(req: Request, res: Response, context: LogContext, body: any): void {
    const logData: any = {
      ...context,
      responseHeaders: this.sanitizeHeaders(res.getHeaders())
    };

    if (this.config.logResponseBody && body) {
      logData.responseBody = this.sanitizeData(body);
    }

    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`RESPONSE: ${req.method} ${req.path} - ${res.statusCode}`, logData);
  }

  private logError(req: Request, res: Response, context: LogContext, body: any): void {
    const logData: any = {
      ...context,
      error: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage
      }
    };

    if (body) {
      logData.errorBody = this.sanitizeData(body);
    }

    logger.error(`ERROR: ${req.method} ${req.path} - ${res.statusCode}`, logData);
  }

  // Métodos de utilidad para sanitización
  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (this.config.sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Configuraciones predefinidas
  static readonly PRODUCTION_CONFIG: MonitoringConfig = {
    enabled: true,
    logRequests: true,
    logResponses: false, // Solo errores en producción
    logErrors: true,
    recordMetrics: true,
    generateRequestId: true,
    logRequestBody: false,
    logResponseBody: false,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
  };

  static readonly DEVELOPMENT_CONFIG: MonitoringConfig = {
    enabled: true,
    logRequests: true,
    logResponses: true,
    logErrors: true,
    recordMetrics: true,
    generateRequestId: true,
    logRequestBody: true,
    logResponseBody: true,
    sensitiveFields: ['password', 'token', 'secret', 'key']
  };

  static readonly VERBOSE_CONFIG: MonitoringConfig = {
    enabled: true,
    logRequests: true,
    logResponses: true,
    logErrors: true,
    recordMetrics: true,
    generateRequestId: true,
    logRequestBody: true,
    logResponseBody: true,
    sensitiveFields: ['password', 'token', 'secret', 'key']
  };
}