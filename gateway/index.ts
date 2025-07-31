import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger.js';
import { CircuitBreaker } from './utils/circuit-breaker.js';
import { ServiceDiscovery } from './utils/service-discovery.js';
import { LoadBalancer } from './utils/load-balancer.js';
import { CacheManager } from './utils/cache-manager.js';
import { MetricsCollector } from './utils/metrics-collector.js';
import { RequestValidator } from './utils/request-validator.js';
import { ResponseTransformer } from './utils/response-transformer.js';

// NO usar dotenv - las variables vienen del sistema
// dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;

// --- Inicialización de servicios avanzados ---
const circuitBreaker = new CircuitBreaker();
const serviceDiscovery = new ServiceDiscovery();
const loadBalancer = new LoadBalancer();
const cacheManager = new CacheManager();
const metricsCollector = new MetricsCollector();
const requestValidator = new RequestValidator();
const responseTransformer = new ResponseTransformer();

// --- Configuración de CORS ---
const corsConfig = process.env.NODE_ENV === 'production' 
  ? {
      origin: [
        'https://gei.adeptify.es',
        'https://www.gei.adeptify.es',
        'https://admin.gei.adeptify.es'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'X-User-ID',
        'X-Session-ID',
        'X-Priority',
        'X-Cache-Control',
        'X-Response-Time'
      ]
    }
  : {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'X-User-ID',
        'X-Session-ID',
        'X-Priority',
        'X-Cache-Control',
        'X-Response-Time'
      ]
    };

// --- Middlewares de Seguridad Avanzados ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors(corsConfig));

// --- Rate Limiting Avanzado ---
const gatewayLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/health' || req.path === '/metrics';
  }
});

app.use(gatewayLimiter);

// --- Middleware de Métricas y Logging ---
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log request
  logger.info(`Request started`, {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Collect metrics
  metricsCollector.recordRequest(req.method, req.path);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log response
    logger.info(`Request completed`, {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    });
    
    // Collect metrics
    metricsCollector.recordResponse(req.method, req.path, res.statusCode, duration);
  });
  
  next();
});

// --- Configuración de Microservicios con Service Discovery ---
const MICROSERVICES = {
  // Servicios Core
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  students: process.env.STUDENT_SERVICE_URL || 'http://localhost:3002',
  courses: process.env.COURSE_SERVICE_URL || 'http://localhost:3003',
  resources: process.env.RESOURCE_SERVICE_URL || 'http://localhost:3004',
  communications: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3005',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
  
  // Servicios de Autenticación y Notificaciones
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3007',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
  
  // Servicios de Archivos y Búsqueda
  files: process.env.FILE_SERVICE_URL || 'http://localhost:3009',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3010',
  
  // Servicios AI y LLM
  llm: process.env.LLM_GATEWAY_URL || 'http://localhost:3011',
  ai: process.env.AI_SERVICES_URL || 'http://localhost:3012',
  
  // Servicios MCP
  mcp: process.env.MCP_ORCHESTRATOR_URL || 'http://localhost:3013',
  mcpServers: process.env.MCP_SERVERS_URL || 'http://localhost:3014'
};

// --- Health Check Endpoint ---
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await serviceDiscovery.checkAllServices();
    const circuitBreakerStatus = circuitBreaker.getStatus();
    const cacheStatus = cacheManager.getStatus();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: healthStatus,
      circuitBreaker: circuitBreakerStatus,
      cache: cacheStatus,
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// --- Metrics Endpoint ---
app.get('/metrics', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  res.json(metrics);
});

// --- Service Discovery Endpoint ---
app.get('/services', (req, res) => {
  const services = serviceDiscovery.getAllServices();
  res.json(services);
});

// --- Cache Management Endpoints ---
app.post('/cache/clear', (req, res) => {
  try {
    cacheManager.clearAll();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Cache clear failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/cache/stats', (req, res) => {
  const stats = cacheManager.getStats();
  res.json(stats);
});

// --- Circuit Breaker Management ---
app.get('/circuit-breaker/status', (req, res) => {
  const status = circuitBreaker.getStatus();
  res.json(status);
});

app.post('/circuit-breaker/reset/:service', (req, res) => {
  try {
    const { service } = req.params;
    circuitBreaker.reset(service);
    res.json({ success: true, message: `Circuit breaker reset for ${service}` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// --- Proxy Middleware Factory con funcionalidades avanzadas ---
const createAdvancedProxy = (serviceName: string, targetUrl: string) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    logLevel: 'silent',
    
    // Request transformation
    onProxyReq: (proxyReq, req, res) => {
      // Add request validation
      const validationResult = requestValidator.validate(req);
      if (!validationResult.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validationResult.errors
        });
        return;
      }
      
      // Add circuit breaker check
      if (!circuitBreaker.isAvailable(serviceName)) {
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable',
          service: serviceName
        });
        return;
      }
      
      // Add cache check for GET requests
      if (req.method === 'GET') {
        const cachedResponse = cacheManager.get(req.url);
        if (cachedResponse) {
          res.json(cachedResponse);
          return;
        }
      }
      
      // Add load balancer selection
      const selectedTarget = loadBalancer.select(serviceName, targetUrl);
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Request-ID', req.requestId);
      proxyReq.setHeader('X-User-ID', req.headers['x-user-id'] || 'anonymous');
      
      logger.debug(`Proxying request to ${serviceName}`, {
        requestId: req.requestId,
        target: selectedTarget,
        method: req.method,
        url: req.url
      });
    },
    
    // Response transformation
    onProxyRes: (proxyRes, req, res) => {
      // Transform response
      const transformedResponse = responseTransformer.transform(proxyRes, req);
      
      // Cache successful GET responses
      if (req.method === 'GET' && proxyRes.statusCode === 200) {
        cacheManager.set(req.url, transformedResponse);
      }
      
      // Update circuit breaker status
      circuitBreaker.recordResult(serviceName, proxyRes.statusCode < 500);
      
      // Update load balancer metrics
      loadBalancer.recordResponse(serviceName, proxyRes.statusCode, Date.now());
      
      logger.debug(`Response received from ${serviceName}`, {
        requestId: req.requestId,
        statusCode: proxyRes.statusCode,
        responseTime: res.getHeader('X-Response-Time')
      });
    },
    
    // Error handling
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${serviceName}`, {
        requestId: req.requestId,
        error: err.message,
        url: req.url
      });
      
      // Update circuit breaker
      circuitBreaker.recordResult(serviceName, false);
      
      // Return cached response if available
      if (req.method === 'GET') {
        const cachedResponse = cacheManager.get(req.url);
        if (cachedResponse) {
          res.json(cachedResponse);
          return;
        }
      }
      
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        service: serviceName,
        message: 'The requested service is currently unavailable. Please try again later.'
      });
    }
  });
};

// --- Configuración de rutas con proxy avanzado ---
app.use('/api/users', createAdvancedProxy('users', MICROSERVICES.users));
app.use('/api/students', createAdvancedProxy('students', MICROSERVICES.students));
app.use('/api/courses', createAdvancedProxy('courses', MICROSERVICES.courses));
app.use('/api/resources', createAdvancedProxy('resources', MICROSERVICES.resources));
app.use('/api/communications', createAdvancedProxy('communications', MICROSERVICES.communications));
app.use('/api/analytics', createAdvancedProxy('analytics', MICROSERVICES.analytics));
app.use('/api/auth', createAdvancedProxy('auth', MICROSERVICES.auth));
app.use('/api/notifications', createAdvancedProxy('notifications', MICROSERVICES.notifications));
app.use('/api/files', createAdvancedProxy('files', MICROSERVICES.files));
app.use('/api/search', createAdvancedProxy('search', MICROSERVICES.search));
app.use('/api/llm', createAdvancedProxy('llm', MICROSERVICES.llm));
app.use('/api/ai', createAdvancedProxy('ai', MICROSERVICES.ai));
app.use('/api/mcp', createAdvancedProxy('mcp', MICROSERVICES.mcp));
app.use('/api/mcp-servers', createAdvancedProxy('mcpServers', MICROSERVICES.mcpServers));

// --- Error handling middleware ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.requestId
  });
});

// --- 404 handler ---
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.url
  });
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    requestId: req.requestId
  });
});

// --- Inicialización del servidor ---
const server = app.listen(PORT, () => {
  logger.info(`🚀 API Gateway iniciado en puerto ${PORT}`);
  logger.info(`📊 Métricas disponibles en /metrics`);
  logger.info(`🏥 Health check disponible en /health`);
  logger.info(`🔍 Service discovery disponible en /services`);
});

// --- Graceful shutdown ---
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

export default app;
