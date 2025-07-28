import winston from 'winston';

// Configuración de colores para consola
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Formato para archivos (sin colores)
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Configuración del logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileLogFormat,
  defaultMeta: { service: 'predictive-analytics-service' },
  transports: [
    // Logs de error
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs combinados
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Agregar transporte de consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: logFormat,
  }));
}

// Función para loggear requests HTTP
export const logHttpRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Función para loggear errores de análisis predictivo
export const logAnalyticsError = (error: any, context: any = {}) => {
  logger.error('Predictive Analytics Error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear eventos de análisis predictivo
export const logAnalyticsEvent = (event: string, details: any = {}) => {
  logger.info('Predictive Analytics Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear métricas de rendimiento
export const logPerformance = (operation: string, duration: number, metadata: any = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear llamadas al LLM Gateway
export const logLLMGatewayCall = (request: any, response: any, duration: number) => {
  logger.info('LLM Gateway Call', {
    request: {
      type: request.type,
      studentId: request.studentId,
      courseId: request.courseId,
      model: request.model,
    },
    response: {
      success: response.success,
      tokens: response.usage?.total_tokens,
      cost: response.cost,
    },
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear predicciones
export const logPrediction = (type: string, studentId: string, result: any, confidence: number) => {
  logger.info('Prediction Generated', {
    type,
    studentId,
    confidence,
    result: {
      predictedGrade: result.predictedGrade,
      successProbability: result.successProbability,
      riskLevel: result.riskLevel,
    },
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear entrenamiento de modelos
export const logModelTraining = (modelId: string, status: string, progress: number, metadata: any = {}) => {
  logger.info('Model Training', {
    modelId,
    status,
    progress: `${progress}%`,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear análisis de datos
export const logDataAnalysis = (analysisType: string, variables: string[], results: any) => {
  logger.info('Data Analysis', {
    analysisType,
    variables,
    resultsCount: results.length,
    insightsCount: results.insights?.length || 0,
    timestamp: new Date().toISOString(),
  });
};

export { logger }; 