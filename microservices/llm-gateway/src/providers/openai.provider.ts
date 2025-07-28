import OpenAI from 'openai';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMError, 
  ProviderConfig,
  Usage 
} from '../types/llm.types';
import { logger } from '../utils/logger';

export class OpenAIProvider {
  private client: OpenAI;
  private config: ProviderConfig;
  private models: string[];

  constructor(config: ProviderConfig) {
    this.config = config;
    this.models = config.models || ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      maxRetries: 3,
      timeout: 60000, // 60 segundos
    });
    
    logger.info(`OpenAI provider initialized with models: ${this.models.join(', ')}`);
  }

  /**
   * Procesar solicitud con OpenAI
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
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
        top_p: request.topP || 1,
        frequency_penalty: request.frequencyPenalty || 0,
        presence_penalty: request.presencePenalty || 0,
      };

      // Agregar opciones opcionales
      if (request.stream) {
        options.stream = true;
      }

      if (request.tools && request.tools.length > 0) {
        options.tools = this.prepareTools(request.tools);
      }

      if (request.toolChoice) {
        options.tool_choice = request.toolChoice;
      }

      // Realizar llamada a la API
      const response = await this.client.chat.completions.create(options);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Procesar respuesta
      const result: LLMResponse = {
        id: response.id,
        provider: 'openai',
        model: response.model,
        content: this.extractContent(response),
        usage: this.calculateUsage(response.usage),
        finishReason: response.choices[0]?.finish_reason || 'stop',
        responseTime,
        timestamp: new Date().toISOString(),
        metadata: {
          systemFingerprint: response.system_fingerprint,
          object: response.object,
        }
      };

      logger.info(`OpenAI request completed in ${responseTime}ms`, {
        model: request.model,
        tokens: response.usage?.total_tokens,
        finishReason: result.finishReason
      });

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      logger.error('OpenAI request failed:', {
        error: error.message,
        model: request.model,
        responseTime
      });

      const llmError: LLMError = {
        provider: 'openai',
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
   * Preparar mensajes para OpenAI
   */
  private prepareMessages(request: LLMRequest): any[] {
    const messages: any[] = [];

    // Agregar mensaje del sistema si existe
    if (request.systemMessage) {
      messages.push({
        role: 'system',
        content: request.systemMessage
      });
    }

    // Agregar mensajes del usuario
    if (Array.isArray(request.messages)) {
      messages.push(...request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
        function_call: msg.functionCall,
        tool_calls: msg.toolCalls
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
   * Preparar herramientas para OpenAI
   */
  private prepareTools(tools: any[]): any[] {
    return tools.map(tool => ({
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }
    }));
  }

  /**
   * Extraer contenido de la respuesta
   */
  private extractContent(response: any): string {
    const choice = response.choices[0];
    if (!choice) return '';

    // Si hay contenido de mensaje
    if (choice.message?.content) {
      return choice.message.content;
    }

    // Si hay llamadas a herramientas
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      return JSON.stringify(choice.message.tool_calls);
    }

    // Si hay llamadas a funciones
    if (choice.message?.function_call) {
      return JSON.stringify(choice.message.function_call);
    }

    return '';
  }

  /**
   * Calcular uso de tokens
   */
  private calculateUsage(usage: any): Usage {
    return {
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      cost: this.calculateCost(usage)
    };
  }

  /**
   * Calcular costo basado en el uso
   */
  private calculateCost(usage: any): number {
    if (!usage || !this.config.pricing) return 0;

    const inputCost = (usage.prompt_tokens / 1000) * this.config.pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * this.config.pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Mapear tipos de error de OpenAI
   */
  private mapErrorType(error: any): string {
    if (error.code === 'insufficient_quota') return 'QUOTA_EXCEEDED';
    if (error.code === 'rate_limit_exceeded') return 'RATE_LIMIT_EXCEEDED';
    if (error.code === 'invalid_api_key') return 'AUTHENTICATION_ERROR';
    if (error.code === 'model_not_found') return 'MODEL_NOT_FOUND';
    if (error.code === 'context_length_exceeded') return 'CONTEXT_LENGTH_EXCEEDED';
    if (error.code === 'content_filter') return 'CONTENT_FILTER';
    
    return 'API_ERROR';
  }

  /**
   * Verificar salud del proveedor
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Intentar una llamada simple para verificar conectividad
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return response.choices[0]?.finish_reason === 'stop';
    } catch (error) {
      logger.error('OpenAI health check failed:', error);
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