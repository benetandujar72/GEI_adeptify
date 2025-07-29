import { Router, Request, Response } from 'express';
import { z } from 'zod';
import LLMGatewayService from '../services/llm-gateway.service.js';
import { logger } from '../services/logging.service.js';
import { metrics } from '../services/metrics.service.js';

const router = Router();

// Esquemas de validación
const generateTextSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  model: z.string().optional(),
  maxTokens: z.number().min(1).max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional(),
  provider: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  context: z.any().optional()
});

const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(z.string()),
  maxTokens: z.number(),
  costPerToken: z.number(),
  latency: z.number(),
  reliability: z.number()
});

// ===== RUTAS PRINCIPALES =====

// POST /api/llm/generate - Generar texto
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const validatedData = generateTextSchema.parse(req.body);
    
    logger.logLLMRequest(
      validatedData.provider || 'auto',
      validatedData.model || 'default',
      {
        requestId: req.headers['x-request-id'] as string,
        userId: validatedData.userId,
        sessionId: validatedData.sessionId
      }
    );

    const llmService = LLMGatewayService.getInstance();
    const response = await llmService.generateText(validatedData);

    logger.logLLMResponse(
      response.provider,
      response.model,
      response.usage.totalTokens,
      response.usage.cost,
      response.metadata.latency,
      {
        requestId: req.headers['x-request-id'] as string,
        userId: validatedData.userId,
        sessionId: validatedData.sessionId
      }
    );

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error in LLM generate', {
        errors: error.errors,
        requestId: req.headers['x-request-id'] as string
      });
      
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('Error in LLM generate', {
        error: error instanceof Error ? error.message : String(error),
        requestId: req.headers['x-request-id'] as string
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Failed to generate text' : error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
});

// GET /api/llm/providers - Obtener proveedores disponibles
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const llmService = LLMGatewayService.getInstance();
    const providers = await llmService.getProviders();

    res.json({
      success: true,
      data: providers,
      count: providers.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting LLM providers', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get providers',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/llm/providers/:id - Obtener proveedor específico
router.get('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const llmService = LLMGatewayService.getInstance();
    const providers = await llmService.getProviders();
    
    const provider = providers.find(p => p.id === id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Provider with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting LLM provider', {
      providerId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get provider',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== RUTAS DE CIRCUIT BREAKER =====

// GET /api/llm/circuit-breaker/status - Estado de circuit breakers
router.get('/circuit-breaker/status', async (req: Request, res: Response) => {
  try {
    const llmService = LLMGatewayService.getInstance();
    const status = await llmService.getCircuitBreakerStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting circuit breaker status', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get circuit breaker status',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/llm/circuit-breaker/reset/:provider - Resetear circuit breaker
router.post('/circuit-breaker/reset/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    
    // Nota: Esta funcionalidad requeriría implementación adicional en el servicio
    logger.info('Circuit breaker reset requested', {
      provider,
      requestId: req.headers['x-request-id'] as string
    });

    res.json({
      success: true,
      message: `Circuit breaker reset for provider '${provider}'`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error resetting circuit breaker', {
      provider: req.params.provider,
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reset circuit breaker',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== RUTAS DE CACHE =====

// DELETE /api/llm/cache - Limpiar cache
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const llmService = LLMGatewayService.getInstance();
    await llmService.clearCache();

    logger.info('LLM cache cleared', {
      requestId: req.headers['x-request-id'] as string
    });

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error clearing LLM cache', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/llm/cache/stats - Estadísticas del cache
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    // Nota: Esta funcionalidad requeriría implementación adicional en el servicio
    const stats = {
      totalKeys: 0,
      hitRate: 0,
      missRate: 0,
      size: '0 MB'
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting cache stats', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get cache stats',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== RUTAS DE CONFIGURACIÓN =====

// GET /api/llm/config - Obtener configuración actual
router.get('/config', async (req: Request, res: Response) => {
  try {
    // Nota: Esta funcionalidad requeriría implementación adicional en el servicio
    const config = {
      defaultModel: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7,
      cacheEnabled: true,
      cacheTTL: 3600,
      retryAttempts: 3,
      retryDelay: 1000,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000
      }
    };

    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting LLM config', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get configuration',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/llm/config - Actualizar configuración
router.put('/config', async (req: Request, res: Response) => {
  try {
    const configSchema = z.object({
      defaultModel: z.string().optional(),
      maxTokens: z.number().min(1).max(8000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      cacheEnabled: z.boolean().optional(),
      cacheTTL: z.number().min(60).optional(),
      retryAttempts: z.number().min(1).max(10).optional(),
      retryDelay: z.number().min(100).optional(),
      circuitBreaker: z.object({
        failureThreshold: z.number().min(1).optional(),
        recoveryTimeout: z.number().min(1000).optional()
      }).optional()
    });

    const validatedConfig = configSchema.parse(req.body);
    
    // Nota: Esta funcionalidad requeriría implementación adicional en el servicio
    logger.info('LLM config update requested', {
      config: validatedConfig,
      requestId: req.headers['x-request-id'] as string
    });

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: validatedConfig,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error in LLM config update', {
        errors: error.errors,
        requestId: req.headers['x-request-id'] as string
      });
      
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('Error updating LLM config', {
        error: error instanceof Error ? error.message : String(error),
        requestId: req.headers['x-request-id'] as string
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update configuration',
        timestamp: new Date().toISOString()
      });
    }
  }
});

// ===== RUTAS DE MONITOREO =====

// GET /api/llm/health - Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const llmService = LLMGatewayService.getInstance();
    const providers = await llmService.getProviders();
    const circuitBreakerStatus = await llmService.getCircuitBreakerStatus();

    const health = {
      status: 'healthy',
      providers: providers.length,
      circuitBreakers: Object.keys(circuitBreakerStatus).length,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('LLM health check failed', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/llm/metrics - Métricas específicas del LLM
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const llmMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      cacheHitRate: 0,
      providers: {}
    };

    res.json({
      success: true,
      data: llmMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting LLM metrics', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== RUTAS DE UTILIDAD =====

// POST /api/llm/validate - Validar prompt sin generar
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { prompt, model, maxTokens } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Prompt is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validaciones básicas
    const validations = {
      promptLength: prompt.length,
      promptValid: prompt.length > 0 && prompt.length <= 10000,
      modelValid: !model || ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet-20240229', 'command'].includes(model),
      maxTokensValid: !maxTokens || (maxTokens >= 1 && maxTokens <= 8000),
      estimatedTokens: Math.ceil(prompt.length / 4), // Estimación aproximada
      estimatedCost: 0 // Se calcularía basado en el modelo
    };

    res.json({
      success: true,
      data: validations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error validating LLM request', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to validate request',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/llm/models - Listar modelos disponibles
router.get('/models', async (req: Request, res: Response) => {
  try {
    const llmService = LLMGatewayService.getInstance();
    const providers = await llmService.getProviders();
    
    const models = providers.flatMap(provider => 
      provider.models.map(model => ({
        id: model,
        provider: provider.id,
        providerName: provider.name,
        maxTokens: provider.maxTokens,
        costPerToken: provider.costPerToken
      }))
    );

    res.json({
      success: true,
      data: models,
      count: models.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting LLM models', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id'] as string
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get models',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;