import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'llm-gateway' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Si no estamos en producción, también log a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Crear logs específicos para LLM
export const llmLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'llm-gateway', component: 'llm' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/llm.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Logger para costos
export const costLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'llm-gateway', component: 'cost-tracking' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/costs.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Logger para métricas
export const metricsLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'llm-gateway', component: 'metrics' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/metrics.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
}); 