import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { logger } from '../src/services/logging.service.js';
import { metrics } from '../src/services/metrics.service.js';
import { alerts } from '../src/services/alerts.service.js';
import { MonitoringMiddleware } from '../src/middleware/monitoring.middleware.js';
import monitoringRoutes from '../src/routes/monitoring.routes.js';

// Mock de servicios externos
vi.mock('../src/services/redis.service.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1)
  }))
}));

vi.mock('../src/middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    (req as any).user = { id: 'test-user', role: 'admin' };
    next();
  }),
  roleMiddleware: vi.fn(() => (req, res, next) => next())
}));

describe('Sistema de Monitoreo MCP Orchestrator', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Configurar middleware de monitoreo
    const monitoringMiddleware = new MonitoringMiddleware({
      enableRequestLogging: true,
      enablePerformanceLogging: true,
      enableAuditLogging: true,
      enableMetrics: true,
      slowRequestThreshold: 100,
      logRequestBody: false,
      logResponseBody: false,
      sanitizeSensitiveData: true
    });

    app.use(monitoringMiddleware.monitoring());
    app.use(monitoringMiddleware.performanceLogging());
    app.use(monitoringMiddleware.auditLogging());

    // Montar rutas de monitoreo
    app.use('/api/monitoring', monitoringRoutes);

    // Ruta de prueba
    app.get('/test', (req, res) => {
      res.json({ success: true, message: 'Test endpoint' });
    });

    app.get('/test/slow', async (req, res) => {
      await new Promise(resolve => setTimeout(resolve, 150)); // Más lento que el threshold
      res.json({ success: true, message: 'Slow test endpoint' });
    });

    app.get('/api/orchestrator/contexts', (req, res) => {
      res.json({ success: true, contexts: [] });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('LoggingService', () => {
    it('should log info messages correctly', () => {
      const infoSpy = vi.spyOn(logger, 'info');
      logger.info('Test info message');
      expect(infoSpy).toHaveBeenCalledWith('Test info message');
    });

    it('should log error messages correctly', () => {
      const errorSpy = vi.spyOn(logger, 'error');
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalledWith('Test error message');
    });

    it('should log orchestration events correctly', () => {
      const infoSpy = vi.spyOn(logger, 'info');
      logger.logOrchestration('test_event', { test: 'data' });
      expect(infoSpy).toHaveBeenCalledWith('ORCHESTRATION: test_event', {
        test: 'data',
        category: 'orchestration'
      });
    });

    it('should log MCP routing events correctly', () => {
      const infoSpy = vi.spyOn(logger, 'info');
      logger.logMCPRouting('user-service', 'create_user', { userId: '123' });
      expect(infoSpy).toHaveBeenCalledWith('MCP_ROUTING: user-service.create_user', {
        userId: '123',
        category: 'mcp_routing',
        service: 'user-service',
        action: 'create_user'
      });
    });

    it('should log context management events correctly', () => {
      const infoSpy = vi.spyOn(logger, 'info');
      logger.logContextManagement('create', 'ctx-123', { contextId: 'ctx-123' });
      expect(infoSpy).toHaveBeenCalledWith('CONTEXT_MGMT: create', {
        contextId: 'ctx-123',
        category: 'context_management',
        contextId: 'ctx-123'
      });
    });

    it('should log agent coordination events correctly', () => {
      const infoSpy = vi.spyOn(logger, 'info');
      logger.logAgentCoordination('register', 'agent-123', { agentId: 'agent-123' });
      expect(infoSpy).toHaveBeenCalledWith('AGENT_COORD: register', {
        agentId: 'agent-123',
        category: 'agent_coordination',
        agentId: 'agent-123'
      });
    });
  });

  describe('MetricsService', () => {
    it('should record HTTP requests correctly', () => {
      const recordSpy = vi.spyOn(metrics, 'recordHttpRequest');
      metrics.recordHttpRequest('GET', '/test', 200, 100);
      expect(recordSpy).toHaveBeenCalledWith('GET', '/test', 200, 100);
    });

    it('should record MCP requests correctly', () => {
      const recordSpy = vi.spyOn(metrics, 'recordMCPRequest');
      metrics.recordMCPRequest('user-service', 'create_user', 'success', 150);
      expect(recordSpy).toHaveBeenCalledWith('user-service', 'create_user', 'success', 150);
    });

    it('should record routing requests correctly', () => {
      const recordSpy = vi.spyOn(metrics, 'recordRoutingRequest');
      metrics.recordRoutingRequest('user-service', 'create', 50);
      expect(recordSpy).toHaveBeenCalledWith('user-service', 'create', 50);
    });

    it('should record context operations correctly', () => {
      const recordSpy = vi.spyOn(metrics, 'recordContextOperation');
      metrics.recordContextOperation('create', 'success', 75);
      expect(recordSpy).toHaveBeenCalledWith('create', 'success', 75);
    });

    it('should record agent operations correctly', () => {
      const recordSpy = vi.spyOn(metrics, 'recordAgentOperation');
      metrics.recordAgentOperation('register', 'llm', 'success', 200);
      expect(recordSpy).toHaveBeenCalledWith('register', 'llm', 'success', 200);
    });

    it('should record workflow operations correctly', () => {
      const recordSpy = vi.spyOn(metrics, 'recordWorkflowOperation');
      metrics.recordWorkflowOperation('create', 'education', 'success', 500);
      expect(recordSpy).toHaveBeenCalledWith('create', 'education', 'success', 500);
    });

    it('should update memory usage correctly', () => {
      const updateSpy = vi.spyOn(metrics, 'updateMemoryUsage');
      metrics.updateMemoryUsage();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should get metrics correctly', async () => {
      const getMetricsSpy = vi.spyOn(metrics, 'getMetrics');
      await metrics.getMetrics();
      expect(getMetricsSpy).toHaveBeenCalled();
    });
  });

  describe('AlertsService', () => {
    it('should get rules correctly', () => {
      const rules = alerts.getRules();
      expect(Array.isArray(rules)).toBe(true);
    });

    it('should get channels correctly', () => {
      const channels = alerts.getChannels();
      expect(Array.isArray(channels)).toBe(true);
    });

    it('should get active alerts correctly', () => {
      const activeAlerts = alerts.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('should add rule correctly', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        severity: 'medium' as const,
        conditions: [],
        cooldown: 300,
        enabled: true,
        channels: ['email']
      };
      
      alerts.addRule(rule);
      const rules = alerts.getRules();
      expect(rules.some(r => r.id === 'test-rule')).toBe(true);
    });

    it('should remove rule correctly', () => {
      alerts.removeRule('test-rule');
      const rules = alerts.getRules();
      expect(rules.some(r => r.id === 'test-rule')).toBe(false);
    });

    it('should add channel correctly', () => {
      const channel = {
        id: 'test-channel',
        name: 'Test Channel',
        type: 'email' as const,
        config: {},
        enabled: true
      };
      
      alerts.addChannel(channel);
      const channels = alerts.getChannels();
      expect(channels.some(c => c.id === 'test-channel')).toBe(true);
    });

    it('should remove channel correctly', () => {
      alerts.removeChannel('test-channel');
      const channels = alerts.getChannels();
      expect(channels.some(c => c.id === 'test-channel')).toBe(false);
    });
  });

  describe('MonitoringMiddleware', () => {
    it('should log requests correctly', async () => {
      const infoSpy = vi.spyOn(logger, 'info');
      
      await request(app)
        .get('/test')
        .expect(200);

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP GET /test'),
        expect.objectContaining({
          method: 'GET',
          endpoint: '/test'
        })
      );
    });

    it('should log slow requests correctly', async () => {
      const performanceSpy = vi.spyOn(logger, 'logPerformance');
      
      await request(app)
        .get('/test/slow')
        .expect(200);

      expect(performanceSpy).toHaveBeenCalledWith(
        'slow_request',
        expect.any(Number),
        expect.objectContaining({
          method: 'GET',
          endpoint: '/test/slow'
        })
      );
    });

    it('should log audit events for sensitive endpoints', async () => {
      const auditSpy = vi.spyOn(logger, 'logAudit');
      
      await request(app)
        .get('/api/orchestrator/contexts')
        .expect(200);

      expect(auditSpy).toHaveBeenCalledWith(
        'read_context',
        'context',
        expect.objectContaining({
          method: 'GET',
          endpoint: '/api/orchestrator/contexts'
        })
      );
    });

    it('should sanitize sensitive data correctly', () => {
      const middleware = new MonitoringMiddleware();
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt-token',
        auth: 'basic-auth',
        normal: 'data'
      };

      const sanitized = (middleware as any).sanitizeData(sensitiveData);
      
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.auth).toBe('[REDACTED]');
      expect(sanitized.normal).toBe('data');
    });
  });

  describe('Monitoring Routes', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('mcp-orchestrator');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health/detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.dependencies).toBeDefined();
    });

    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should return JSON metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should return system info', async () => {
      const response = await request(app)
        .get('/api/monitoring/system/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBeDefined();
      expect(response.body.data.nodeVersion).toBeDefined();
    });

    it('should return alert status for admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.activeAlerts).toBeDefined();
      expect(response.body.data.rules).toBeDefined();
      expect(response.body.data.channels).toBeDefined();
    });

    it('should trigger manual alert for admin users', async () => {
      const response = await request(app)
        .post('/api/monitoring/alerts/trigger')
        .send({
          ruleId: 'test-rule',
          message: 'Test alert'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return performance statistics for admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.performance).toBeDefined();
    });

    it('should return dependencies status', async () => {
      const response = await request(app)
        .get('/api/monitoring/dependencies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dependencies).toBeDefined();
    });

    it('should return MCP metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/mcp/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mcp).toBeDefined();
    });

    it('should return MCP services status', async () => {
      const response = await request(app)
        .get('/api/monitoring/mcp/services/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
    });

    it('should clear metrics for admin users', async () => {
      const response = await request(app)
        .post('/api/monitoring/metrics/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete request lifecycle with monitoring', async () => {
      const infoSpy = vi.spyOn(logger, 'info');
      const recordSpy = vi.spyOn(metrics, 'recordHttpRequest');
      
      const response = await request(app)
        .get('/test')
        .set('User-Agent', 'TestAgent/1.0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP GET /test'),
        expect.objectContaining({
          method: 'GET',
          endpoint: '/test',
          userAgent: 'TestAgent/1.0'
        })
      );
      expect(recordSpy).toHaveBeenCalledWith('GET', '/test', 200, expect.any(Number));
    });

    it('should handle error responses with monitoring', async () => {
      // Agregar ruta que genera error
      app.get('/error', () => {
        throw new Error('Test error');
      });

      const errorSpy = vi.spyOn(logger, 'error');
      const recordSpy = vi.spyOn(metrics, 'recordHttpRequest');
      
      const response = await request(app)
        .get('/error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP GET /error failed'),
        expect.objectContaining({
          method: 'GET',
          endpoint: '/error',
          statusCode: 500
        })
      );
      expect(recordSpy).toHaveBeenCalledWith('GET', '/error', 500, expect.any(Number));
    });
  });
});