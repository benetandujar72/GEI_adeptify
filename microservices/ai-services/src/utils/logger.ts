import winston from 'winston';
import path from 'path';

// ============================================================================
// LOG FORMATS
// ============================================================================

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

const createLogger = (service: string) => {
  const logDir = path.join(process.cwd(), 'logs');
  
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logDir, `${service}-combined.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      }),
      
      // File transport for error logs
      new winston.transports.File({
        filename: path.join(logDir, `${service}-error.log`),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, `${service}-exceptions.log`)
      })
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, `${service}-rejections.log`)
      })
    ]
  });
};

// ============================================================================
// SERVICE-SPECIFIC LOGGERS
// ============================================================================

export const aiLogger = createLogger('ai-services');
export const contentLogger = createLogger('content-generation');
export const analyticsLogger = createLogger('analytics');
export const personalizationLogger = createLogger('personalization');
export const mlLogger = createLogger('ml-pipeline');
export const vectorLogger = createLogger('vector-store');
export const queueLogger = createLogger('queue');

// ============================================================================
// LOGGER UTILITIES
// ============================================================================

export const logRequest = (logger: winston.Logger, req: any, operation: string) => {
  logger.info('Request received', {
    operation,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
};

export const logResponse = (logger: winston.Logger, res: any, operation: string, duration: number) => {
  logger.info('Response sent', {
    operation,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

export const logError = (logger: winston.Logger, error: any, context?: any) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    context,
    timestamp: new Date().toISOString()
  });
};

export const logPerformance = (logger: winston.Logger, operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logAIOperation = (logger: winston.Logger, operation: string, model: string, input: any, output: any, duration: number) => {
  logger.info('AI operation completed', {
    operation,
    model,
    inputSize: JSON.stringify(input).length,
    outputSize: JSON.stringify(output).length,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

export const logModelTraining = (logger: winston.Logger, modelId: string, datasetSize: number, epochs: number, accuracy: number, duration: number) => {
  logger.info('Model training completed', {
    modelId,
    datasetSize,
    epochs,
    accuracy: `${(accuracy * 100).toFixed(2)}%`,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

export const logVectorOperation = (logger: winston.Logger, operation: string, collection: string, querySize: number, resultCount: number, duration: number) => {
  logger.info('Vector operation completed', {
    operation,
    collection,
    querySize,
    resultCount,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

export const logQueueJob = (logger: winston.Logger, jobId: string, type: string, status: string, duration?: number) => {
  logger.info('Queue job processed', {
    jobId,
    type,
    status,
    duration: duration ? `${duration}ms` : undefined,
    timestamp: new Date().toISOString()
  });
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default aiLogger;