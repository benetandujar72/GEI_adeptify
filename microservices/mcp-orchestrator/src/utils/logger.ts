import winston from 'winston';
import path from 'path';

// Log format configuration
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Main logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'mcp-orchestrator' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'mcp-orchestrator.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'mcp-orchestrator-error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Specialized loggers
export const orchestratorLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { component: 'orchestrator' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'orchestrator.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

export const routingLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { component: 'routing' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'routing.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

export const contextLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { component: 'context' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'context.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

export const agentLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { component: 'agent' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'agent.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

export const loadBalancerLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { component: 'load-balancer' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'load-balancer.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

export const metricsLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { component: 'metrics' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'metrics.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Utility functions
export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

export const logRouting = (request: any, response: any, duration: number) => {
  routingLogger.info('Routing Request', {
    service: request.service,
    action: request.action,
    success: response.success,
    duration,
    contextId: request.context
  });
};

export const logContext = (operation: string, contextId: string, data?: any) => {
  contextLogger.info('Context Operation', {
    operation,
    contextId,
    data
  });
};

export const logAgent = (agentType: string, operation: string, data?: any) => {
  agentLogger.info('Agent Operation', {
    agentType,
    operation,
    data
  });
};

export const logLoadBalancer = (strategy: string, serviceName: string, selectedUrl: string) => {
  loadBalancerLogger.info('Load Balancer Decision', {
    strategy,
    serviceName,
    selectedUrl
  });
};

export const logMetrics = (metrics: any) => {
  metricsLogger.info('Metrics Update', metrics);
};

export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    context
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    metadata
  });
};

export const logMCPOperation = (operation: string, data: any, contextId?: string) => {
  logger.info('MCP Operation', {
    operation,
    data,
    contextId
  });
};

export const logServiceRegistration = (serviceName: string, url: string, capabilities: string[]) => {
  logger.info('Service Registration', {
    serviceName,
    url,
    capabilities
  });
};

export const logHealthCheck = (serviceName: string, status: string, responseTime: number) => {
  logger.info('Health Check', {
    serviceName,
    status,
    responseTime
  });
};

export default logger; 