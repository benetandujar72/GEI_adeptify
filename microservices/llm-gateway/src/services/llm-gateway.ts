import { createClient } from 'redis';
import winston from 'winston';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import NodeCache from 'node-cache';
import _ from 'lodash';

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configurar Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Configurar cache
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hora

// Configurar proveedores de LLM
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interfaces
interface LLMRequest {
  provider: 'anthropic' | 'google' | 'openai';
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  sessionId?: string;
}

interface LLMResponse {
  id: string;
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
  cached: boolean;
  timestamp: Date;
}

interface ProviderConfig {
  name: string;
  models: string[];
  maxTokens: number;
  temperature: number;
}

class LLMGatewayService {
  private providers: Map<string, ProviderConfig> = new Map();
  private requestCount = 0;
  private errorCount = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    this.providers.set('anthropic', {
      name: 'Anthropic Claude',
      models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
      maxTokens: 4096,
      temperature: 0.7
    });

    this.providers.set('google', {
      name: 'Google Gemini',
      models: ['gemini-pro', 'gemini-pro-vision'],
      maxTokens: 2048,
      temperature: 0.7
    });

    this.providers.set('openai', {
      name: 'OpenAI GPT',
      models: ['gpt-4', 'gpt-3.5-turbo'],
      maxTokens: 4096,
      temperature: 0.7
    });
  }

  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Verificar cache
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = cache.get(cacheKey);
      
      if (cachedResponse) {
        logger.info(Cache hit for request: );
        return {
          ...cachedResponse,
          id: requestId,
          cached: true,
          timestamp: new Date()
        } as LLMResponse;
      }

      // Procesar request
      let response: LLMResponse;
      
      switch (request.provider) {
        case 'anthropic':
          response = await this.processAnthropicRequest(request, requestId);
          break;
        case 'google':
          response = await this.processGoogleRequest(request, requestId);
          break;
        case 'openai':
          response = await this.processOpenAIRequest(request, requestId);
          break;
        default:
          throw new Error(Unsupported provider: );
      }

      response.processingTime = Date.now() - startTime;
      response.cached = false;
      response.timestamp = new Date();

      // Guardar en cache
      cache.set(cacheKey, response);

      // Actualizar métricas
      this.requestCount++;
      await this.updateMetrics(request.provider, response.processingTime);

      logger.info(Processed LLM request: , provider: , time: ms);
      
      return response;

    } catch (error) {
      this.errorCount++;
      logger.error(Failed to process LLM request: , error);
      throw error;
    }
  }

  private async processAnthropicRequest(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const model = request.model || 'claude-3-sonnet-20240229';
    const maxTokens = request.maxTokens || 4096;
    const temperature = request.temperature || 0.7;

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: request.prompt }]
    });

    return {
      id: requestId,
      content: response.content[0].text,
      provider: 'anthropic',
      model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      processingTime: 0,
      cached: false,
      timestamp: new Date()
    };
  }

  private async processGoogleRequest(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const model = request.model || 'gemini-pro';
    const maxTokens = request.maxTokens || 2048;
    const temperature = request.temperature || 0.7;

    const geminiModel = genAI.getGenerativeModel({ model });
    
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature
      }
    });

    const response = await result.response;
    const text = response.text();

    return {
      id: requestId,
      content: text,
      provider: 'google',
      model,
      usage: {
        promptTokens: 0, // Google no proporciona tokens exactos
        completionTokens: text.length,
        totalTokens: text.length
      },
      processingTime: 0,
      cached: false,
      timestamp: new Date()
    };
  }

  private async processOpenAIRequest(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const model = request.model || 'gpt-3.5-turbo';
    const maxTokens = request.maxTokens || 4096;
    const temperature = request.temperature || 0.7;

    const response = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: request.prompt }]
    });

    return {
      id: requestId,
      content: response.choices[0].message.content || '',
      provider: 'openai',
      model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      processingTime: 0,
      cached: false,
      timestamp: new Date()
    };
  }

  private generateRequestId(): string {
    return llm__;
  }

  private generateCacheKey(request: LLMRequest): string {
    return llm:::;
  }

  private async updateMetrics(provider: string, processingTime: number): Promise<void> {
    const metricsKey = llm:metrics:;
    const metrics = await redisClient.get(metricsKey);
    
    const currentMetrics = metrics ? JSON.parse(metrics) : {
      requestCount: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      lastUpdated: new Date().toISOString()
    };

    currentMetrics.requestCount++;
    currentMetrics.totalProcessingTime += processingTime;
    currentMetrics.averageProcessingTime = currentMetrics.totalProcessingTime / currentMetrics.requestCount;
    currentMetrics.lastUpdated = new Date().toISOString();

    await redisClient.setEx(metricsKey, 86400, JSON.stringify(currentMetrics)); // 24 horas TTL
  }

  async getHealthStatus(): Promise<Record<string, any>> {
    return {
      status: 'healthy',
      service: 'llm-gateway',
      providers: Array.from(this.providers.keys()),
      metrics: {
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
      },
      cache: {
        size: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses
      },
      timestamp: new Date().toISOString()
    };
  }

  async getProviderStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    
    for (const [provider, config] of this.providers) {
      const metricsKey = llm:metrics:;
      const metrics = await redisClient.get(metricsKey);
      
      status[provider] = {
        name: config.name,
        models: config.models,
        metrics: metrics ? JSON.parse(metrics) : {}
      };
    }

    return status;
  }

  async clearCache(): Promise<void> {
    cache.flushAll();
    logger.info('LLM Gateway cache cleared');
  }
}

export default new LLMGatewayService();
