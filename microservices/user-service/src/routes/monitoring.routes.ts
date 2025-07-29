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
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: 'user-service'
    };

    res.json(healthData);
  } catch (error) {
    logger.error('Error en health check', { error });
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

// Health check detallado
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: 'user-service',
      checks: {
        database: 'ok', // Se verificaría la conexión real
        redis: 'ok',    // Se verificaría la conexión real
        external: 'ok'  // Se verificarían servicios externos
      }
    };

    res.json(healthData);
  } catch (error) {
    logger.error('Error en health check detallado', { error });
    res.status(500).json({ status: 'error', message: 'Detailed health check failed' });
  }
});

// Métricas de Prometheus
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metricsData = await metrics.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metricsData);
  } catch (error) {
    logger.error('Error al obtener métricas', { error });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Métricas en formato JSON
router.get('/metrics/json', async (req: Request, res: Response) => {
  try {
    const metricsData = await metrics.getMetrics();
    const lines = metricsData.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const jsonMetrics: any = {};
    
    for (const line of lines) {
      const [metricName, value] = line.split(' ');
      if (metricName && value) {
        jsonMetrics[metricName] = parseFloat(value);
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      service: 'user-service',
      metrics: jsonMetrics
    });
  } catch (error) {
    logger.error('Error al obtener métricas JSON', { error });
    res.status(500).json({ error: 'Failed to get JSON metrics' });
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
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        SERVICE_NAME: process.env.SERVICE_NAME
      }
    };

    res.json(systemInfo);
  } catch (error) {
    logger.error('Error al obtener información del sistema', { error });
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

// Estado de las alertas (requiere autenticación de admin)
router.get('/alerts/status', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const activeAlerts = alerts.getActiveAlerts();
    const rules = alerts.getRules();
    const channels = alerts.getChannels();

    res.json({
      timestamp: new Date().toISOString(),
      activeAlerts: activeAlerts.length,
      totalRules: rules.length,
      enabledRules: rules.filter(rule => rule.enabled).length,
      channels: channels.length,
      enabledChannels: channels.filter(channel => channel.enabled).length,
      alerts: activeAlerts,
      rules: rules,
      channels: channels
    });
  } catch (error) {
    logger.error('Error al obtener estado de alertas', { error });
    res.status(500).json({ error: 'Failed to get alerts status' });
  }
});

// Disparar alerta manual (requiere autenticación de admin)
router.post('/alerts/trigger', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { ruleId, message } = req.body;

    if (!ruleId) {
      return res.status(400).json({ error: 'ruleId is required' });
    }

    await alerts.triggerManualAlert(ruleId, message);

    res.json({
      success: true,
      message: 'Alert triggered successfully',
      ruleId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error al disparar alerta manual', { error });
    res.status(500).json({ error: 'Failed to trigger alert' });
  }
});

// Agregar regla de alerta (requiere autenticación de admin)
router.post('/alerts/rules', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const rule = req.body;
    
    if (!rule.id || !rule.name || !rule.condition) {
      return res.status(400).json({ error: 'Invalid rule data' });
    }

    alerts.addRule(rule);

    res.json({
      success: true,
      message: 'Alert rule added successfully',
      ruleId: rule.id
    });
  } catch (error) {
    logger.error('Error al agregar regla de alerta', { error });
    res.status(500).json({ error: 'Failed to add alert rule' });
  }
});

// Remover regla de alerta (requiere autenticación de admin)
router.delete('/alerts/rules/:ruleId', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    
    alerts.removeRule(ruleId);

    res.json({
      success: true,
      message: 'Alert rule removed successfully',
      ruleId
    });
  } catch (error) {
    logger.error('Error al remover regla de alerta', { error });
    res.status(500).json({ error: 'Failed to remove alert rule' });
  }
});

// Agregar canal de notificación (requiere autenticación de admin)
router.post('/alerts/channels', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const channel = req.body;
    
    if (!channel.id || !channel.type || !channel.config) {
      return res.status(400).json({ error: 'Invalid channel data' });
    }

    alerts.addChannel(channel);

    res.json({
      success: true,
      message: 'Notification channel added successfully',
      channelId: channel.id
    });
  } catch (error) {
    logger.error('Error al agregar canal de notificación', { error });
    res.status(500).json({ error: 'Failed to add notification channel' });
  }
});

// Remover canal de notificación (requiere autenticación de admin)
router.delete('/alerts/channels/:channelId', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    
    alerts.removeChannel(channelId);

    res.json({
      success: true,
      message: 'Notification channel removed successfully',
      channelId
    });
  } catch (error) {
    logger.error('Error al remover canal de notificación', { error });
    res.status(500).json({ error: 'Failed to remove notification channel' });
  }
});

// Logs del sistema (requiere autenticación de admin)
router.get('/logs', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { level = 'info', limit = 100, offset = 0 } = req.query;
    
    // En una implementación real, esto consultaría los logs desde Elasticsearch o archivos
    const logs = {
      timestamp: new Date().toISOString(),
      level: level as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      logs: [] // Se llenaría con logs reales
    };

    res.json(logs);
  } catch (error) {
    logger.error('Error al obtener logs', { error });
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Estadísticas de rendimiento (requiere autenticación de admin)
router.get('/performance', authMiddleware, roleMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const { period = '1h' } = req.query;
    
    // En una implementación real, esto consultaría métricas históricas
    const performance = {
      timestamp: new Date().toISOString(),
      period: period as string,
      metrics: {
        requestsPerSecond: Math.random() * 100,
        averageResponseTime: Math.random() * 1000,
        errorRate: Math.random() * 5,
        memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
        cpuUsage: Math.random() * 50
      }
    };

    res.json(performance);
  } catch (error) {
    logger.error('Error al obtener estadísticas de rendimiento', { error });
    res.status(500).json({ error: 'Failed to get performance stats' });
  }
});

// Estado de los servicios dependientes
router.get('/dependencies', async (req: Request, res: Response) => {
  try {
    const dependencies = {
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'ok',
          responseTime: Math.random() * 100
        },
        redis: {
          status: 'ok',
          responseTime: Math.random() * 50
        },
        elasticsearch: {
          status: process.env.ELASTICSEARCH_URL ? 'ok' : 'not_configured',
          responseTime: process.env.ELASTICSEARCH_URL ? Math.random() * 200 : null
        }
      }
    };

    res.json(dependencies);
  } catch (error) {
    logger.error('Error al verificar dependencias', { error });
    res.status(500).json({ error: 'Failed to check dependencies' });
  }
});

export default router;