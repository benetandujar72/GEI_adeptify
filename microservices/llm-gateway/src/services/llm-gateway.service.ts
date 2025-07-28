import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';
import { CostTrackingService } from './cost-tracking.service';
import { RateLimitService } from './rate-limit.service';
import { 
  LLMRequest, 
  LLMResponse, 
  LLMError, 
  LLMProvider, 
  ProviderConfig,
  CostTracking,
  Metrics,
  HealthCheck
} from '../types/llm.types';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { GoogleProvider } from '../providers/google.provider';

export class LLMGatewayService {
  private providers: Map<LLMProvider, any> = new Map();
  private providerConfigs: Map<LLMProvider, ProviderConfig> = new Map();
  private cacheService: CacheService;
  private costTrackingService: CostTrackingService;
  private rateLimitService: RateLimitService;
  private metrics: Metrics = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageResponseTime: 0,
    errorRate: 0,
    providerUsage: {} as any,
    modelUsage: {} as any,
  };

  constructor() {
    this.cacheService = new CacheService();
    this.costTrackingService = new CostTrackingService();
    this.rateLimitService = new RateLimitService();
    this.initializeProviders();
  }

  /**
   * Inicializar proveedores de LLM
   */
  private initializeProviders(): void {
    try {
      // Configurar OpenAI
      if (process.env.OPENAI_API_KEY) {
        const openaiConfig: ProviderConfig = {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL,
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 150000,
          },
          pricing: {
            input: 0.03, // $0.03 per 1K tokens
            output: 0.06, // $0.06 per 1K tokens
            currency: 'USD',
          },
          enabled: true,
          priority: 1,
        };
        this.providerConfigs.set('openai', openaiConfig);
        this.providers.set('openai', new OpenAIProvider(openaiConfig));
        logger.info('✅ OpenAI provider initialized');
      }

      // Configurar Anthropic
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropicConfig: ProviderConfig = {
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY,
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
          rateLimit: {
            requestsPerMinute: 50,
            tokensPerMinute: 100000,
          },
          pricing: {
            input: 0.015, // $0.015 per 1K tokens
            output: 0.075, // $0.075 per 1K tokens
            currency: 'USD',
          },
          enabled: true,
          priority: 2,
        };
        this.providerConfigs.set('anthropic', anthropicConfig);
        this.providers.set('anthropic', new AnthropicProvider(anthropicConfig));
        logger.info('✅ Anthropic provider initialized');
      }

      // Configurar Google
      if (process.env.GOOGLE_API_KEY) {
        const googleConfig: ProviderConfig = {
          provider: 'google',
          apiKey: process.env.GOOGLE_API_KEY,
          models: ['gemini-pro', 'gemini-pro-vision'],
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 120000,
          },
          pricing: {
            input: 0.0005, // $0.0005 per 1K tokens
            output: 0.0015, // $0.0015 per 1K tokens
            currency: 'USD',
          },
          enabled: true,
          priority: 3,
        };
        this.providerConfigs.set('google', googleConfig);
        this.providers.set('google', new GoogleProvider(googleConfig));
        logger.info('✅ Google provider initialized');
      }

      logger.info(`🚀 LLM Gateway initialized with ${this.providers.size} providers`);
    } catch (error) {
      logger.error('❌ Error initializing LLM providers:', error);
      throw error;
    }
  }

  /**
   * Procesar solicitud de LLM
   */
  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info(`🔄 Processing LLM request: ${requestId}`, {
        provider: request.provider,
        model: request.model,
        type: request.type,
      });

      // Verificar rate limits
      await this.rateLimitService.checkRateLimit(request.provider, request.model);

      // Verificar caché
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = await this.cacheService.get(cacheKey);
      if (cachedResponse) {
        logger.info(`✅ Cache hit for request: ${requestId}`);
        this.updateMetrics(cachedResponse, Date.now() - startTime);
        return cachedResponse;
      }

      // Obtener proveedor
      const provider = this.providers.get(request.provider);
      if (!provider) {
        throw new Error(`Provider ${request.provider} not available`);
      }

      // Procesar solicitud
      const response = await provider.generate(request);
      
      // Calcular costos
      const costTracking = this.calculateCosts(request.provider, request.model, response.usage);
      
      // Registrar costos
      await this.costTrackingService.trackCost({
        ...costTracking,
        requestId,
        timestamp: new Date(),
      });

      // Guardar en caché
      await this.cacheService.set(cacheKey, response);

      // Actualizar métricas
      this.updateMetrics(response, Date.now() - startTime);

      logger.info(`✅ LLM request completed: ${requestId}`, {
        provider: request.provider,
        model: request.model,
        tokens: response.usage.totalTokens,
        cost: response.cost.totalCost,
        responseTime: Date.now() - startTime,
      });

      return response;

    } catch (error) {
      const errorResponse: LLMError = {
        code: 'LLM_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        provider: request.provider,
        model: request.model,
        requestId,
        timestamp: new Date(),
        details: error,
      };

      logger.error(`❌ LLM request failed: ${requestId}`, errorResponse);
      this.updateErrorMetrics(request.provider, request.model);
      throw errorResponse;
    }
  }

  /**
   * Generar clave de caché
   */
  private generateCacheKey(request: LLMRequest): string {
    const keyData = {
      provider: request.provider,
      model: request.model,
      type: request.type,
      prompt: request.prompt,
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      topP: request.topP,
    };
    return `llm:${JSON.stringify(keyData)}`;
  }

  /**
   * Calcular costos
   */
  private calculateCosts(provider: LLMProvider, model: string, usage: any): CostTracking {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      throw new Error(`Provider config not found: ${provider}`);
    }

    const inputCost = (usage.promptTokens / 1000) * config.pricing.input;
    const outputCost = (usage.completionTokens / 1000) * config.pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      requestId: '',
      provider,
      model,
      tokens: {
        input: usage.promptTokens,
        output: usage.completionTokens,
        total: usage.totalTokens,
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: totalCost,
        currency: config.pricing.currency,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Actualizar métricas
   */
  private updateMetrics(response: LLMResponse, responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += response.usage.totalTokens;
    this.metrics.totalCost += response.cost.totalCost;
    
    // Actualizar tiempo de respuesta promedio
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;

    // Actualizar uso por proveedor
    if (!this.metrics.providerUsage[response.provider]) {
      this.metrics.providerUsage[response.provider] = {
        requests: 0,
        tokens: 0,
        cost: 0,
        errors: 0,
      };
    }
    this.metrics.providerUsage[response.provider].requests++;
    this.metrics.providerUsage[response.provider].tokens += response.usage.totalTokens;
    this.metrics.providerUsage[response.provider].cost += response.cost.totalCost;

    // Actualizar uso por modelo
    if (!this.metrics.modelUsage[response.model]) {
      this.metrics.modelUsage[response.model] = {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
    }
    this.metrics.modelUsage[response.model].requests++;
    this.metrics.modelUsage[response.model].tokens += response.usage.totalTokens;
    this.metrics.modelUsage[response.model].cost += response.cost.totalCost;
  }

  /**
   * Actualizar métricas de error
   */
  private updateErrorMetrics(provider: LLMProvider, model: string): void {
    if (!this.metrics.providerUsage[provider]) {
      this.metrics.providerUsage[provider] = {
        requests: 0,
        tokens: 0,
        cost: 0,
        errors: 0,
      };
    }
    this.metrics.providerUsage[provider].errors++;
    
    // Actualizar tasa de error
    this.metrics.errorRate = 
      Object.values(this.metrics.providerUsage).reduce((sum, usage) => sum + usage.errors, 0) / 
      this.metrics.totalRequests;
  }

  /**
   * Obtener métricas
   */
  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  /**
   * Obtener estadísticas de caché
   */
  async getCacheStats() {
    return await this.cacheService.getStats();
  }

  /**
   * Obtener seguimiento de costos
   */
  async getCostTracking(filters: {
    startDate?: Date;
    endDate?: Date;
    provider?: LLMProvider;
    userId?: string;
  } = {}) {
    return await this.costTrackingService.getCosts(filters);
  }

  /**
   * Verificar salud de los proveedores
   */
  async getHealthChecks(): Promise<HealthCheck[]> {
    const healthChecks: HealthCheck[] = [];

    for (const [provider, providerInstance] of this.providers) {
      try {
        const startTime = Date.now();
        await providerInstance.healthCheck();
        const responseTime = Date.now() - startTime;

        healthChecks.push({
          provider,
          status: 'healthy',
          responseTime,
          lastCheck: new Date(),
        });
      } catch (error) {
        healthChecks.push({
          provider,
          status: 'unhealthy',
          responseTime: 0,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return healthChecks;
  }

  /**
   * Obtener proveedores disponibles
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Obtener modelos disponibles por proveedor
   */
  getAvailableModels(provider: LLMProvider): string[] {
    const config = this.providerConfigs.get(provider);
    return config?.models || [];
  }

  /**
   * Limpiar caché
   */
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
    logger.info('🗑️ Cache cleared');
  }

  /**
   * Reinicializar proveedores
   */
  async reinitializeProviders(): Promise<void> {
    this.providers.clear();
    this.providerConfigs.clear();
    this.initializeProviders();
    logger.info('🔄 Providers reinitialized');
  }
}

export const llmGatewayService = new LLMGatewayService(); 