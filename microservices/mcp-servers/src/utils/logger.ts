import winston from 'winston';
import path from 'path';

// Configuración de formato para archivos (JSON)
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuración de formato para consola (colorizado)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger específico para servidores MCP
const serverLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-server.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger para operaciones de archivos
const fileLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-file.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger para operaciones de Git
const gitLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-git.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger para operaciones de base de datos
const databaseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-database.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger para operaciones web
const webLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-web.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger para operaciones de IA
const aiLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-ai.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger para métricas
const metricsLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'mcp-servers-metrics.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Agregar transporte de consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
  serverLogger.add(new winston.transports.Console({ format: consoleFormat }));
  fileLogger.add(new winston.transports.Console({ format: consoleFormat }));
  gitLogger.add(new winston.transports.Console({ format: consoleFormat }));
  databaseLogger.add(new winston.transports.Console({ format: consoleFormat }));
  webLogger.add(new winston.transports.Console({ format: consoleFormat }));
  aiLogger.add(new winston.transports.Console({ format: consoleFormat }));
  metricsLogger.add(new winston.transports.Console({ format: consoleFormat }));
}

// Funciones de utilidad para logging
export const logRequest = (serverId: string, operation: string, resource: string, duration: number) => {
  serverLogger.info('MCP Server Request', {
    serverId,
    operation,
    resource,
    duration,
    timestamp: new Date().toISOString()
  });
};

export const logResponse = (serverId: string, operation: string, success: boolean, duration: number) => {
  serverLogger.info('MCP Server Response', {
    serverId,
    operation,
    success,
    duration,
    timestamp: new Date().toISOString()
  });
};

export const logError = (serverId: string, operation: string, error: string, details?: any) => {
  serverLogger.error('MCP Server Error', {
    serverId,
    operation,
    error,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logPerformance = (serverId: string, metric: string, value: number) => {
  metricsLogger.info('MCP Server Performance', {
    serverId,
    metric,
    value,
    timestamp: new Date().toISOString()
  });
};

export const logMCPOperation = (serverId: string, operation: string, data?: any) => {
  serverLogger.info('MCP Operation', {
    serverId,
    operation,
    data,
    timestamp: new Date().toISOString()
  });
};

export const logFileOperation = (serverId: string, operation: string, path: string, success: boolean) => {
  fileLogger.info('File Operation', {
    serverId,
    operation,
    path,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logGitOperation = (serverId: string, operation: string, repository: string, success: boolean) => {
  gitLogger.info('Git Operation', {
    serverId,
    operation,
    repository,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logDatabaseOperation = (serverId: string, operation: string, database: string, success: boolean) => {
  databaseLogger.info('Database Operation', {
    serverId,
    operation,
    database,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logWebOperation = (serverId: string, operation: string, url: string, success: boolean) => {
  webLogger.info('Web Operation', {
    serverId,
    operation,
    url,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logAIOperation = (serverId: string, operation: string, model: string, success: boolean) => {
  aiLogger.info('AI Operation', {
    serverId,
    operation,
    model,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logServerRegistration = (serverId: string, type: string, status: string) => {
  serverLogger.info('Server Registration', {
    serverId,
    type,
    status,
    timestamp: new Date().toISOString()
  });
};

export const logServerHeartbeat = (serverId: string, status: string, metrics?: any) => {
  serverLogger.info('Server Heartbeat', {
    serverId,
    status,
    metrics,
    timestamp: new Date().toISOString()
  });
};

export const logServerStart = (serverId: string, type: string) => {
  serverLogger.info('Server Started', {
    serverId,
    type,
    timestamp: new Date().toISOString()
  });
};

export const logServerStop = (serverId: string, type: string) => {
  serverLogger.info('Server Stopped', {
    serverId,
    type,
    timestamp: new Date().toISOString()
  });
};

export const logServerError = (serverId: string, error: string, stack?: string) => {
  serverLogger.error('Server Error', {
    serverId,
    error,
    stack,
    timestamp: new Date().toISOString()
  });
};

export const logHealthCheck = (serverId: string, status: string, responseTime: number) => {
  metricsLogger.info('Health Check', {
    serverId,
    status,
    responseTime,
    timestamp: new Date().toISOString()
  });
};

export default logger;