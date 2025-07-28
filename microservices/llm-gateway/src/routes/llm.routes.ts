import { Router } from 'express';
import { z } from 'zod';
import { LLMGatewayService } from '../services/llm-gateway.service';
import { logger } from '../utils/logger';

const router = Router();
const llmService = new LLMGatewayService();

// ===== VALIDACIÓN SCHEMAS =====

const llmRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']).optional(),
  model: z.string().min(1, 'Model is required'),
  messages: z.union([
    z.string().min(1, 'Message content is required'),
    z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1, 'Message content is required'),
      name: z.string().optional(),
      functionCall: z.any().optional(),
      toolCalls: z.any().optional(),
    }))
  ]),
  systemMessage: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().positive().optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stream: z.boolean().optional(),
  tools: z.array(z.any()).optional(),
  toolChoice: z.any().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

const batchRequestSchema = z.object({
  requests: z.array(llmRequestSchema).min(1).max(10),
  parallel: z.boolean().optional(),
});

const costTrackingSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'google']).optional(),
  userId: z.string().optional(),
});

// ===== RUTAS PRINCIPALES =====

/**
 * Procesar solicitud LLM
 */
router.post('/chat', async (req, res) => {
  try {
    const validatedData = llmRequestSchema.parse(req.body);
    
    const startTime = Date.now();
    const response = await llmService.processRequest(validatedData);
    const totalTime = Date.now() - startTime;

    logger.info(`LLM request processed in ${totalTime}ms`, {
      provider: response.provider,
      model: response.model,
      tokens: response.usage?.totalTokens,
      cost: response.usage?.cost
    });

    res.json({
      success: true,
      data: response,
      processingTime: totalTime
    });

  } catch (error) {
    logger.error('LLM request failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process LLM request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Procesar solicitudes en lote
 */
router.post('/chat/batch', async (req, res) => {
  try {
    const validatedData = batchRequestSchema.parse(req.body);
    
    const startTime = Date.now();
    const responses = [];
    const errors = [];

    if (validatedData.parallel) {
      // Procesar en paralelo
      const promises = validatedData.requests.map(async (request, index) => {
        try {
          const response = await llmService.processRequest(request);
          return { index, success: true, data: response };
        } catch (error) {
          return { index, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          responses.push(result.data);
        } else {
          errors.push({ index: result.index, error: result.error });
        }
      });
    } else {
      // Procesar secuencialmente
      for (let i = 0; i < validatedData.requests.length; i++) {
        try {
          const response = await llmService.processRequest(validatedData.requests[i]);
          responses.push(response);
        } catch (error) {
          errors.push({ index: i, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    const totalTime = Date.now() - startTime;

    logger.info(`Batch LLM request processed in ${totalTime}ms`, {
      total: validatedData.requests.length,
      successful: responses.length,
      failed: errors.length
    });

    res.json({
      success: true,
      data: {
        responses,
        errors,
        summary: {
          total: validatedData.requests.length,
          successful: responses.length,
          failed: errors.length,
          processingTime: totalTime
        }
      }
    });

  } catch (error) {
    logger.error('Batch LLM request failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process batch LLM request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE MÉTRICAS =====

/**
 * Obtener métricas del servicio
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = llmService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * Obtener estadísticas de caché
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await llmService.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats'
    });
  }
});

/**
 * Limpiar caché
 */
router.delete('/cache', async (req, res) => {
  try {
    await llmService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// ===== RUTAS DE COST TRACKING =====

/**
 * Obtener tracking de costos
 */
router.get('/costs', async (req, res) => {
  try {
    const filters = costTrackingSchema.parse(req.query);
    const costs = await llmService.getCostTracking(filters);
    
    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    logger.error('Error getting cost tracking:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get cost tracking'
    });
  }
});

// ===== RUTAS DE HEALTH CHECK =====

/**
 * Health check del servicio
 */
router.get('/health', async (req, res) => {
  try {
    const healthChecks = await llmService.getHealthChecks();
    
    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    const status = allHealthy ? 'healthy' : 'degraded';
    
    res.json({
      success: true,
      service: 'LLM Gateway',
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      providers: healthChecks
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      service: 'LLM Gateway',
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== RUTAS DE PROVEEDORES =====

/**
 * Obtener proveedores disponibles
 */
router.get('/providers', (req, res) => {
  try {
    const providers = llmService.getAvailableProviders();
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    logger.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get providers'
    });
  }
});

/**
 * Obtener modelos disponibles por proveedor
 */
router.get('/providers/:provider/models', (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!['openai', 'anthropic', 'google'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider'
      });
    }

    const models = llmService.getAvailableModels(provider as any);
    
    res.json({
      success: true,
      data: {
        provider,
        models
      }
    });
  } catch (error) {
    logger.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get models'
    });
  }
});

// ===== RUTAS DE ADMINISTRACIÓN =====

/**
 * Reinicializar proveedores
 */
router.post('/admin/reinitialize', async (req, res) => {
  try {
    await llmService.reinitializeProviders();
    
    res.json({
      success: true,
      message: 'Providers reinitialized successfully'
    });
  } catch (error) {
    logger.error('Error reinitializing providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reinitialize providers'
    });
  }
});

// ===== RUTAS DE STREAMING =====

/**
 * Procesar solicitud LLM con streaming
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const validatedData = llmRequestSchema.parse(req.body);
    validatedData.stream = true;

    // Configurar headers para streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Procesar con streaming
    const stream = await llmService.processRequest(validatedData);
    
    // Enviar datos por streaming
    res.write(`data: ${JSON.stringify({ type: 'start', data: stream })}\n\n`);
    
    // Simular streaming de tokens (en una implementación real, esto vendría del proveedor)
    const tokens = stream.content.split(' ');
    for (const token of tokens) {
      res.write(`data: ${JSON.stringify({ type: 'token', data: token })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 50)); // Simular delay
    }
    
    res.write(`data: ${JSON.stringify({ type: 'end', data: stream })}\n\n`);
    res.end();

  } catch (error) {
    logger.error('Streaming LLM request failed:', error);
    
    if (error instanceof z.ZodError) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Validation error',
        details: error.errors 
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Failed to process streaming request' 
      })}\n\n`);
    }
    
    res.end();
  }
});

export default router; 