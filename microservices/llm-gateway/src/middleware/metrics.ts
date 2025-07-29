import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger, metricsLogger } from '../utils/logger';

// Métricas Prometheus
const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'provider']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const llmRequestTotal = new Counter({
  name: 'llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: ['provider', 'model', 'type', 'status']
});

const llmRequestDuration = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'Duration of LLM requests in seconds',
  labelNames: ['provider', 'model', 'type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const llmTokensTotal = new Counter({
  name: 'llm_tokens_total',
  help: 'Total number of tokens processed',
  labelNames: ['provider', 'model', 'type', 'token_type']
});

const llmCostTotal = new Counter({
  name: 'llm_cost_total',
  help: 'Total cost of LLM requests',
  labelNames: ['provider', 'model', 'type', 'currency']
});

const cacheHitRatio = new Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio',
  labelNames: ['cache_type']
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const errorRate = new Counter({
  name: 'error_rate_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'provider']
});

// Registro de métricas
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(llmRequestTotal);
register.registerMetric(llmRequestDuration);
register.registerMetric(llmTokensTotal);
register.registerMetric(llmCostTotal);
register.registerMetric(cacheHitRatio);
register.registerMetric(activeConnections);
register.registerMetric(errorRate);

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Interceptar la respuesta para registrar métricas
  res.send = function(data: any) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Extraer proveedor de la request si está disponible
    let provider = 'unknown';
    if (req.body?.provider) {
      provider = req.body.provider;
    } else if (req.path.includes('/llm/')) {
      // Intentar extraer proveedor de la URL o headers
      provider = req.headers['x-llm-provider'] as string || 'unknown';
    }

    // Registrar métricas HTTP
    httpRequestTotal.inc({ method, route, status_code: statusCode, provider });
    httpRequestDuration.observe({ method, route, provider }, duration);

    // Registrar métricas específicas de LLM
    if (req.path.includes('/llm/')) {
      const llmType = getLLMType(req.path);
      const model = req.body?.model || 'unknown';
      const status = statusCode < 400 ? 'success' : 'error';

      llmRequestTotal.inc({ provider, model, type: llmType, status });
      llmRequestDuration.observe({ provider, model, type: llmType }, duration);

      // Registrar tokens y costos si la respuesta es exitosa
      if (statusCode === 200 && data) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          if (responseData.data?.usage) {
            const usage = responseData.data.usage;
            const cost = responseData.data.cost;

            if (usage.prompt_tokens) {
              llmTokensTotal.inc({ 
                provider, 
                model, 
                type: llmType, 
                token_type: 'prompt' 
              }, usage.prompt_tokens);
            }

            if (usage.completion_tokens) {
              llmTokensTotal.inc({ 
                provider, 
                model, 
                type: llmType, 
                token_type: 'completion' 
              }, usage.completion_tokens);
            }

            if (usage.total_tokens) {
              llmTokensTotal.inc({ 
                provider, 
                model, 
                type: llmType, 
                token_type: 'total' 
              }, usage.total_tokens);
            }

            if (cost?.amount) {
              llmCostTotal.inc({ 
                provider, 
                model, 
                type: llmType, 
                currency: cost.currency || 'USD' 
              }, cost.amount);
            }
          }
        } catch (error) {
          logger.debug('Error parsing response data for metrics:', error);
        }
      }

      // Registrar errores
      if (statusCode >= 400) {
        const errorType = getErrorType(statusCode);
        errorRate.inc({ error_type: errorType, provider });
      }
    }

    // Log de métricas
    metricsLogger.info('Request metrics', {
      method,
      route,
      statusCode,
      duration,
      provider,
      userId: req.user?.id,
      ip: req.ip
    });

    // Llamar al método original
    return originalSend.call(this, data);
  };

  next();
};

function getLLMType(path: string): string {
  if (path.includes('/chat')) return 'chat';
  if (path.includes('/completions')) return 'completion';
  if (path.includes('/embeddings')) return 'embedding';
  if (path.includes('/batch')) return 'batch';
  return 'unknown';
}

function getErrorType(statusCode: number): string {
  if (statusCode >= 500) return 'server_error';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode === 401) return 'auth_error';
  if (statusCode === 403) return 'permission_error';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 400) return 'validation_error';
  return 'client_error';
}

// Funciones para actualizar métricas específicas
export const updateCacheHitRatio = (ratio: number, cacheType: string = 'default'): void => {
  cacheHitRatio.set({ cache_type: cacheType }, ratio);
};

export const updateActiveConnections = (count: number): void => {
  activeConnections.set(count);
};

export const recordLLMError = (provider: string, errorType: string): void => {
  errorRate.inc({ error_type: errorType, provider });
};

export const recordLLMTokens = (
  provider: string, 
  model: string, 
  type: string, 
  tokenType: string, 
  count: number
): void => {
  llmTokensTotal.inc({ provider, model, type, token_type: tokenType }, count);
};

export const recordLLMCost = (
  provider: string, 
  model: string, 
  type: string, 
  amount: number, 
  currency: string = 'USD'
): void => {
  llmCostTotal.inc({ provider, model, type, currency }, amount);
};

// Endpoint para métricas Prometheus
export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving metrics',
        code: 'METRICS_ERROR'
      }
    });
  }
};

// Función para obtener métricas personalizadas
export const getCustomMetrics = (req: Request, res: Response): void => {
  try {
    const metrics = {
      http: {
        requests_total: httpRequestTotal,
        request_duration: httpRequestDuration
      },
      llm: {
        requests_total: llmRequestTotal,
        request_duration: llmRequestDuration,
        tokens_total: llmTokensTotal,
        cost_total: llmCostTotal
      },
      cache: {
        hit_ratio: cacheHitRatio
      },
      system: {
        active_connections: activeConnections,
        error_rate: errorRate
      }
    };

    res.json({
      success: true,
      data: {
        metrics: Object.keys(metrics),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting custom metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving custom metrics',
        code: 'METRICS_ERROR'
      }
    });
  }
};

// Función para resetear métricas (solo en desarrollo)
export const resetMetrics = (req: Request, res: Response): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      error: {
        message: 'Metrics reset not allowed in production',
        code: 'FORBIDDEN'
      }
    });
    return;
  }

  try {
    register.clear();
    logger.info('Metrics reset successfully');
    
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error resetting metrics',
        code: 'METRICS_ERROR'
      }
    });
  }
};