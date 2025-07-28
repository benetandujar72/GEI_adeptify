import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMError, 
  ProviderConfig,
  Usage 
} from '../types/llm.types';
import { logger } from '../utils/logger';

export class GoogleProvider {
  private client: GoogleGenerativeAI;
  private config: ProviderConfig;
  private models: string[];

  constructor(config: ProviderConfig) {
    this.config = config;
    this.models = config.models || ['gemini-pro', 'gemini-pro-vision'];
    
    this.client = new GoogleGenerativeAI(config.apiKey);
    
    logger.info(`Google provider initialized with models: ${this.models.join(', ')}`);
  }

  /**
   * Procesar solicitud con Google Gemini
   */
  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Validar modelo
      if (!this.models.includes(request.model)) {
        throw new Error(`Model ${request.model} not supported. Available models: ${this.models.join(', ')}`);
      }

      // Obtener modelo
      const model = this.client.getGenerativeModel({ model: request.model });

      // Preparar contenido
      const content = this.prepareContent(request);

      // Configurar opciones de generación
      const generationConfig = {
        temperature: request.temperature || 0.7,
        topP: request.topP || 1,
        topK: request.topK || 40,
        maxOutputTokens: request.maxTokens || 1000,
      };

      // Realizar llamada a la API
      const result = await model.generateContent({
        contents: content,
        generationConfig,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Procesar respuesta
      const response = result.response;
      const text = response.text();

      const llmResponse: LLMResponse = {
        id: result.response.responseId || `google-${Date.now()}`,
        provider: 'google',
        model: request.model,
        content: text,
        usage: this.calculateUsage(result.response),
        finishReason: this.mapFinishReason(result.response.finishReason),
        responseTime,
        timestamp: new Date().toISOString(),
        metadata: {
          promptFeedback: result.response.promptFeedback,
          candidates: result.response.candidates?.length || 0,
        }
      };

      logger.info(`Google request completed in ${responseTime}ms`, {
        model: request.model,
        finishReason: llmResponse.finishReason
      });

      return llmResponse;

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      logger.error('Google request failed:', {
        error: error.message,
        model: request.model,
        responseTime
      });

      const llmError: LLMError = {
        provider: 'google',
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
   * Preparar contenido para Google Gemini
   */
  private prepareContent(request: LLMRequest): any[] {
    const contents: any[] = [];

    // Agregar mensaje del sistema si existe
    if (request.systemMessage) {
      contents.push({
        role: 'user',
        parts: [{ text: request.systemMessage }]
      });
    }

    // Agregar mensajes del usuario
    if (Array.isArray(request.messages)) {
      request.messages.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });
    } else if (request.messages) {
      contents.push({
        role: 'user',
        parts: [{ text: request.messages }]
      });
    }

    return contents;
  }

  /**
   * Calcular uso de tokens (Google no proporciona información detallada de tokens)
   */
  private calculateUsage(response: any): Usage {
    // Google no proporciona información detallada de tokens en la respuesta
    // Podemos estimar basándonos en el texto generado
    const estimatedTokens = Math.ceil(response.text().length / 4); // Estimación aproximada
    
    return {
      promptTokens: 0, // No disponible en Google
      completionTokens: estimatedTokens,
      totalTokens: estimatedTokens,
      cost: this.calculateCost(estimatedTokens)
    };
  }

  /**
   * Calcular costo basado en el uso estimado
   */
  private calculateCost(estimatedTokens: number): number {
    if (!this.config.pricing) return 0;

    // Google cobra por caracteres generados, no por tokens
    // Estimación aproximada: 1 token ≈ 4 caracteres
    const estimatedChars = estimatedTokens * 4;
    const costPerChar = this.config.pricing.output / 1000; // Convertir a costo por carácter
    
    return estimatedChars * costPerChar;
  }

  /**
   * Mapear finish reason de Google
   */
  private mapFinishReason(finishReason: any): string {
    switch (finishReason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      case 'RECITATION':
        return 'recitation';
      default:
        return 'stop';
    }
  }

  /**
   * Mapear tipos de error de Google
   */
  private mapErrorType(error: any): string {
    if (error.message?.includes('quota')) return 'QUOTA_EXCEEDED';
    if (error.message?.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
    if (error.message?.includes('API key')) return 'AUTHENTICATION_ERROR';
    if (error.message?.includes('model not found')) return 'MODEL_NOT_FOUND';
    if (error.message?.includes('content filter')) return 'CONTENT_FILTER';
    if (error.message?.includes('safety')) return 'SAFETY_FILTER';
    
    return 'API_ERROR';
  }

  /**
   * Verificar salud del proveedor
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Intentar una llamada simple para verificar conectividad
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent('Hello');
      
      return result.response.text().length > 0;
    } catch (error) {
      logger.error('Google health check failed:', error);
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