import { Router, Request, Response } from 'express';
import { metrics } from '../services/metrics.service.js';
import { logger } from '../services/logging.service.js';
import { alerts } from '../services/alerts.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Health check básico
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      service: 'mcp-orchestrator',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Health check detallado
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      service: 'mcp-orchestrator',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        redis: 'connected', // Simulado
        database: 'connected', // Simulado
        elasticsearch: 'connected' // Simulado
      },
      metrics: {
        totalRequests: 0, // Se obtendría de las métricas reales
        activeConnections: 0,
        errorRate: 0
      }
    };

    res.status(200).json({
      success: true,
      data: detailedHealth
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error });
    res.status(500).json({
      success: false,
      error: 'Detailed health check failed'
    });
  }
});

// Métricas de Prometheus
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const prometheusMetrics = await metrics.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.status(200).send(prometheusMetrics);
  } catch (error) {
    logger.error('Failed to get Prometheus metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

// Métricas en formato JSON
router.get('/metrics/json', async (req: Request, res: Response) => {
  try {
    const metricsData = {
      timestamp: new Date().toISOString(),
      service: 'mcp-orchestrator',
      metrics: {
        http: {
          requests_total: 0,
          requests_failed: 0,
          request_duration_avg: 0
        },
        mcp: {
          requests_total: 0,
          requests_failed: 0,
          services_registered: 0,
          services_active: 0
        },
        routing: {
          requests_total: 0,
          requests_failed: 0,
          cache_hits: 0,
          cache_misses: 0
        },
        context: {
          operations_total: 0,
          operations_failed: 0,
          contexts_active: 0
        },
        agents: {
          operations_total: 0,
          operations_failed: 0,
          agents_active: 0,
          tasks_total: 0
        },
        workflows: {
          operations_total: 0,
          operations_failed: 0,
          workflows_active: 0
        },
        performance: {
          memory_usage: process.memoryUsage(),
          cpu_usage: 0,
          event_loop_lag: 0
        }
      }
    };

    res.status(200).json({
      success: true,
      data: metricsData
    });
  } catch (error) {
    logger.error('Failed to get JSON metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

// Información del sistema
router.get('/system/info', async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      versions: process.versions,
      config: {
        port: process.env.PORT || 3008,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
      }
    };

    res.status(200).json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    logger.error('Failed to get system info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get system info'
    });
  }
});

// Estado de alertas (requiere autenticación admin)
router.get('/alerts/status', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const alertStatus = {
      activeAlerts: alerts.getActiveAlerts(),
      rules: alerts.getRules(),
      channels: alerts.getChannels(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: alertStatus
    });
  } catch (error) {
    logger.error('Failed to get alert status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get alert status'
    });
  }
});

// Disparar alerta manual (requiere autenticación admin)
router.post('/alerts/trigger', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { ruleId, message } = req.body;

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        error: 'ruleId is required'
      });
    }

    await alerts.triggerManualAlert(ruleId, message);

    res.status(200).json({
      success: true,
      message: 'Manual alert triggered successfully'
    });
  } catch (error) {
    logger.error('Failed to trigger manual alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual alert'
    });
  }
});

// Gestión de reglas de alerta (requiere autenticación admin)
router.post('/alerts/rules', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const rule = req.body;
    alerts.addRule(rule);

    res.status(201).json({
      success: true,
      message: 'Alert rule added successfully'
    });
  } catch (error) {
    logger.error('Failed to add alert rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to add alert rule'
    });
  }
});

router.delete('/alerts/rules/:ruleId', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    alerts.removeRule(ruleId);

    res.status(200).json({
      success: true,
      message: 'Alert rule removed successfully'
    });
  } catch (error) {
    logger.error('Failed to remove alert rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to remove alert rule'
    });
  }
});

// Gestión de canales de notificación (requiere autenticación admin)
router.post('/alerts/channels', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const channel = req.body;
    alerts.addChannel(channel);

    res.status(201).json({
      success: true,
      message: 'Notification channel added successfully'
    });
  } catch (error) {
    logger.error('Failed to add notification channel', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to add notification channel'
    });
  }
});

router.delete('/alerts/channels/:channelId', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    alerts.removeChannel(channelId);

    res.status(200).json({
      success: true,
      message: 'Notification channel removed successfully'
    });
  } catch (error) {
    logger.error('Failed to remove notification channel', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to remove notification channel'
    });
  }
});

// Logs (requiere autenticación admin)
router.get('/logs', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { level, category, limit = 100, offset = 0 } = req.query;

    // En una implementación real, esto consultaría los logs de Elasticsearch o archivos
    const logs = {
      logs: [], // Se obtendrían de la fuente real
      total: 0,
      level: level || 'all',
      category: category || 'all',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to get logs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

// Estadísticas de rendimiento (requiere autenticación admin)
router.get('/performance', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const performanceStats = {
      timestamp: new Date().toISOString(),
      service: 'mcp-orchestrator',
      performance: {
        requests: {
          total: 0,
          perSecond: 0,
          averageResponseTime: 0,
          slowRequests: 0
        },
        memory: {
          usage: process.memoryUsage(),
          heapUsed: 0,
          heapTotal: 0,
          external: 0
        },
        cpu: {
          usage: 0,
          load: 0
        },
        connections: {
          active: 0,
          idle: 0,
          total: 0
        },
        errors: {
          total: 0,
          rate: 0,
          lastHour: 0
        }
      }
    };

    res.status(200).json({
      success: true,
      data: performanceStats
    });
  } catch (error) {
    logger.error('Failed to get performance stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get performance stats'
    });
  }
});

// Estado de dependencias
router.get('/dependencies', async (req: Request, res: Response) => {
  try {
    const dependencies = {
      timestamp: new Date().toISOString(),
      service: 'mcp-orchestrator',
      dependencies: {
        redis: {
          status: 'connected',
          responseTime: 0,
          lastCheck: new Date().toISOString()
        },
        database: {
          status: 'connected',
          responseTime: 0,
          lastCheck: new Date().toISOString()
        },
        elasticsearch: {
          status: 'connected',
          responseTime: 0,
          lastCheck: new Date().toISOString()
        },
        microservices: {
          'user-service': {
            status: 'healthy',
            responseTime: 0,
            lastCheck: new Date().toISOString()
          },
          'student-service': {
            status: 'healthy',
            responseTime: 0,
            lastCheck: new Date().toISOString()
          },
          'course-service': {
            status: 'healthy',
            responseTime: 0,
            lastCheck: new Date().toISOString()
          },
          'ai-services': {
            status: 'healthy',
            responseTime: 0,
            lastCheck: new Date().toISOString()
          }
        }
      }
    };

    res.status(200).json({
      success: true,
      data: dependencies
    });
  } catch (error) {
    logger.error('Failed to get dependencies status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get dependencies status'
    });
  }
});

// Métricas específicas de MCP
router.get('/mcp/metrics', async (req: Request, res: Response) => {
  try {
    const mcpMetrics = {
      timestamp: new Date().toISOString(),
      service: 'mcp-orchestrator',
      mcp: {
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          rate: 0
        },
        services: {
          registered: 0,
          active: 0,
          unhealthy: 0
        },
        routing: {
          requests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          averageLatency: 0
        },
        contexts: {
          active: 0,
          created: 0,
          deleted: 0,
          operations: 0
        },
        agents: {
          registered: 0,
          active: 0,
          tasks: 0,
          completed: 0
        },
        workflows: {
          active: 0,
          completed: 0,
          failed: 0,
          averageDuration: 0
        }
      }
    };

    res.status(200).json({
      success: true,
      data: mcpMetrics
    });
  } catch (error) {
    logger.error('Failed to get MCP metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get MCP metrics'
    });
  }
});

// Estado de servicios MCP
router.get('/mcp/services/status', async (req: Request, res: Response) => {
  try {
    const servicesStatus = {
      timestamp: new Date().toISOString(),
      service: 'mcp-orchestrator',
      services: {
        'user-service': {
          status: 'healthy',
          url: 'http://localhost:3001',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          version: '1.0.0'
        },
        'student-service': {
          status: 'healthy',
          url: 'http://localhost:3002',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          version: '1.0.0'
        },
        'course-service': {
          status: 'healthy',
          url: 'http://localhost:3003',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          version: '1.0.0'
        },
        'ai-services': {
          status: 'healthy',
          url: 'http://localhost:3004',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          version: '1.0.0'
        }
      }
    };

    res.status(200).json({
      success: true,
      data: servicesStatus
    });
  } catch (error) {
    logger.error('Failed to get services status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get services status'
    });
  }
});

// Limpiar métricas (requiere autenticación admin)
router.post('/metrics/clear', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    metrics.clearMetrics();
    
    res.status(200).json({
      success: true,
      message: 'Metrics cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear metrics'
    });
  }
});

export default router;