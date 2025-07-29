import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Cohere from 'cohere-ai';
import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';
import RedisService from './redis.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface LLMProvider {
  id: string;
  name: string;
  models: string[];
  maxTokens: number;
  costPerToken: number;
  latency: number;
  reliability: number;
}

export interface LLMRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  provider?: string;
  userId?: string;
  sessionId?: string;
  context?: any;
}

export interface LLMResponse {
  id: string;
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  metadata: {
    latency: number;
    timestamp: number;
    sessionId?: string;
    userId?: string;
  };
}

export interface LLMConfig {
  providers: {
    openai?: {
      apiKey: string;
      organization?: string;
    };
    anthropic?: {
      apiKey: string;
    };
    cohere?: {
      apiKey: string;
    };
  };
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
  };
}

export class LLMGatewayService {
  private static instance: LLMGatewayService;
  private config: LLMConfig;
  private providers: Map<string, any> = new Map();
  private redis: RedisService;
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half_open' }> = new Map();

  private constructor(config: LLMConfig) {
    this.config = config;
    this.redis = new RedisService();
    this.initializeProviders();
  }

  public static getInstance(config?: LLMConfig): LLMGatewayService {
    if (!LLMGatewayService.instance && config) {
      LLMGatewayService.instance = new LLMGatewayService(config);
    }
    return LLMGatewayService.instance;
  }

  private initializeProviders(): void {
    // OpenAI
    if (this.config.providers.openai?.apiKey) {
      const openai = new OpenAI({
        apiKey: this.config.providers.openai.apiKey,
        organization: this.config.providers.openai.organization,
      });
      this.providers.set('openai', openai);
      logger.info('OpenAI provider initialized');
    }

    // Anthropic
    if (this.config.providers.anthropic?.apiKey) {
      const anthropic = new Anthropic({
        apiKey: this.config.providers.anthropic.apiKey,
      });
      this.providers.set('anthropic', anthropic);
      logger.info('Anthropic provider initialized');
    }

    // Cohere
    if (this.config.providers.cohere?.apiKey) {
      Cohere.init(this.config.providers.cohere.apiKey);
      this.providers.set('cohere', Cohere);
      logger.info('Cohere provider initialized');
    }
  }

  public async generateText(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      logger.info('Iniciando generación de texto LLM', {
        requestId,
        model: request.model,
        provider: request.provider,
        userId: request.userId,
        sessionId: request.sessionId
      });

      // Verificar cache
      if (this.config.cacheEnabled) {
        const cachedResponse = await this.getCachedResponse(request);
        if (cachedResponse) {
          logger.info('Respuesta obtenida desde cache', { requestId });
          metrics.recordLLMRequest(request.provider || 'unknown', 'cache_hit', Date.now() - startTime);
          return cachedResponse;
        }
      }

      // Seleccionar proveedor
      const provider = await this.selectProvider(request);
      
      // Verificar circuit breaker
      if (this.isCircuitBreakerOpen(provider)) {
        throw new Error(`Circuit breaker open for provider: ${provider}`);
      }

      // Generar respuesta
      const response = await this.callProvider(provider, request, requestId);
      
      // Cachear respuesta
      if (this.config.cacheEnabled) {
        await this.cacheResponse(request, response);
      }

      // Registrar métricas
      const duration = Date.now() - startTime;
      metrics.recordLLMRequest(provider, 'success', duration);
      metrics.recordLLMUsage(provider, response.usage.totalTokens, response.usage.cost);

      logger.info('Generación de texto LLM completada', {
        requestId,
        provider,
        model: response.model,
        tokens: response.usage.totalTokens,
        cost: response.usage.cost,
        latency: duration
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const provider = request.provider || 'unknown';
      
      // Registrar fallo en circuit breaker
      this.recordFailure(provider);
      
      metrics.recordLLMRequest(provider, 'error', duration);
      logger.error('Error en generación de texto LLM', {
        requestId,
        provider,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      throw error;
    }
  }

  private async selectProvider(request: LLMRequest): Promise<string> {
    if (request.provider && this.providers.has(request.provider)) {
      return request.provider;
    }

    // Selección inteligente basada en modelo solicitado
    const model = request.model?.toLowerCase() || '';
    
    if (model.includes('gpt') || model.includes('openai')) {
      return 'openai';
    } else if (model.includes('claude') || model.includes('anthropic')) {
      return 'anthropic';
    } else if (model.includes('cohere') || model.includes('command')) {
      return 'cohere';
    }

    // Selección por disponibilidad y rendimiento
    const availableProviders = Array.from(this.providers.keys());
    if (availableProviders.length === 0) {
      throw new Error('No LLM providers available');
    }

    // Seleccionar el proveedor con mejor rendimiento
    return availableProviders[0];
  }

  private async callProvider(provider: string, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const startTime = Date.now();
    
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(request, requestId);
      case 'anthropic':
        return await this.callAnthropic(request, requestId);
      case 'cohere':
        return await this.callCohere(request, requestId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async callOpenAI(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const openai = this.providers.get('openai');
    const model = request.model || 'gpt-4';
    
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop,
    });

    const usage = completion.usage;
    const cost = this.calculateCost('openai', model, usage.total_tokens);

    return {
      id: requestId,
      content: completion.choices[0].message.content || '',
      model,
      provider: 'openai',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost
      },
      metadata: {
        latency: Date.now() - Date.now(),
        timestamp: Date.now(),
        sessionId: request.sessionId,
        userId: request.userId
      }
    };
  }

  private async callAnthropic(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const anthropic = this.providers.get('anthropic');
    const model = request.model || 'claude-3-sonnet-20240229';
    
    const message = await anthropic.messages.create({
      model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature,
      top_p: request.topP,
      messages: [{ role: 'user', content: request.prompt }],
    });

    const usage = message.usage;
    const cost = this.calculateCost('anthropic', model, usage.input_tokens + usage.output_tokens);

    return {
      id: requestId,
      content: message.content[0].text,
      model,
      provider: 'anthropic',
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost
      },
      metadata: {
        latency: Date.now() - Date.now(),
        timestamp: Date.now(),
        sessionId: request.sessionId,
        userId: request.userId
      }
    };
  }

  private async callCohere(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const cohere = this.providers.get('cohere');
    const model = request.model || 'command';
    
    const response = await cohere.generate({
      model,
      prompt: request.prompt,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop_sequences: request.stop,
    });

    const usage = response.meta;
    const cost = this.calculateCost('cohere', model, usage.billed_units.input_tokens + usage.billed_units.output_tokens);

    return {
      id: requestId,
      content: response.generations[0].text,
      model,
      provider: 'cohere',
      usage: {
        promptTokens: usage.billed_units.input_tokens,
        completionTokens: usage.billed_units.output_tokens,
        totalTokens: usage.billed_units.input_tokens + usage.billed_units.output_tokens,
        cost
      },
      metadata: {
        latency: Date.now() - Date.now(),
        timestamp: Date.now(),
        sessionId: request.sessionId,
        userId: request.userId
      }
    };
  }

  private calculateCost(provider: string, model: string, tokens: number): number {
    // Precios aproximados por 1K tokens (actualizar según precios reales)
    const pricing: Record<string, Record<string, { input: number; output: number }>> = {
      openai: {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      },
      anthropic: {
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
      },
      cohere: {
        'command': { input: 0.0015, output: 0.002 },
        'command-light': { input: 0.0005, output: 0.001 },
      }
    };

    const modelPricing = pricing[provider]?.[model] || pricing[provider]?.[Object.keys(pricing[provider] || {})[0]];
    if (!modelPricing) return 0;

    // Asumir 80% input, 20% output para cálculo aproximado
    const inputTokens = Math.floor(tokens * 0.8);
    const outputTokens = tokens - inputTokens;
    
    return (inputTokens * modelPricing.input + outputTokens * modelPricing.output) / 1000;
  }

  private async getCachedResponse(request: LLMRequest): Promise<LLMResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheResponse(request: LLMRequest, response: LLMResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    await this.redis.set(cacheKey, JSON.stringify(response), this.config.cacheTTL);
  }

  private generateCacheKey(request: LLMRequest): string {
    const keyData = {
      prompt: request.prompt,
      model: request.model,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      provider: request.provider
    };
    return `llm:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private isCircuitBreakerOpen(provider: string): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      if (timeSinceLastFailure > this.config.circuitBreaker.recoveryTimeout) {
        breaker.state = 'half_open';
        return false;
      }
      return true;
    }

    return false;
  }

  private recordFailure(provider: string): void {
    const breaker = this.circuitBreakers.get(provider) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
      breaker.state = 'open';
    }

    this.circuitBreakers.set(provider, breaker);
  }

  public async getProviders(): Promise<LLMProvider[]> {
    const providers: LLMProvider[] = [];
    
    if (this.providers.has('openai')) {
      providers.push({
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        maxTokens: 8192,
        costPerToken: 0.03,
        latency: 1000,
        reliability: 0.99
      });
    }

    if (this.providers.has('anthropic')) {
      providers.push({
        id: 'anthropic',
        name: 'Anthropic',
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        maxTokens: 200000,
        costPerToken: 0.003,
        latency: 1500,
        reliability: 0.98
      });
    }

    if (this.providers.has('cohere')) {
      providers.push({
        id: 'cohere',
        name: 'Cohere',
        models: ['command', 'command-light'],
        maxTokens: 4096,
        costPerToken: 0.0015,
        latency: 800,
        reliability: 0.97
      });
    }

    return providers;
  }

  public async getCircuitBreakerStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    
    for (const [provider, breaker] of this.circuitBreakers.entries()) {
      status[provider] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure,
        timeSinceLastFailure: Date.now() - breaker.lastFailure
      };
    }

    return status;
  }

  public async clearCache(): Promise<void> {
    const keys = await this.redis.keys('llm:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info('Cache de LLM limpiado', { keysCount: keys.length });
    }
  }
}

export default LLMGatewayService;