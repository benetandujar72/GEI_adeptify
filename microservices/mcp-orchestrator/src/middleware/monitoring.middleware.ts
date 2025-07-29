import { Request, Response, NextFunction } from 'express';
import { logger, LogContext } from '../services/logging.service.js';
import { metrics } from '../services/metrics.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface MonitoringConfig {
  enableRequestLogging?: boolean;
  enablePerformanceLogging?: boolean;
  enableAuditLogging?: boolean;
  enableMetrics?: boolean;
  slowRequestThreshold?: number; // ms
  sensitiveEndpoints?: string[];
  excludePaths?: string[];
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  sanitizeSensitiveData?: boolean;
}

export class MonitoringMiddleware {
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      enableRequestLogging: true,
      enablePerformanceLogging: true,
      enableAuditLogging: true,
      enableMetrics: true,
      slowRequestThreshold: 1000, // 1 segundo
      sensitiveEndpoints: [
        '/api/orchestrator/contexts',
        '/api/orchestrator/agents',
        '/api/orchestrator/workflows',
        '/api/orchestrator/tasks'
      ],
      excludePaths: [
        '/health',
        '/metrics',
        '/favicon.ico'
      ],
      logRequestBody: false,
      logResponseBody: false,
      sanitizeSensitiveData: true,
      ...config
    };
  }

  public monitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = uuidv4();
      
      // Agregar requestId al request para uso posterior
      (req as any).requestId = requestId;
      
      // Contexto base para logging
      const baseContext: LogContext = {
        requestId,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        userId: (req as any).user?.id,
        sessionId: (req as any).session?.id
      };

      // Logging de inicio de request
      if (this.config.enableRequestLogging && !this.shouldExcludePath(req.path)) {
        this.logRequest(req, baseContext);
      }

      // Métricas de inicio de request
      if (this.config.enableMetrics) {
        metrics.recordHttpRequestStart(req.method, req.path);
      }

      // Interceptar respuesta para logging y métricas
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      let responseBody: any = null;

      // Interceptar res.send
      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Interceptar res.json
      res.json = function(body: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };

      // Interceptar res.end
      res.end = function(chunk?: any, encoding?: any) {
        if (chunk && !responseBody) {
          responseBody = chunk;
        }
        return originalEnd.call(this, chunk, encoding);
      };

      // Middleware para capturar el final de la respuesta
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const context: LogContext = {
          ...baseContext,
          statusCode: res.statusCode,
          responseTime: duration
        };

        // Logging de respuesta
        if (this.config.enableRequestLogging && !this.shouldExcludePath(req.path)) {
          if (res.statusCode >= 400) {
            this.logError(req, res, context, responseBody);
          } else {
            this.logResponse(req, res, context, responseBody);
          }
        }

        // Métricas de respuesta
        if (this.config.enableMetrics) {
          metrics.recordHttpRequest(req.method, req.path, res.statusCode, duration);
          metrics.recordHttpRequestEnd(req.method, req.path);
        }

        // Performance logging para requests lentos
        if (this.config.enablePerformanceLogging && duration > this.config.slowRequestThreshold!) {
          this.logSlowRequest(req, res, context, duration);
        }

        // Audit logging para endpoints sensibles
        if (this.config.enableAuditLogging && this.isSensitiveEndpoint(req.path)) {
          this.logAuditEvent(req, res, context, responseBody);
        }
      }.bind(this));

      next();
    };
  }

  public performanceLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        if (duration > this.config.slowRequestThreshold!) {
          const context: LogContext = {
            requestId: (req as any).requestId,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime: duration,
            userId: (req as any).user?.id
          };

          logger.logPerformance('slow_request', duration, context);
        }
      });

      next();
    };
  }

  public auditLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.isSensitiveEndpoint(req.path)) {
        const context: LogContext = {
          requestId: (req as any).requestId,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          userId: (req as any).user?.id,
          sessionId: (req as any).session?.id
        };

        // Logging de auditoría para operaciones sensibles
        const operation = this.getAuditOperation(req.path, req.method);
        const resource = this.getAuditResource(req.path);
        
        logger.logAudit(operation, resource, context);
      }

      next();
    };
  }

  public healthCheck() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health') {
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        };

        logger.info('Health check requested', {
          requestId: (req as any).requestId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json(healthData);
        return;
      }

      next();
    };
  }

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

    logger.info(`HTTP ${req.method} ${req.path}`, logData);
  }

  private logResponse(req: Request, res: Response, context: LogContext, body: any): void {
    const logData: any = {
      ...context,
      responseHeaders: this.sanitizeHeaders(res.getHeaders())
    };

    if (this.config.logResponseBody && body) {
      logData.responseBody = this.sanitizeData(body);
    }

    logger.info(`HTTP ${req.method} ${req.path} completed`, logData);
  }

  private logError(req: Request, res: Response, context: LogContext, body: any): void {
    const logData: any = {
      ...context,
      responseHeaders: this.sanitizeHeaders(res.getHeaders())
    };

    if (this.config.logResponseBody && body) {
      logData.responseBody = this.sanitizeData(body);
    }

    logger.error(`HTTP ${req.method} ${req.path} failed`, logData);
  }

  private logSlowRequest(req: Request, res: Response, context: LogContext, duration: number): void {
    logger.logPerformance('slow_request', duration, {
      ...context,
      threshold: this.config.slowRequestThreshold
    });
  }

  private logAuditEvent(req: Request, res: Response, context: LogContext, body: any): void {
    const operation = this.getAuditOperation(req.path, req.method);
    const resource = this.getAuditResource(req.path);
    
    const auditData: any = {
      ...context,
      operation,
      resource,
      requestBody: this.config.logRequestBody ? this.sanitizeData(req.body) : undefined,
      responseBody: this.config.logResponseBody ? this.sanitizeData(body) : undefined
    };

    logger.logAudit(operation, resource, auditData);
  }

  private shouldExcludePath(path: string): boolean {
    return this.config.excludePaths!.some(excludePath => 
      path.startsWith(excludePath) || path === excludePath
    );
  }

  private isSensitiveEndpoint(path: string): boolean {
    return this.config.sensitiveEndpoints!.some(sensitivePath => 
      path.startsWith(sensitivePath) || path === sensitivePath
    );
  }

  private getAuditOperation(path: string, method: string): string {
    if (path.includes('/contexts')) {
      switch (method) {
        case 'POST': return 'create_context';
        case 'GET': return 'read_context';
        case 'PUT': return 'update_context';
        case 'DELETE': return 'delete_context';
        default: return 'context_operation';
      }
    }
    
    if (path.includes('/agents')) {
      switch (method) {
        case 'POST': return 'register_agent';
        case 'GET': return 'read_agent';
        case 'PUT': return 'update_agent';
        case 'DELETE': return 'unregister_agent';
        default: return 'agent_operation';
      }
    }
    
    if (path.includes('/workflows')) {
      switch (method) {
        case 'POST': return 'create_workflow';
        case 'GET': return 'read_workflow';
        case 'PUT': return 'update_workflow';
        case 'DELETE': return 'delete_workflow';
        default: return 'workflow_operation';
      }
    }
    
    if (path.includes('/tasks')) {
      switch (method) {
        case 'POST': return 'create_task';
        case 'GET': return 'read_task';
        case 'PUT': return 'update_task';
        case 'DELETE': return 'delete_task';
        default: return 'task_operation';
      }
    }
    
    if (path.includes('/route')) {
      return 'mcp_routing';
    }
    
    return `${method.toLowerCase()}_${path.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
  }

  private getAuditResource(path: string): string {
    if (path.includes('/contexts')) return 'context';
    if (path.includes('/agents')) return 'agent';
    if (path.includes('/workflows')) return 'workflow';
    if (path.includes('/tasks')) return 'task';
    if (path.includes('/route')) return 'mcp_route';
    if (path.includes('/services')) return 'service';
    return 'orchestrator';
  }

  private sanitizeHeaders(headers: any): any {
    if (!this.config.sanitizeSensitiveData) return headers;

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!this.config.sanitizeSensitiveData) return data;

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey.includes('password') || 
            lowerKey.includes('token') || 
            lowerKey.includes('secret') || 
            lowerKey.includes('key') ||
            lowerKey.includes('auth')) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }

    return data;
  }

  // Configuraciones predefinidas
  static readonly PRODUCTION_CONFIG: MonitoringConfig = {
    enableRequestLogging: true,
    enablePerformanceLogging: true,
    enableAuditLogging: true,
    enableMetrics: true,
    slowRequestThreshold: 1000,
    logRequestBody: false,
    logResponseBody: false,
    sanitizeSensitiveData: true
  };

  static readonly DEVELOPMENT_CONFIG: MonitoringConfig = {
    enableRequestLogging: true,
    enablePerformanceLogging: true,
    enableAuditLogging: true,
    enableMetrics: true,
    slowRequestThreshold: 500,
    logRequestBody: true,
    logResponseBody: true,
    sanitizeSensitiveData: false
  };

  static readonly VERBOSE_CONFIG: MonitoringConfig = {
    enableRequestLogging: true,
    enablePerformanceLogging: true,
    enableAuditLogging: true,
    enableMetrics: true,
    slowRequestThreshold: 100,
    logRequestBody: true,
    logResponseBody: true,
    sanitizeSensitiveData: false
  };
}