import Anthropic from '@anthropic-ai/sdk';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMError, 
  ProviderConfig,
  Usage 
} from '../types/llm.types';
import { logger } from '../utils/logger';

export class AnthropicProvider {
  private client: Anthropic;
  private config: ProviderConfig;
  private models: string[];

  constructor(config: ProviderConfig) {
    this.config = config;
    this.models = config.models || ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: 3,
    });
    
    logger.info(`Anthropic provider initialized with models: ${this.models.join(', ')}`);
  }

  /**
   * Procesar solicitud con Anthropic
   */
  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Validar modelo
      if (!this.models.includes(request.model)) {
        throw new Error(`Model ${request.model} not supported. Available models: ${this.models.join(', ')}`);
      }

      // Preparar mensajes
      const messages = this.prepareMessages(request);

      // Configurar opciones
      const options: any = {
        model: request.model,
        messages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        top_k: request.topK || 40,
      };

      // Agregar opciones opcionales
      if (request.stream) {
        options.stream = true;
      }

      if (request.systemMessage) {
        options.system = request.systemMessage;
      }

      // Realizar llamada a la API
      const response = await this.client.messages.create(options);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Procesar respuesta
      const result: LLMResponse = {
        id: response.id,
        provider: 'anthropic',
        model: response.model,
        content: this.extractContent(response),
        usage: this.calculateUsage(response.usage),
        finishReason: response.stop_reason || 'stop',
        responseTime,
        timestamp: new Date().toISOString(),
        metadata: {
          type: response.type,
          role: response.role,
        }
      };

      logger.info(`Anthropic request completed in ${responseTime}ms`, {
        model: request.model,
        tokens: response.usage?.input_tokens + response.usage?.output_tokens,
        finishReason: result.finishReason
      });

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      logger.error('Anthropic request failed:', {
        error: error.message,
        model: request.model,
        responseTime
      });

      const llmError: LLMError = {
        provider: 'anthropic',
        model: request.model,
        error: {
          type: this.mapErrorType(error),
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          details: error.details || error.response?.data || error
        },
        responseTime,
        timestamp: new Date().toISOString()
      };

      throw llmError;
    }
  }

  /**
   * Preparar mensajes para Anthropic
   */
  private prepareMessages(request: LLMRequest): any[] {
    const messages: any[] = [];

    // Agregar mensajes del usuario
    if (Array.isArray(request.messages)) {
      messages.push(...request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })));
    } else if (request.messages) {
      messages.push({
        role: 'user',
        content: request.messages
      });
    }

    return messages;
  }

  /**
   * Extraer contenido de la respuesta
   */
  private extractContent(response: any): string {
    if (response.content && response.content.length > 0) {
      // Anthropic devuelve un array de content blocks
      return response.content
        .map((block: any) => block.text || block.content || '')
        .join('');
    }
    return '';
  }

  /**
   * Calcular uso de tokens
   */
  private calculateUsage(usage: any): Usage {
    return {
      promptTokens: usage?.input_tokens || 0,
      completionTokens: usage?.output_tokens || 0,
      totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      cost: this.calculateCost(usage)
    };
  }

  /**
   * Calcular costo basado en el uso
   */
  private calculateCost(usage: any): number {
    if (!usage || !this.config.pricing) return 0;

    const inputCost = (usage.input_tokens / 1000) * this.config.pricing.input;
    const outputCost = (usage.output_tokens / 1000) * this.config.pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Mapear tipos de error de Anthropic
   */
  private mapErrorType(error: any): string {
    if (error.type === 'insufficient_quota') return 'QUOTA_EXCEEDED';
    if (error.type === 'rate_limit_exceeded') return 'RATE_LIMIT_EXCEEDED';
    if (error.type === 'invalid_api_key') return 'AUTHENTICATION_ERROR';
    if (error.type === 'model_not_found') return 'MODEL_NOT_FOUND';
    if (error.type === 'context_length_exceeded') return 'CONTEXT_LENGTH_EXCEEDED';
    if (error.type === 'content_filter') return 'CONTENT_FILTER';
    
    return 'API_ERROR';
  }

  /**
   * Verificar salud del proveedor
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Intentar una llamada simple para verificar conectividad
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return response.stop_reason === 'end_turn';
    } catch (error) {
      logger.error('Anthropic health check failed:', error);
      return false;
    }
  }

  /**
   * Obtener modelos disponibles
   */
  getAvailableModels(): string[] {
    return this.models;
  }

  /**
   * Obtener configuración del proveedor
   */
  getConfig(): ProviderConfig {
    return this.config;
  }
} 