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
  defaultMeta: { service: 'chatbot-service' },
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

// Función para loggear errores del chatbot
export const logChatbotError = (error: any, context: any = {}) => {
  logger.error('Chatbot Error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear eventos del chatbot
export const logChatbotEvent = (event: string, details: any = {}) => {
  logger.info('Chatbot Event', {
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
      sessionId: request.sessionId,
      userId: request.userId,
      model: request.options?.model,
      messageLength: request.message.length,
    },
    response: {
      success: response.success,
      tokens: response.tokensUsed,
      cost: response.cost,
      modelUsed: response.modelUsed,
    },
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear sesiones de chat
export const logChatSession = (action: string, sessionId: string, userId: string, details: any = {}) => {
  logger.info('Chat Session', {
    action,
    sessionId,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear mensajes
export const logChatMessage = (sessionId: string, userId: string, role: string, messageLength: number, processingTime: number) => {
  logger.info('Chat Message', {
    sessionId,
    userId,
    role,
    messageLength,
    processingTime: `${processingTime}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear personalidades del chatbot
export const logPersonalityEvent = (action: string, personalityId: string, details: any = {}) => {
  logger.info('Personality Event', {
    action,
    personalityId,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear flujos de conversación
export const logConversationFlow = (action: string, flowId: string, sessionId: string, details: any = {}) => {
  logger.info('Conversation Flow', {
    action,
    flowId,
    sessionId,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear feedback
export const logFeedback = (sessionId: string, userId: string, rating: number, category: string, comment?: string) => {
  logger.info('Feedback Submitted', {
    sessionId,
    userId,
    rating,
    category,
    comment,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear análisis
export const logAnalytics = (sessionId: string, userId: string, topics: string[], messageCount: number, duration?: number) => {
  logger.info('Analytics Generated', {
    sessionId,
    userId,
    topics,
    messageCount,
    duration: duration ? `${duration}ms` : undefined,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear conexiones WebSocket
export const logWebSocketEvent = (event: string, sessionId: string, userId: string, details: any = {}) => {
  logger.info('WebSocket Event', {
    event,
    sessionId,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Función para loggear insights educativos
export const logEducationalInsight = (sessionId: string, insightType: string, title: string, relevance: number) => {
  logger.info('Educational Insight', {
    sessionId,
    insightType,
    title,
    relevance,
    timestamp: new Date().toISOString(),
  });
};

export { logger }; 