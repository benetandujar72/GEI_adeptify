import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;

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
        'X-Priority'
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
        'X-Priority'
      ]
    };

// --- Middlewares de Seguridad ---
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

// --- Rate Limiting ---
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
  }
});

app.use(gatewayLimiter);

// --- Configuración de Microservicios ---
const MICROSERVICES = {
  // Servicios Core
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  students: process.env.STUDENT_SERVICE_URL || 'http://localhost:3002',
  courses: process.env.COURSE_SERVICE_URL || 'http://localhost:3003',
  
  // Servicios de Negocio
  resources: process.env.RESOURCE_SERVICE_URL || 'http://localhost:3004',
  communications: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3005',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
  
  // Servicios AI
  llm: process.env.LLM_GATEWAY_URL || 'http://localhost:3007',
  ai: process.env.AI_SERVICES_URL || 'http://localhost:3008',
  
  // MCP Services
  mcp: process.env.MCP_ORCHESTRATOR_URL || 'http://localhost:3009',
  
  // Legacy (Monolito actual)
  legacy: process.env.API_SERVER_URL || 'http://localhost:3000'
};

// --- Reglas de Enrutamiento Inteligente ---

// MCP Orchestrator - Maneja todas las peticiones MCP
app.use('/api/mcp', createProxyMiddleware({
  target: MICROSERVICES.mcp,
  changeOrigin: true,
  pathRewrite: {
    '^/api/mcp': '/mcp',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] MCP Request: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.mcp}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] MCP Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'MCP Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// User Service
app.use('/api/v1/users', createProxyMiddleware({
  target: MICROSERVICES.users,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/users': '/users',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] User Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.users}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] User Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'User Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// Student Service
app.use('/api/v1/students', createProxyMiddleware({
  target: MICROSERVICES.students,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/students': '/students',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] Student Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.students}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] Student Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'Student Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// Course Service
app.use('/api/v1/courses', createProxyMiddleware({
  target: MICROSERVICES.courses,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/courses': '/courses',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] Course Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.courses}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] Course Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'Course Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// Resource Service
app.use('/api/v1/resources', createProxyMiddleware({
  target: MICROSERVICES.resources,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/resources': '/resources',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] Resource Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.resources}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] Resource Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'Resource Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// Communication Service
app.use('/api/v1/communications', createProxyMiddleware({
  target: MICROSERVICES.communications,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/communications': '/communications',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] Communication Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.communications}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] Communication Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'Communication Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// Analytics Service
app.use('/api/v1/analytics', createProxyMiddleware({
  target: MICROSERVICES.analytics,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/analytics': '/analytics',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] Analytics Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.analytics}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] Analytics Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'Analytics Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// AI Services
app.use('/api/ai', createProxyMiddleware({
  target: MICROSERVICES.ai,
  changeOrigin: true,
  pathRewrite: {
    '^/api/ai': '/ai',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] AI Service: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.ai}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] AI Service Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'AI Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// LLM Gateway
app.use('/api/llm', createProxyMiddleware({
  target: MICROSERVICES.llm,
  changeOrigin: true,
  pathRewrite: {
    '^/api/llm': '/llm',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] LLM Gateway: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.llm}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] LLM Gateway Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'LLM Gateway temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// Fallback al monolito actual para rutas no migradas
app.use('/api', createProxyMiddleware({
  target: MICROSERVICES.legacy,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`[Gateway] Legacy Fallback: ${req.method} ${req.originalUrl} -> ${MICROSERVICES.legacy}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    logger.error('[Gateway] Legacy Proxy Error:', err);
    res.status(503).json({ 
      success: false, 
      error: 'API Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
}));

// --- Health Check del Gateway ---
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'Gateway is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: Object.keys(MICROSERVICES)
  });
});

// --- Status de Microservicios ---
app.get('/status', async (req, res) => {
  const serviceStatus = {};
  
  for (const [serviceName, serviceUrl] of Object.entries(MICROSERVICES)) {
    try {
      const response = await fetch(`${serviceUrl}/health`);
      serviceStatus[serviceName] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: serviceUrl,
        responseTime: response.headers.get('x-response-time') || 'unknown'
      };
    } catch (error) {
      serviceStatus[serviceName] = {
        status: 'unreachable',
        url: serviceUrl,
        error: error.message
      };
    }
  }
  
  res.status(200).json({
    gateway: 'healthy',
    timestamp: new Date().toISOString(),
    services: serviceStatus
  });
});

// --- Error Handler ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('[Gateway] Unhandled Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Gateway Error',
    timestamp: new Date().toISOString()
  });
});

// --- 404 Handler ---
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 API Gateway escuchando en el puerto ${PORT}`);
  logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Microservicios configurados:`, MICROSERVICES);
});
