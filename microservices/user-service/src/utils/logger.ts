import winston from 'winston';
import path from 'path';

// ===== CONFIGURACIÓN DE LOGGING =====

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''} ${stack || ''}`;
  })
);

// Crear logger principal
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'user-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transports
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'user-service-error.log'),
      level: 'error',
      format: fileLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'user-service-combined.log'),
      format: fileLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// ===== LOGGERS ESPECÍFICOS =====

// Logger para autenticación
export const authLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'user-service', component: 'auth' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'auth.log'),
      format: fileLogFormat,
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Logger para base de datos
export const dbLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'user-service', component: 'database' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'database.log'),
      format: fileLogFormat,
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Logger para auditoría
export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'user-service', component: 'audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'audit.log'),
      format: fileLogFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// Logger para performance
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'user-service', component: 'performance' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'performance.log'),
      format: fileLogFormat,
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// ===== FUNCIONES DE LOGGING ESPECÍFICAS =====

// Logging de autenticación
export const logAuthEvent = (event: string, userId?: string, details?: any) => {
  authLogger.info(`Auth Event: ${event}`, {
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Logging de errores de autenticación
export const logAuthError = (error: string, userId?: string, details?: any) => {
  authLogger.error(`Auth Error: ${error}`, {
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Logging de operaciones de base de datos
export const logDbOperation = (operation: string, table: string, details?: any) => {
  dbLogger.info(`DB Operation: ${operation}`, {
    table,
    details,
    timestamp: new Date().toISOString()
  });
};

// Logging de errores de base de datos
export const logDbError = (error: string, operation: string, table: string, details?: any) => {
  dbLogger.error(`DB Error: ${error}`, {
    operation,
    table,
    details,
    timestamp: new Date().toISOString()
  });
};

// Logging de auditoría
export const logAuditEvent = (action: string, userId: string, resource: string, details?: any) => {
  auditLogger.info(`Audit Event: ${action}`, {
    userId,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
};

// Logging de performance
export const logPerformance = (operation: string, duration: number, details?: any) => {
  performanceLogger.info(`Performance: ${operation}`, {
    duration,
    details,
    timestamp: new Date().toISOString()
  });
};

// ===== MIDDLEWARE DE LOGGING =====

export const createRequestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
    
    // Log performance si es lento
    if (duration > 1000) {
      logPerformance(`${req.method} ${req.url}`, duration, {
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }
  });
  
  next();
};

// ===== UTILIDADES DE LOGGING =====

// Función para sanitizar datos sensibles
export const sanitizeLogData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'apiKey'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Función para crear contexto de logging
export const createLogContext = (userId?: string, requestId?: string) => {
  return {
    userId,
    requestId,
    timestamp: new Date().toISOString(),
    service: 'user-service'
  };
};

export default logger; 