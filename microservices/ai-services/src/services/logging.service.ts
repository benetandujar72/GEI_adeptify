import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { format } from 'winston';
import os from 'os';

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  model?: string;
  provider?: string;
  contentType?: string;
  predictionType?: string;
  conversationId?: string;
  studentId?: string;
  tokens?: number;
  cost?: number;
  latency?: number;
  confidence?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export class LoggingService {
  private logger: winston.Logger;
  private static instance: LoggingService;

  private constructor() {
    this.logger = this.createLogger();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private createLogger(): winston.Logger {
    const logFormat = format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json(),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple(),
          format.printf(({ timestamp, level, message, metadata }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
          })
        )
      }),
      new winston.transports.File({
        filename: 'logs/ai-services-error.log',
        level: 'error',
        format: logFormat
      }),
      new winston.transports.File({
        filename: 'logs/ai-services-combined.log',
        format: logFormat
      })
    ];

    // Agregar transporte de Elasticsearch si está configurado
    if (process.env.ELASTICSEARCH_URL) {
      transports.push(
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: process.env.ELASTICSEARCH_URL,
            auth: process.env.ELASTICSEARCH_AUTH ? {
              username: process.env.ELASTICSEARCH_USERNAME,
              password: process.env.ELASTICSEARCH_PASSWORD
            } : undefined
          },
          indexPrefix: 'ai-services-logs',
          format: logFormat
        })
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      defaultMeta: {
        service: 'ai-services',
        hostname: os.hostname(),
        pid: process.pid
      }
    });
  }

  // Métodos de logging generales
  public info(message: string, context?: LogContext): void {
    this.logger.info(message, { ...context });
  }

  public error(message: string, context?: LogContext): void {
    this.logger.error(message, { ...context });
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, { ...context });
  }

  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, { ...context });
  }

  // Métodos específicos para LLM Gateway
  public logLLMRequest(provider: string, model: string, context: LogContext): void {
    this.logger.info('LLM request initiated', {
      ...context,
      operation: 'llm_request',
      provider,
      model
    });
  }

  public logLLMResponse(provider: string, model: string, tokens: number, cost: number, latency: number, context: LogContext): void {
    this.logger.info('LLM response received', {
      ...context,
      operation: 'llm_response',
      provider,
      model,
      tokens,
      cost,
      latency
    });
  }

  public logLLMError(provider: string, model: string, error: string, context: LogContext): void {
    this.logger.error('LLM request failed', {
      ...context,
      operation: 'llm_error',
      provider,
      model,
      error
    });
  }

  public logLLMCacheHit(provider: string, model: string, context: LogContext): void {
    this.logger.info('LLM cache hit', {
      ...context,
      operation: 'llm_cache_hit',
      provider,
      model
    });
  }

  public logCircuitBreaker(provider: string, state: string, context: LogContext): void {
    this.logger.warn('Circuit breaker state change', {
      ...context,
      operation: 'circuit_breaker',
      provider,
      state
    });
  }

  // Métodos específicos para Content Generation
  public logContentGeneration(contentType: string, subject: string, topic: string, context: LogContext): void {
    this.logger.info('Content generation started', {
      ...context,
      operation: 'content_generation',
      contentType,
      subject,
      topic
    });
  }

  public logContentGenerated(contentType: string, tokens: number, cost: number, latency: number, context: LogContext): void {
    this.logger.info('Content generation completed', {
      ...context,
      operation: 'content_generated',
      contentType,
      tokens,
      cost,
      latency
    });
  }

  public logContentCacheHit(contentType: string, context: LogContext): void {
    this.logger.info('Content cache hit', {
      ...context,
      operation: 'content_cache_hit',
      contentType
    });
  }

  public logTemplateUsage(templateId: string, context: LogContext): void {
    this.logger.info('Template used', {
      ...context,
      operation: 'template_usage',
      templateId
    });
  }

  // Métodos específicos para Chatbot
  public logChatMessage(userId: string, conversationId: string, messageLength: number, context: LogContext): void {
    this.logger.info('Chat message received', {
      ...context,
      operation: 'chat_message',
      userId,
      conversationId,
      messageLength
    });
  }

  public logChatResponse(userId: string, conversationId: string, responseTime: number, tokens: number, cost: number, context: LogContext): void {
    this.logger.info('Chat response generated', {
      ...context,
      operation: 'chat_response',
      userId,
      conversationId,
      responseTime,
      tokens,
      cost
    });
  }

  public logIntentDetection(intent: string, confidence: number, context: LogContext): void {
    this.logger.info('Intent detected', {
      ...context,
      operation: 'intent_detection',
      intent,
      confidence
    });
  }

  public logSentimentAnalysis(sentiment: number, context: LogContext): void {
    this.logger.info('Sentiment analyzed', {
      ...context,
      operation: 'sentiment_analysis',
      sentiment
    });
  }

  public logConversationCreated(conversationId: string, userId: string, context: LogContext): void {
    this.logger.info('Conversation created', {
      ...context,
      operation: 'conversation_created',
      conversationId,
      userId
    });
  }

  public logConversationUpdated(conversationId: string, messageCount: number, context: LogContext): void {
    this.logger.info('Conversation updated', {
      ...context,
      operation: 'conversation_updated',
      conversationId,
      messageCount
    });
  }

  // Métodos específicos para Predictive Analytics
  public logPredictionRequest(studentId: string, predictionType: string, timeframe: string, context: LogContext): void {
    this.logger.info('Prediction request received', {
      ...context,
      operation: 'prediction_request',
      studentId,
      predictionType,
      timeframe
    });
  }

  public logPredictionGenerated(studentId: string, predictionType: string, value: number, confidence: number, context: LogContext): void {
    this.logger.info('Prediction generated', {
      ...context,
      operation: 'prediction_generated',
      studentId,
      predictionType,
      value,
      confidence
    });
  }

  public logLearningPathGenerated(studentId: string, subjects: string[], estimatedDuration: number, successProbability: number, context: LogContext): void {
    this.logger.info('Learning path generated', {
      ...context,
      operation: 'learning_path_generated',
      studentId,
      subjects,
      estimatedDuration,
      successProbability
    });
  }

  public logContentRecommendation(studentId: string, recommendationsCount: number, context: LogContext): void {
    this.logger.info('Content recommendations generated', {
      ...context,
      operation: 'content_recommendation',
      studentId,
      recommendationsCount
    });
  }

  public logStudentDataUpdate(studentId: string, dataPoints: number, context: LogContext): void {
    this.logger.info('Student data updated', {
      ...context,
      operation: 'student_data_update',
      studentId,
      dataPoints
    });
  }

  public logModelTraining(modelName: string, accuracy: number, trainingDataSize: number, context: LogContext): void {
    this.logger.info('Model training completed', {
      ...context,
      operation: 'model_training',
      modelName,
      accuracy,
      trainingDataSize
    });
  }

  // Métodos de rendimiento
  public logPerformance(operation: string, duration: number, context: LogContext): void {
    this.logger.info('Performance measurement', {
      ...context,
      operation: 'performance',
      performance_operation: operation,
      duration
    });
  }

  public logSlowOperation(operation: string, duration: number, threshold: number, context: LogContext): void {
    this.logger.warn('Slow operation detected', {
      ...context,
      operation: 'slow_operation',
      performance_operation: operation,
      duration,
      threshold
    });
  }

  // Métodos de auditoría
  public logAudit(action: string, resource: string, userId: string, context: LogContext): void {
    this.logger.info('Audit event', {
      ...context,
      operation: 'audit',
      audit_action: action,
      audit_resource: resource,
      userId
    });
  }

  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context: LogContext): void {
    this.logger.warn('Security event', {
      ...context,
      operation: 'security_event',
      security_event: event,
      severity
    });
  }

  // Métodos de métricas
  public logMetric(name: string, value: number, tags: Record<string, string>, context: LogContext): void {
    this.logger.info('Metric recorded', {
      ...context,
      operation: 'metric',
      metric_name: name,
      metric_value: value,
      metric_tags: tags
    });
  }

  // Métodos de salud del sistema
  public logHealthCheck(component: string, status: 'healthy' | 'degraded' | 'unhealthy', details: any, context: LogContext): void {
    this.logger.info('Health check', {
      ...context,
      operation: 'health_check',
      health_component: component,
      health_status: status,
      health_details: details
    });
  }

  public logServiceStart(service: string, version: string, context: LogContext): void {
    this.logger.info('Service started', {
      ...context,
      operation: 'service_start',
      service,
      version
    });
  }

  public logServiceStop(service: string, context: LogContext): void {
    this.logger.info('Service stopped', {
      ...context,
      operation: 'service_stop',
      service
    });
  }

  // Métodos de limpieza y mantenimiento
  public logCacheCleanup(cacheType: string, keysRemoved: number, context: LogContext): void {
    this.logger.info('Cache cleanup completed', {
      ...context,
      operation: 'cache_cleanup',
      cache_type: cacheType,
      keys_removed: keysRemoved
    });
  }

  public logDataCleanup(dataType: string, recordsRemoved: number, context: LogContext): void {
    this.logger.info('Data cleanup completed', {
      ...context,
      operation: 'data_cleanup',
      data_type: dataType,
      records_removed: recordsRemoved
    });
  }

  // Método para obtener el logger de Winston
  public getLogger(): winston.Logger {
    return this.logger;
  }

  // Método para cerrar el logger
  public async close(): Promise<void> {
    await this.logger.end();
  }
}

export const logger = LoggingService.getInstance();