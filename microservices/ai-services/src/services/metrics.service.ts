import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response } from 'express';

export interface MetricsConfig {
  enableDefaultMetrics: boolean;
  prefix: string;
  labels: string[];
}

export class MetricsService {
  private static instance: MetricsService;
  private config: MetricsConfig;

  // HTTP Metrics
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestSize: Histogram<string>;
  public httpResponseSize: Histogram<string>;

  // LLM Gateway Metrics
  public llmRequestsTotal: Counter<string>;
  public llmRequestDuration: Histogram<string>;
  public llmTokensUsed: Counter<string>;
  public llmCostTotal: Counter<string>;
  public llmCacheHits: Counter<string>;
  public llmCacheMisses: Counter<string>;
  public llmErrors: Counter<string>;
  public llmCircuitBreakerState: Gauge<string>;

  // Content Generation Metrics
  public contentGenerationRequests: Counter<string>;
  public contentGenerationDuration: Histogram<string>;
  public contentGenerationTokens: Counter<string>;
  public contentGenerationCost: Counter<string>;
  public contentCacheHits: Counter<string>;
  public contentCacheMisses: Counter<string>;
  public contentGenerationErrors: Counter<string>;
  public contentTypesGenerated: Counter<string>;

  // Chatbot Metrics
  public chatbotMessages: Counter<string>;
  public chatbotResponseTime: Histogram<string>;
  public chatbotTokensUsed: Counter<string>;
  public chatbotCost: Counter<string>;
  public chatbotConversations: Gauge<string>;
  public chatbotIntentDetection: Counter<string>;
  public chatbotSentimentAnalysis: Counter<string>;
  public chatbotErrors: Counter<string>;

  // Predictive Analytics Metrics
  public predictionRequests: Counter<string>;
  public predictionDuration: Histogram<string>;
  public predictionAccuracy: Histogram<string>;
  public learningPathGeneration: Counter<string>;
  public contentRecommendations: Counter<string>;
  public studentDataUpdates: Counter<string>;
  public modelTraining: Counter<string>;
  public predictionErrors: Counter<string>;

  // System Metrics
  public activeConnections: Gauge<string>;
  public memoryUsage: Gauge<string>;
  public cpuUsage: Gauge<string>;
  public redisConnections: Gauge<string>;
  public elasticsearchConnections: Gauge<string>;

  // AI Services Specific Metrics
  public aiServiceHealth: Gauge<string>;
  public aiServiceVersion: Gauge<string>;
  public aiServiceUptime: Gauge<string>;

  private constructor(config: MetricsConfig = { enableDefaultMetrics: true, prefix: 'ai_services', labels: ['service'] }) {
    this.config = config;
    this.initializeMetrics();
  }

  public static getInstance(config?: MetricsConfig): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(config);
    }
    return MetricsService.instance;
  }

  private initializeMetrics(): void {
    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: `${this.config.prefix}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status_code', ...this.config.labels]
    });

    this.httpRequestDuration = new Histogram({
      name: `${this.config.prefix}_http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint', 'status_code', ...this.config.labels],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.httpRequestSize = new Histogram({
      name: `${this.config.prefix}_http_request_size_bytes`,
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'endpoint', ...this.config.labels],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    this.httpResponseSize = new Histogram({
      name: `${this.config.prefix}_http_response_size_bytes`,
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'endpoint', 'status_code', ...this.config.labels],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    // LLM Gateway Metrics
    this.llmRequestsTotal = new Counter({
      name: `${this.config.prefix}_llm_requests_total`,
      help: 'Total number of LLM requests',
      labelNames: ['provider', 'model', 'status', ...this.config.labels]
    });

    this.llmRequestDuration = new Histogram({
      name: `${this.config.prefix}_llm_request_duration_seconds`,
      help: 'LLM request duration in seconds',
      labelNames: ['provider', 'model', ...this.config.labels],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.llmTokensUsed = new Counter({
      name: `${this.config.prefix}_llm_tokens_total`,
      help: 'Total number of tokens used',
      labelNames: ['provider', 'model', 'token_type', ...this.config.labels]
    });

    this.llmCostTotal = new Counter({
      name: `${this.config.prefix}_llm_cost_total`,
      help: 'Total cost of LLM requests',
      labelNames: ['provider', 'model', ...this.config.labels]
    });

    this.llmCacheHits = new Counter({
      name: `${this.config.prefix}_llm_cache_hits_total`,
      help: 'Total number of LLM cache hits',
      labelNames: ['provider', 'model', ...this.config.labels]
    });

    this.llmCacheMisses = new Counter({
      name: `${this.config.prefix}_llm_cache_misses_total`,
      help: 'Total number of LLM cache misses',
      labelNames: ['provider', 'model', ...this.config.labels]
    });

    this.llmErrors = new Counter({
      name: `${this.config.prefix}_llm_errors_total`,
      help: 'Total number of LLM errors',
      labelNames: ['provider', 'model', 'error_type', ...this.config.labels]
    });

    this.llmCircuitBreakerState = new Gauge({
      name: `${this.config.prefix}_llm_circuit_breaker_state`,
      help: 'Circuit breaker state for LLM providers',
      labelNames: ['provider', ...this.config.labels]
    });

    // Content Generation Metrics
    this.contentGenerationRequests = new Counter({
      name: `${this.config.prefix}_content_generation_requests_total`,
      help: 'Total number of content generation requests',
      labelNames: ['content_type', 'subject', 'status', ...this.config.labels]
    });

    this.contentGenerationDuration = new Histogram({
      name: `${this.config.prefix}_content_generation_duration_seconds`,
      help: 'Content generation duration in seconds',
      labelNames: ['content_type', 'subject', ...this.config.labels],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.contentGenerationTokens = new Counter({
      name: `${this.config.prefix}_content_generation_tokens_total`,
      help: 'Total tokens used for content generation',
      labelNames: ['content_type', 'subject', ...this.config.labels]
    });

    this.contentGenerationCost = new Counter({
      name: `${this.config.prefix}_content_generation_cost_total`,
      help: 'Total cost of content generation',
      labelNames: ['content_type', 'subject', ...this.config.labels]
    });

    this.contentCacheHits = new Counter({
      name: `${this.config.prefix}_content_cache_hits_total`,
      help: 'Total number of content cache hits',
      labelNames: ['content_type', ...this.config.labels]
    });

    this.contentCacheMisses = new Counter({
      name: `${this.config.prefix}_content_cache_misses_total`,
      help: 'Total number of content cache misses',
      labelNames: ['content_type', ...this.config.labels]
    });

    this.contentGenerationErrors = new Counter({
      name: `${this.config.prefix}_content_generation_errors_total`,
      help: 'Total number of content generation errors',
      labelNames: ['content_type', 'error_type', ...this.config.labels]
    });

    this.contentTypesGenerated = new Counter({
      name: `${this.config.prefix}_content_types_generated_total`,
      help: 'Total number of content types generated',
      labelNames: ['content_type', ...this.config.labels]
    });

    // Chatbot Metrics
    this.chatbotMessages = new Counter({
      name: `${this.config.prefix}_chatbot_messages_total`,
      help: 'Total number of chatbot messages',
      labelNames: ['message_type', 'intent', 'status', ...this.config.labels]
    });

    this.chatbotResponseTime = new Histogram({
      name: `${this.config.prefix}_chatbot_response_time_seconds`,
      help: 'Chatbot response time in seconds',
      labelNames: ['intent', ...this.config.labels],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.chatbotTokensUsed = new Counter({
      name: `${this.config.prefix}_chatbot_tokens_total`,
      help: 'Total tokens used by chatbot',
      labelNames: ['intent', ...this.config.labels]
    });

    this.chatbotCost = new Counter({
      name: `${this.config.prefix}_chatbot_cost_total`,
      help: 'Total cost of chatbot operations',
      labelNames: ['intent', ...this.config.labels]
    });

    this.chatbotConversations = new Gauge({
      name: `${this.config.prefix}_chatbot_conversations_active`,
      help: 'Number of active chatbot conversations',
      labelNames: [...this.config.labels]
    });

    this.chatbotIntentDetection = new Counter({
      name: `${this.config.prefix}_chatbot_intent_detection_total`,
      help: 'Total number of intent detections',
      labelNames: ['intent', 'confidence_level', ...this.config.labels]
    });

    this.chatbotSentimentAnalysis = new Counter({
      name: `${this.config.prefix}_chatbot_sentiment_analysis_total`,
      help: 'Total number of sentiment analyses',
      labelNames: ['sentiment', ...this.config.labels]
    });

    this.chatbotErrors = new Counter({
      name: `${this.config.prefix}_chatbot_errors_total`,
      help: 'Total number of chatbot errors',
      labelNames: ['error_type', ...this.config.labels]
    });

    // Predictive Analytics Metrics
    this.predictionRequests = new Counter({
      name: `${this.config.prefix}_prediction_requests_total`,
      help: 'Total number of prediction requests',
      labelNames: ['prediction_type', 'timeframe', 'status', ...this.config.labels]
    });

    this.predictionDuration = new Histogram({
      name: `${this.config.prefix}_prediction_duration_seconds`,
      help: 'Prediction duration in seconds',
      labelNames: ['prediction_type', 'timeframe', ...this.config.labels],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.predictionAccuracy = new Histogram({
      name: `${this.config.prefix}_prediction_accuracy`,
      help: 'Prediction accuracy',
      labelNames: ['prediction_type', 'model', ...this.config.labels],
      buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    });

    this.learningPathGeneration = new Counter({
      name: `${this.config.prefix}_learning_path_generation_total`,
      help: 'Total number of learning paths generated',
      labelNames: ['subjects_count', 'status', ...this.config.labels]
    });

    this.contentRecommendations = new Counter({
      name: `${this.config.prefix}_content_recommendations_total`,
      help: 'Total number of content recommendations',
      labelNames: ['recommendation_type', 'status', ...this.config.labels]
    });

    this.studentDataUpdates = new Counter({
      name: `${this.config.prefix}_student_data_updates_total`,
      help: 'Total number of student data updates',
      labelNames: ['data_type', ...this.config.labels]
    });

    this.modelTraining = new Counter({
      name: `${this.config.prefix}_model_training_total`,
      help: 'Total number of model training sessions',
      labelNames: ['model_type', 'status', ...this.config.labels]
    });

    this.predictionErrors = new Counter({
      name: `${this.config.prefix}_prediction_errors_total`,
      help: 'Total number of prediction errors',
      labelNames: ['prediction_type', 'error_type', ...this.config.labels]
    });

    // System Metrics
    this.activeConnections = new Gauge({
      name: `${this.config.prefix}_active_connections`,
      help: 'Number of active connections',
      labelNames: ['connection_type', ...this.config.labels]
    });

    this.memoryUsage = new Gauge({
      name: `${this.config.prefix}_memory_usage_bytes`,
      help: 'Memory usage in bytes',
      labelNames: ['memory_type', ...this.config.labels]
    });

    this.cpuUsage = new Gauge({
      name: `${this.config.prefix}_cpu_usage_percent`,
      help: 'CPU usage percentage',
      labelNames: [...this.config.labels]
    });

    this.redisConnections = new Gauge({
      name: `${this.config.prefix}_redis_connections`,
      help: 'Redis connection status',
      labelNames: ['status', ...this.config.labels]
    });

    this.elasticsearchConnections = new Gauge({
      name: `${this.config.prefix}_elasticsearch_connections`,
      help: 'Elasticsearch connection status',
      labelNames: ['status', ...this.config.labels]
    });

    // AI Services Specific Metrics
    this.aiServiceHealth = new Gauge({
      name: `${this.config.prefix}_service_health`,
      help: 'AI Services health status',
      labelNames: ['component', ...this.config.labels]
    });

    this.aiServiceVersion = new Gauge({
      name: `${this.config.prefix}_service_version`,
      help: 'AI Services version info',
      labelNames: ['version', ...this.config.labels]
    });

    this.aiServiceUptime = new Gauge({
      name: `${this.config.prefix}_service_uptime_seconds`,
      help: 'AI Services uptime in seconds',
      labelNames: [...this.config.labels]
    });

    // Enable default metrics if configured
    if (this.config.enableDefaultMetrics) {
      collectDefaultMetrics({ prefix: this.config.prefix });
    }
  }

  // HTTP Metrics Methods
  public recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
    const labels = { method, endpoint, status_code: statusCode.toString() };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration / 1000);
  }

  public recordHttpRequestSize(method: string, endpoint: string, size: number): void {
    const labels = { method, endpoint };
    this.httpRequestSize.observe(labels, size);
  }

  public recordHttpResponseSize(method: string, endpoint: string, statusCode: number, size: number): void {
    const labels = { method, endpoint, status_code: statusCode.toString() };
    this.httpResponseSize.observe(labels, size);
  }

  // LLM Gateway Metrics Methods
  public recordLLMRequest(provider: string, model: string, status: string, duration: number): void {
    const labels = { provider, model, status };
    this.llmRequestsTotal.inc(labels);
    this.llmRequestDuration.observe({ provider, model }, duration / 1000);
  }

  public recordLLMUsage(provider: string, model: string, tokens: number, cost: number): void {
    const labels = { provider, model };
    this.llmTokensUsed.inc({ ...labels, token_type: 'total' }, tokens);
    this.llmCostTotal.inc(labels, cost);
  }

  public recordLLMCacheHit(provider: string, model: string): void {
    this.llmCacheHits.inc({ provider, model });
  }

  public recordLLMCacheMiss(provider: string, model: string): void {
    this.llmCacheMisses.inc({ provider, model });
  }

  public recordLLMError(provider: string, model: string, errorType: string): void {
    this.llmErrors.inc({ provider, model, error_type: errorType });
  }

  public setCircuitBreakerState(provider: string, state: number): void {
    this.llmCircuitBreakerState.set({ provider }, state);
  }

  // Content Generation Metrics Methods
  public recordContentGeneration(contentType: string, subject: string, status: string, duration: number): void {
    const labels = { content_type: contentType, subject, status };
    this.contentGenerationRequests.inc(labels);
    this.contentGenerationDuration.observe({ content_type: contentType, subject }, duration / 1000);
  }

  public recordContentUsage(contentType: string, subject: string, tokens: number, cost: number): void {
    const labels = { content_type: contentType, subject };
    this.contentGenerationTokens.inc(labels, tokens);
    this.contentGenerationCost.inc(labels, cost);
  }

  public recordContentCacheHit(contentType: string): void {
    this.contentCacheHits.inc({ content_type: contentType });
  }

  public recordContentCacheMiss(contentType: string): void {
    this.contentCacheMisses.inc({ content_type: contentType });
  }

  public recordContentError(contentType: string, errorType: string): void {
    this.contentGenerationErrors.inc({ content_type: contentType, error_type: errorType });
  }

  public recordContentTypeGenerated(contentType: string): void {
    this.contentTypesGenerated.inc({ content_type: contentType });
  }

  // Chatbot Metrics Methods
  public recordChatbotMessage(messageType: string, intent: string, status: string): void {
    this.chatbotMessages.inc({ message_type: messageType, intent, status });
  }

  public recordChatbotResponse(intent: string, responseTime: number, tokens: number, cost: number): void {
    this.chatbotResponseTime.observe({ intent }, responseTime / 1000);
    this.chatbotTokensUsed.inc({ intent }, tokens);
    this.chatbotCost.inc({ intent }, cost);
  }

  public setChatbotConversations(count: number): void {
    this.chatbotConversations.set({}, count);
  }

  public recordIntentDetection(intent: string, confidenceLevel: string): void {
    this.chatbotIntentDetection.inc({ intent, confidence_level: confidenceLevel });
  }

  public recordSentimentAnalysis(sentiment: string): void {
    this.chatbotSentimentAnalysis.inc({ sentiment });
  }

  public recordChatbotError(errorType: string): void {
    this.chatbotErrors.inc({ error_type: errorType });
  }

  // Predictive Analytics Metrics Methods
  public recordPrediction(predictionType: string, timeframe: string, status: string, duration: number): void {
    const labels = { prediction_type: predictionType, timeframe, status };
    this.predictionRequests.inc(labels);
    this.predictionDuration.observe({ prediction_type: predictionType, timeframe }, duration / 1000);
  }

  public recordPredictionAccuracy(predictionType: string, model: string, accuracy: number): void {
    this.predictionAccuracy.observe({ prediction_type: predictionType, model }, accuracy);
  }

  public recordLearningPathGeneration(subjectsCount: number, status: string): void {
    this.learningPathGeneration.inc({ subjects_count: subjectsCount.toString(), status });
  }

  public recordContentRecommendation(recommendationType: string, status: string): void {
    this.contentRecommendations.inc({ recommendation_type: recommendationType, status });
  }

  public recordStudentDataUpdate(dataType: string): void {
    this.studentDataUpdates.inc({ data_type: dataType });
  }

  public recordModelTraining(modelType: string, status: string): void {
    this.modelTraining.inc({ model_type: modelType, status });
  }

  public recordPredictionError(predictionType: string, errorType: string): void {
    this.predictionErrors.inc({ prediction_type: predictionType, error_type: errorType });
  }

  // System Metrics Methods
  public setActiveConnections(connectionType: string, count: number): void {
    this.activeConnections.set({ connection_type: connectionType }, count);
  }

  public updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ memory_type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ memory_type: 'heap_total' }, memUsage.heapTotal);
    this.memoryUsage.set({ memory_type: 'heap_used' }, memUsage.heapUsed);
    this.memoryUsage.set({ memory_type: 'external' }, memUsage.external);
  }

  public setCpuUsage(usage: number): void {
    this.cpuUsage.set({}, usage);
  }

  public setRedisConnections(count: number, status: string): void {
    this.redisConnections.set({ status }, count);
  }

  public setElasticsearchConnections(count: number, status: string): void {
    this.elasticsearchConnections.set({ status }, count);
  }

  // AI Services Specific Metrics Methods
  public setServiceHealth(component: string, health: number): void {
    this.aiServiceHealth.set({ component }, health);
  }

  public setServiceVersion(version: string): void {
    this.aiServiceVersion.set({ version }, 1);
  }

  public setServiceUptime(uptime: number): void {
    this.aiServiceUptime.set({}, uptime);
  }

  // Utility Methods
  public async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  public clearMetrics(): void {
    register.clear();
  }

  public getMetricsAsJSON(): any {
    return register.getMetricsAsJSON();
  }
}

export const metrics = MetricsService.getInstance();