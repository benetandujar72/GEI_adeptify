import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  LLMProvider, 
  ChatRequest, 
  CompletionRequest, 
  EmbeddingRequest, 
  BatchRequest,
  ChatResponse,
  CompletionResponse,
  EmbeddingResponse,
  BatchResponse,
  LLMError
} from '../types/llm';
import { llmProviderManager } from '../services/llm-providers';
import { cacheService } from '../services/cache';
import { costTrackingService } from '../services/cost-tracking';
import { logger } from '../utils/logger';

export class LLMController {
  async chat(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const request: ChatRequest = req.body;
      const userId = req.user?.id;

      logger.info('Chat request received', { requestId, userId, model: request.model, provider: request.provider });

      // Verificar cache si está habilitado
      if (request.cache !== false) {
        const cached = await cacheService.getChatResponse(request);
        if (cached) {
          logger.info('Cache hit for chat request', { requestId });
          res.json({
            success: true,
            data: cached,
            cached: true,
            response_time: Date.now() - startTime
          });
          return;
        }
      }

      // Determinar proveedor
      const provider = request.provider || this.selectProvider(request.model);
      const llmProvider = llmProviderManager.getProvider(provider);

      // Realizar request
      const response = await llmProvider.chat(request);

      // Guardar en cache si está habilitado
      if (request.cache !== false) {
        await cacheService.setChatResponse(request, response);
      }

      // Registrar costo si está habilitado
      if (request.cost_tracking !== false) {
        await costTrackingService.recordCost(response, userId, requestId);
      }

      const responseTime = Date.now() - startTime;
      logger.info('Chat request completed', { requestId, responseTime, provider: response.provider });

      res.json({
        success: true,
        data: response,
        cached: false,
        response_time: responseTime
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Chat request failed', { requestId, error: error.message, responseTime });

      if (error.provider) {
        const llmError = error as LLMError;
        res.status(llmError.statusCode).json({
          success: false,
          error: {
            message: llmError.message,
            code: llmError.code,
            provider: llmError.provider,
            retryable: llmError.retryable
          },
          response_time: responseTime
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          },
          response_time: responseTime
        });
      }
    }
  }

  async completion(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const request: CompletionRequest = req.body;
      const userId = req.user?.id;

      logger.info('Completion request received', { requestId, userId, model: request.model, provider: request.provider });

      // Verificar cache si está habilitado
      if (request.cache !== false) {
        const cached = await cacheService.getCompletionResponse(request);
        if (cached) {
          logger.info('Cache hit for completion request', { requestId });
          res.json({
            success: true,
            data: cached,
            cached: true,
            response_time: Date.now() - startTime
          });
          return;
        }
      }

      // Determinar proveedor
      const provider = request.provider || this.selectProvider(request.model);
      const llmProvider = llmProviderManager.getProvider(provider);

      // Realizar request
      const response = await llmProvider.completion(request);

      // Guardar en cache si está habilitado
      if (request.cache !== false) {
        await cacheService.setCompletionResponse(request, response);
      }

      // Registrar costo si está habilitado
      if (request.cost_tracking !== false) {
        await costTrackingService.recordCost(response, userId, requestId);
      }

      const responseTime = Date.now() - startTime;
      logger.info('Completion request completed', { requestId, responseTime, provider: response.provider });

      res.json({
        success: true,
        data: response,
        cached: false,
        response_time: responseTime
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Completion request failed', { requestId, error: error.message, responseTime });

      if (error.provider) {
        const llmError = error as LLMError;
        res.status(llmError.statusCode).json({
          success: false,
          error: {
            message: llmError.message,
            code: llmError.code,
            provider: llmError.provider,
            retryable: llmError.retryable
          },
          response_time: responseTime
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          },
          response_time: responseTime
        });
      }
    }
  }

  async embedding(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const request: EmbeddingRequest = req.body;
      const userId = req.user?.id;

      logger.info('Embedding request received', { requestId, userId, model: request.model, provider: request.provider });

      // Verificar cache si está habilitado
      if (request.cache !== false) {
        const cached = await cacheService.getEmbeddingResponse(request);
        if (cached) {
          logger.info('Cache hit for embedding request', { requestId });
          res.json({
            success: true,
            data: cached,
            cached: true,
            response_time: Date.now() - startTime
          });
          return;
        }
      }

      // Determinar proveedor
      const provider = request.provider || this.selectProvider(request.model);
      const llmProvider = llmProviderManager.getProvider(provider);

      // Realizar request
      const response = await llmProvider.embedding(request);

      // Guardar en cache si está habilitado
      if (request.cache !== false) {
        await cacheService.setEmbeddingResponse(request, response);
      }

      // Registrar costo si está habilitado
      if (request.cost_tracking !== false) {
        await costTrackingService.recordCost(response, userId, requestId);
      }

      const responseTime = Date.now() - startTime;
      logger.info('Embedding request completed', { requestId, responseTime, provider: response.provider });

      res.json({
        success: true,
        data: response,
        cached: false,
        response_time: responseTime
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Embedding request failed', { requestId, error: error.message, responseTime });

      if (error.provider) {
        const llmError = error as LLMError;
        res.status(llmError.statusCode).json({
          success: false,
          error: {
            message: llmError.message,
            code: llmError.code,
            provider: llmError.provider,
            retryable: llmError.retryable
          },
          response_time: responseTime
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          },
          response_time: responseTime
        });
      }
    }
  }

  async batch(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const request: BatchRequest = req.body;
      const userId = req.user?.id;

      logger.info('Batch request received', { requestId, userId, count: request.requests.length });

      const responses: Array<ChatResponse | CompletionResponse | EmbeddingResponse> = [];
      let totalCost = 0;
      let totalTokens = 0;

      if (request.parallel) {
        // Procesar en paralelo
        const promises = request.requests.map(async (req) => {
          try {
            if ('messages' in req) {
              return await this.processChatRequest(req as ChatRequest, userId, request.cache, request.cost_tracking);
            } else if ('prompt' in req) {
              return await this.processCompletionRequest(req as CompletionRequest, userId, request.cache, request.cost_tracking);
            } else {
              return await this.processEmbeddingRequest(req as EmbeddingRequest, userId, request.cache, request.cost_tracking);
            }
          } catch (error) {
            logger.error('Error in batch request item:', error);
            throw error;
          }
        });

        const results = await Promise.all(promises);
        responses.push(...results);
      } else {
        // Procesar secuencialmente
        for (const req of request.requests) {
          try {
            let response: ChatResponse | CompletionResponse | EmbeddingResponse;
            
            if ('messages' in req) {
              response = await this.processChatRequest(req as ChatRequest, userId, request.cache, request.cost_tracking);
            } else if ('prompt' in req) {
              response = await this.processCompletionRequest(req as CompletionRequest, userId, request.cache, request.cost_tracking);
            } else {
              response = await this.processEmbeddingRequest(req as EmbeddingRequest, userId, request.cache, request.cost_tracking);
            }
            
            responses.push(response);
          } catch (error) {
            logger.error('Error in batch request item:', error);
            throw error;
          }
        }
      }

      // Calcular totales
      responses.forEach(response => {
        totalCost += response.cost.amount;
        totalTokens += response.usage.total_tokens;
      });

      const responseTime = Date.now() - startTime;
      const batchResponse: BatchResponse = {
        responses,
        total_cost: {
          amount: totalCost,
          currency: 'USD'
        },
        total_tokens: totalTokens,
        response_time: responseTime
      };

      logger.info('Batch request completed', { requestId, responseTime, totalCost, totalTokens });

      res.json({
        success: true,
        data: batchResponse,
        response_time: responseTime
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Batch request failed', { requestId, error: error.message, responseTime });

      res.status(500).json({
        success: false,
        error: {
          message: 'Batch request failed',
          code: 'BATCH_ERROR',
          details: error.message
        },
        response_time: responseTime
      });
    }
  }

  private async processChatRequest(request: ChatRequest, userId?: string, cache?: boolean, costTracking?: boolean): Promise<ChatResponse> {
    const provider = request.provider || this.selectProvider(request.model);
    const llmProvider = llmProviderManager.getProvider(provider);
    return await llmProvider.chat(request);
  }

  private async processCompletionRequest(request: CompletionRequest, userId?: string, cache?: boolean, costTracking?: boolean): Promise<CompletionResponse> {
    const provider = request.provider || this.selectProvider(request.model);
    const llmProvider = llmProviderManager.getProvider(provider);
    return await llmProvider.completion(request);
  }

  private async processEmbeddingRequest(request: EmbeddingRequest, userId?: string, cache?: boolean, costTracking?: boolean): Promise<EmbeddingResponse> {
    const provider = request.provider || this.selectProvider(request.model);
    const llmProvider = llmProviderManager.getProvider(provider);
    return await llmProvider.embedding(request);
  }

  private selectProvider(model: string): LLMProvider {
    // Lógica simple de selección de proveedor basada en el modelo
    if (model.startsWith('gpt-')) return LLMProvider.OPENAI;
    if (model.startsWith('claude-')) return LLMProvider.ANTHROPIC;
    if (model.startsWith('gemini-')) return LLMProvider.GOOGLE;
    
    // Fallback al primer proveedor disponible
    const availableProviders = llmProviderManager.getAvailableProviders();
    if (availableProviders.length > 0) {
      return availableProviders[0];
    }
    
    throw new Error('No providers available');
  }

  // Provider management
  async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = llmProviderManager.getAvailableProviders();
      res.json({
        success: true,
        data: {
          providers,
          count: providers.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'PROVIDER_ERROR'
        }
      });
    }
  }

  async testProvider(req: Request, res: Response): Promise<void> {
    try {
      const provider = req.params.provider as LLMProvider;
      const isHealthy = await llmProviderManager.testProvider(provider);
      
      res.json({
        success: true,
        data: {
          provider,
          healthy: isHealthy
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'PROVIDER_TEST_ERROR'
        }
      });
    }
  }

  // Model information
  async getModels(req: Request, res: Response): Promise<void> {
    try {
      const models = [
        // OpenAI models
        { name: 'gpt-4', provider: LLMProvider.OPENAI, type: 'chat' },
        { name: 'gpt-4-turbo', provider: LLMProvider.OPENAI, type: 'chat' },
        { name: 'gpt-3.5-turbo', provider: LLMProvider.OPENAI, type: 'chat' },
        { name: 'text-embedding-ada-002', provider: LLMProvider.OPENAI, type: 'embedding' },
        
        // Anthropic models
        { name: 'claude-3-opus', provider: LLMProvider.ANTHROPIC, type: 'chat' },
        { name: 'claude-3-sonnet', provider: LLMProvider.ANTHROPIC, type: 'chat' },
        { name: 'claude-3-haiku', provider: LLMProvider.ANTHROPIC, type: 'chat' },
        
        // Google models
        { name: 'gemini-pro', provider: LLMProvider.GOOGLE, type: 'chat' },
        { name: 'gemini-pro-vision', provider: LLMProvider.GOOGLE, type: 'chat' },
        { name: 'embedding-001', provider: LLMProvider.GOOGLE, type: 'embedding' }
      ];

      res.json({
        success: true,
        data: {
          models,
          count: models.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'MODEL_ERROR'
        }
      });
    }
  }

  async getModelsByProvider(req: Request, res: Response): Promise<void> {
    try {
      const provider = req.params.provider as LLMProvider;
      const allModels = [
        // OpenAI models
        { name: 'gpt-4', provider: LLMProvider.OPENAI, type: 'chat' },
        { name: 'gpt-4-turbo', provider: LLMProvider.OPENAI, type: 'chat' },
        { name: 'gpt-3.5-turbo', provider: LLMProvider.OPENAI, type: 'chat' },
        { name: 'text-embedding-ada-002', provider: LLMProvider.OPENAI, type: 'embedding' },
        
        // Anthropic models
        { name: 'claude-3-opus', provider: LLMProvider.ANTHROPIC, type: 'chat' },
        { name: 'claude-3-sonnet', provider: LLMProvider.ANTHROPIC, type: 'chat' },
        { name: 'claude-3-haiku', provider: LLMProvider.ANTHROPIC, type: 'chat' },
        
        // Google models
        { name: 'gemini-pro', provider: LLMProvider.GOOGLE, type: 'chat' },
        { name: 'gemini-pro-vision', provider: LLMProvider.GOOGLE, type: 'chat' },
        { name: 'embedding-001', provider: LLMProvider.GOOGLE, type: 'embedding' }
      ];

      const models = allModels.filter(model => model.provider === provider);

      res.json({
        success: true,
        data: {
          provider,
          models,
          count: models.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'MODEL_ERROR'
        }
      });
    }
  }

  // Cost tracking
  async getCostSummary(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as 'daily' | 'monthly') || 'daily';
      const userId = req.query.userId as string || req.user?.id;
      
      const summary = await costTrackingService.getCostSummary(period, userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'COST_ERROR'
        }
      });
    }
  }

  async getCostHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || req.user?.id;
      const days = parseInt(req.query.days as string) || 30;
      
      const history = await costTrackingService.getCostHistory(userId, days);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'COST_ERROR'
        }
      });
    }
  }

  async getTopUsers(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as 'daily' | 'monthly') || 'daily';
      const limit = parseInt(req.query.limit as string) || 10;
      
      const users = await costTrackingService.getTopUsers(period, limit);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'COST_ERROR'
        }
      });
    }
  }

  // Cache management
  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = cacheService.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'CACHE_ERROR'
        }
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      await cacheService.clear();
      
      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'CACHE_ERROR'
        }
      });
    }
  }

  async invalidateCache(req: Request, res: Response): Promise<void> {
    try {
      const pattern = req.params.pattern;
      await cacheService.invalidate(pattern);
      
      res.json({
        success: true,
        message: `Cache invalidated for pattern: ${pattern}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'CACHE_ERROR'
        }
      });
    }
  }
}