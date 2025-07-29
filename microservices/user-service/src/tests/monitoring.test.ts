import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { logger } from '../services/logging.service.js';
import { metrics } from '../services/metrics.service.js';
import { alerts } from '../services/alerts.service.js';
import { MonitoringMiddleware } from '../middleware/monitoring.middleware.js';
import monitoringRoutes from '../routes/monitoring.routes.js';

// Mock de servicios externos
vi.mock('../services/redis.service.js', () => ({
  RedisService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    setex: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    lpush: vi.fn().mockResolvedValue(undefined),
    ltrim: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG')
  }))
}));

vi.mock('../services/database.service.js', () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  }),
  roleMiddleware: vi.fn(() => (req, res, next) => next())
}));

describe('Sistema de Monitoreo', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Configurar middleware de monitoreo
    const monitoringMiddleware = new MonitoringMiddleware({
      enabled: true,
      logRequests: true,
      logResponses: true,
      recordMetrics: true
    });
    
    app.use(monitoringMiddleware.monitoring());
    app.use('/monitoring', monitoringRoutes);
    
    // Ruta de prueba
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });
    
    app.get('/test-error', (req, res) => {
      res.status(500).json({ error: 'test error' });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('LoggingService', () => {
    it('debería crear logs con contexto', () => {
      const context = {
        userId: 'test-user',
        requestId: 'test-request',
        ip: '127.0.0.1',
        endpoint: '/test'
      };

      expect(() => {
        logger.info('Test message', context);
        logger.error('Test error', context);
        logger.warn('Test warning', context);
        logger.debug('Test debug', context);
      }).not.toThrow();
    });

    it('debería crear logs específicos por categoría', () => {
      const context = {
        userId: 'test-user',
        ip: '127.0.0.1'
      };

      expect(() => {
        logger.logAuth('login', context);
        logger.logUserOperation('profile_update', context);
        logger.logSecurityEvent('suspicious_activity', context);
        logger.logPerformance('database_query', 150, context);
        logger.logAudit('user_delete', 'user:123', context);
      }).not.toThrow();
    });
  });

  describe('MetricsService', () => {
    it('debería registrar métricas HTTP', () => {
      expect(() => {
        metrics.recordHttpRequest('GET', '/test', 200, 150);
        metrics.recordHttpRequestStart('GET', '/test');
        metrics.recordHttpRequestEnd('GET', '/test');
        metrics.recordHttpRequestFailure('GET', '/test', 'timeout');
      }).not.toThrow();
    });

    it('debería registrar métricas de autenticación', () => {
      expect(() => {
        metrics.recordAuthAttempt('login', true);
        metrics.recordAuthSuccess('login');
        metrics.recordAuthFailure('login', 'invalid_credentials');
        metrics.recordTokenValidation(true);
        metrics.recordTokenExpiration();
      }).not.toThrow();
    });

    it('debería registrar métricas de usuarios', () => {
      expect(() => {
        metrics.recordUserRegistration();
        metrics.recordUserLogin();
        metrics.recordUserLogout();
        metrics.recordUserProfileUpdate();
        metrics.recordUserDeletion();
        metrics.setActiveUsers(10);
      }).not.toThrow();
    });

    it('debería registrar métricas de base de datos', () => {
      expect(() => {
        metrics.setDbConnections(5);
        metrics.recordDbQuery('SELECT', 'users', 50);
        metrics.recordDbError('INSERT', 'connection_error');
      }).not.toThrow();
    });

    it('debería registrar métricas de Redis', () => {
      expect(() => {
        metrics.setRedisConnections(3);
        metrics.recordRedisOperation('GET');
        metrics.recordRedisError('SET', 'connection_error');
      }).not.toThrow();
    });

    it('debería registrar métricas de seguridad', () => {
      expect(() => {
        metrics.recordSecurityEvent('brute_force', 'high');
        metrics.recordRateLimitHit('/auth/login', '192.168.1.1');
        metrics.recordSuspiciousActivity('sql_injection', '192.168.1.1');
      }).not.toThrow();
    });

    it('debería actualizar métricas de rendimiento', () => {
      expect(() => {
        metrics.updateMemoryUsage();
        metrics.recordResponseTime('/test', 'GET', 200);
      }).not.toThrow();
    });

    it('debería obtener métricas en formato Prometheus', async () => {
      const metricsData = await metrics.getMetrics();
      expect(metricsData).toBeDefined();
      expect(typeof metricsData).toBe('string');
      expect(metricsData).toContain('# HELP');
    });
  });

  describe('AlertsService', () => {
    it('debería obtener reglas de alerta', () => {
      const rules = alerts.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('debería obtener canales de notificación', () => {
      const channels = alerts.getChannels();
      expect(Array.isArray(channels)).toBe(true);
    });

    it('debería obtener alertas activas', () => {
      const activeAlerts = alerts.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('debería agregar y remover reglas de alerta', () => {
      const newRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        condition: {
          metric: 'test_metric',
          operator: 'gt' as const,
          threshold: 10,
          window: 300,
          aggregation: 'sum' as const
        },
        severity: 'medium' as const,
        enabled: true,
        cooldown: 300,
        notificationChannels: ['email']
      };

      alerts.addRule(newRule);
      const rules = alerts.getRules();
      expect(rules.find(r => r.id === 'test-rule')).toBeDefined();

      alerts.removeRule('test-rule');
      const rulesAfter = alerts.getRules();
      expect(rulesAfter.find(r => r.id === 'test-rule')).toBeUndefined();
    });

    it('debería agregar y remover canales de notificación', () => {
      const newChannel = {
        id: 'test-channel',
        type: 'webhook' as const,
        config: { url: 'http://test.com' },
        enabled: true
      };

      alerts.addChannel(newChannel);
      const channels = alerts.getChannels();
      expect(channels.find(c => c.id === 'test-channel')).toBeDefined();

      alerts.removeChannel('test-channel');
      const channelsAfter = alerts.getChannels();
      expect(channelsAfter.find(c => c.id === 'test-channel')).toBeUndefined();
    });
  });

  describe('MonitoringMiddleware', () => {
    it('debería registrar requests y responses', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'test' });
    });

    it('debería registrar errores', async () => {
      const response = await request(app)
        .get('/test-error')
        .expect(500);

      expect(response.body).toEqual({ error: 'test error' });
    });

    it('debería generar request IDs', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Verificar que se generó un request ID
      expect(response.headers['x-request-id'] || response.body.requestId).toBeDefined();
    });
  });

  describe('Rutas de Monitoreo', () => {
    describe('GET /monitoring/health', () => {
      it('debería retornar health check básico', async () => {
        const response = await request(app)
          .get('/monitoring/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('service', 'user-service');
      });
    });

    describe('GET /monitoring/health/detailed', () => {
      it('debería retornar health check detallado', async () => {
        const response = await request(app)
          .get('/monitoring/health/detailed')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('checks');
        expect(response.body.checks).toHaveProperty('database');
        expect(response.body.checks).toHaveProperty('redis');
      });
    });

    describe('GET /monitoring/metrics', () => {
      it('debería retornar métricas en formato Prometheus', async () => {
        const response = await request(app)
          .get('/monitoring/metrics')
          .expect(200);

        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.text).toContain('# HELP');
        expect(response.text).toContain('# TYPE');
      });
    });

    describe('GET /monitoring/metrics/json', () => {
      it('debería retornar métricas en formato JSON', async () => {
        const response = await request(app)
          .get('/monitoring/metrics/json')
          .expect(200);

        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('service', 'user-service');
        expect(response.body).toHaveProperty('metrics');
      });
    });

    describe('GET /monitoring/system/info', () => {
      it('debería retornar información del sistema', async () => {
        const response = await request(app)
          .get('/monitoring/system/info')
          .expect(200);

        expect(response.body).toHaveProperty('platform');
        expect(response.body).toHaveProperty('nodeVersion');
        expect(response.body).toHaveProperty('memory');
        expect(response.body).toHaveProperty('env');
      });
    });

    describe('GET /monitoring/alerts/status', () => {
      it('debería retornar estado de alertas', async () => {
        const response = await request(app)
          .get('/monitoring/alerts/status')
          .expect(200);

        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('activeAlerts');
        expect(response.body).toHaveProperty('totalRules');
        expect(response.body).toHaveProperty('alerts');
        expect(response.body).toHaveProperty('rules');
        expect(response.body).toHaveProperty('channels');
      });
    });

    describe('POST /monitoring/alerts/trigger', () => {
      it('debería disparar alerta manual', async () => {
        const response = await request(app)
          .post('/monitoring/alerts/trigger')
          .send({
            ruleId: 'high-error-rate',
            message: 'Test alert'
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('ruleId', 'high-error-rate');
      });

      it('debería validar ruleId requerido', async () => {
        const response = await request(app)
          .post('/monitoring/alerts/trigger')
          .send({ message: 'Test alert' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /monitoring/alerts/rules', () => {
      it('debería agregar regla de alerta', async () => {
        const newRule = {
          id: 'test-rule',
          name: 'Test Rule',
          description: 'Test alert rule',
          condition: {
            metric: 'test_metric',
            operator: 'gt',
            threshold: 10,
            window: 300,
            aggregation: 'sum'
          },
          severity: 'medium',
          enabled: true,
          cooldown: 300,
          notificationChannels: ['email']
        };

        const response = await request(app)
          .post('/monitoring/alerts/rules')
          .send(newRule)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('ruleId', 'test-rule');
      });

      it('debería validar datos de regla', async () => {
        const response = await request(app)
          .post('/monitoring/alerts/rules')
          .send({ name: 'Invalid Rule' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('DELETE /monitoring/alerts/rules/:ruleId', () => {
      it('debería remover regla de alerta', async () => {
        // Primero agregar una regla
        const newRule = {
          id: 'delete-test-rule',
          name: 'Delete Test Rule',
          description: 'Test alert rule for deletion',
          condition: {
            metric: 'test_metric',
            operator: 'gt',
            threshold: 10,
            window: 300,
            aggregation: 'sum'
          },
          severity: 'medium',
          enabled: true,
          cooldown: 300,
          notificationChannels: ['email']
        };

        await request(app)
          .post('/monitoring/alerts/rules')
          .send(newRule);

        // Luego eliminarla
        const response = await request(app)
          .delete('/monitoring/alerts/rules/delete-test-rule')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('ruleId', 'delete-test-rule');
      });
    });

    describe('GET /monitoring/dependencies', () => {
      it('debería retornar estado de dependencias', async () => {
        const response = await request(app)
          .get('/monitoring/dependencies')
          .expect(200);

        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('services');
        expect(response.body.services).toHaveProperty('database');
        expect(response.body.services).toHaveProperty('redis');
      });
    });

    describe('GET /monitoring/performance', () => {
      it('debería retornar estadísticas de rendimiento', async () => {
        const response = await request(app)
          .get('/monitoring/performance')
          .expect(200);

        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('period');
        expect(response.body).toHaveProperty('metrics');
        expect(response.body.metrics).toHaveProperty('requestsPerSecond');
        expect(response.body.metrics).toHaveProperty('averageResponseTime');
        expect(response.body.metrics).toHaveProperty('errorRate');
        expect(response.body.metrics).toHaveProperty('memoryUsage');
        expect(response.body.metrics).toHaveProperty('cpuUsage');
      });
    });
  });

  describe('Integración de Monitoreo', () => {
    it('debería registrar métricas durante requests', async () => {
      // Hacer varios requests para generar métricas
      await request(app).get('/test');
      await request(app).get('/test-error');
      await request(app).get('/test');

      // Verificar que las métricas se registraron
      const metricsData = await metrics.getMetrics();
      expect(metricsData).toContain('http_requests_total');
      expect(metricsData).toContain('http_request_duration_seconds');
    });

    it('debería manejar errores de monitoreo graciosamente', async () => {
      // Simular error en el servicio de métricas
      vi.spyOn(metrics, 'recordHttpRequest').mockImplementationOnce(() => {
        throw new Error('Metrics error');
      });

      // El request debería continuar funcionando
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'test' });
    });
  });
});