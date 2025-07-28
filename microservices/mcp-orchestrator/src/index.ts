import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger, logHttpRequest, logOrchestratorEvent } from './utils/logger.js';
import orchestratorRoutes from './routes/orchestrator.routes.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3008;

// ===== CONFIGURACIÓN DE SEGURIDAD =====

// Helmet para headers de seguridad
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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
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
}));

// Rate limiting
const orchestratorLimiter = rateLimit({
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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 requests por ventana
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting
app.use('/api/orchestrator', orchestratorLimiter);
app.use(generalLimiter);

// ===== MIDDLEWARE DE PROCESAMIENTO =====

// Compresión
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Logging middleware
app.use(logHttpRequest);

// ===== RUTAS BÁSICAS =====

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MCP Orchestrator Service',
    version: '1.0.0',
    description: 'Central orchestration and routing layer for EduAI Platform',
    endpoints: {
      health: '/health',
      api: '/api/orchestrator',
      docs: '/api/docs'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
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
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MCP Orchestrator API',
    version: '1.0.0',
    endpoints: {
      // Router endpoints
      'POST /api/orchestrator/route': 'Route MCP request to appropriate service',
      'GET /api/orchestrator/services': 'Get all registered services',
      'GET /api/orchestrator/services/:serviceId': 'Get specific service info',
      'GET /api/orchestrator/metrics': 'Get router metrics',
      
      // Context manager endpoints
      'POST /api/orchestrator/contexts': 'Create new context',
      'GET /api/orchestrator/contexts/:contextId': 'Get context by ID',
      'PUT /api/orchestrator/contexts/:contextId': 'Update context',
      'DELETE /api/orchestrator/contexts/:contextId': 'Delete context',
      'POST /api/orchestrator/contexts/search': 'Search contexts',
      'GET /api/orchestrator/contexts/user/:userId': 'Get contexts by user',
      'GET /api/orchestrator/contexts/session/:sessionId': 'Get contexts by session',
      'GET /api/orchestrator/contexts/metrics': 'Get context manager metrics',
      
      // AI Agent Coordinator endpoints
      'POST /api/orchestrator/agents': 'Register new AI agent',
      'GET /api/orchestrator/agents': 'Get all agents',
      'GET /api/orchestrator/agents/:agentId': 'Get specific agent',
      'GET /api/orchestrator/agents/type/:type': 'Get agents by type',
      'POST /api/orchestrator/tasks': 'Create new task',
      'GET /api/orchestrator/tasks': 'Get all tasks',
      'GET /api/orchestrator/tasks/:taskId': 'Get specific task',
      'POST /api/orchestrator/workflows': 'Create new workflow',
      'GET /api/orchestrator/workflows': 'Get all workflows',
      'GET /api/orchestrator/workflows/:workflowId': 'Get specific workflow',
      'POST /api/orchestrator/workflows/:workflowId/execute': 'Execute workflow',
      'GET /api/orchestrator/agents/metrics': 'Get agent coordinator metrics',
      
      // General endpoints
      'GET /api/orchestrator/health': 'Get orchestrator health status',
      'GET /api/orchestrator/metrics': 'Get all metrics'
    },
    documentation: {
      swagger: '/api/docs/swagger',
      postman: '/api/docs/postman'
    }
  });
});

// ===== RUTAS DE LA API =====

// Montar rutas del orquestador
app.use('/api/orchestrator', orchestratorRoutes);

// ===== WEBSOCKET HANDLING =====

io.on('connection', (socket) => {
  logOrchestratorEvent('websocket_connected', {
    socketId: socket.id,
    address: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });

  // Manejar eventos de orquestación en tiempo real
  socket.on('subscribe_metrics', (data) => {
    socket.join('metrics');
    logOrchestratorEvent('metrics_subscription', {
      socketId: socket.id,
      data
    });
  });

  socket.on('subscribe_services', (data) => {
    socket.join('services');
    logOrchestratorEvent('services_subscription', {
      socketId: socket.id,
      data
    });
  });

  socket.on('subscribe_agents', (data) => {
    socket.join('agents');
    logOrchestratorEvent('agents_subscription', {
      socketId: socket.id,
      data
    });
  });

  socket.on('subscribe_contexts', (data) => {
    socket.join('contexts');
    logOrchestratorEvent('contexts_subscription', {
      socketId: socket.id,
      data
    });
  });

  socket.on('disconnect', (reason) => {
    logOrchestratorEvent('websocket_disconnected', {
      socketId: socket.id,
      reason
    });
  });

  socket.on('error', (error) => {
    logger.error('WebSocket error', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  });
});

// ===== MANEJO DE ERRORES =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // No enviar stack trace en producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? (error instanceof Error ? error.message : 'Unknown error') : 'Something went wrong',
    ...(isDevelopment && { stack: error instanceof Error ? error.stack : undefined }),
    timestamp: new Date().toISOString()
  });
});

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Cerrar conexiones de WebSocket
    io.close(() => {
      logger.info('WebSocket server closed');
      
      // Limpiar recursos de los servicios
      try {
        // Aquí se podrían agregar limpiezas específicas de los servicios
        logger.info('Services cleanup completed');
      } catch (error) {
        logger.error('Error during services cleanup', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      process.exit(0);
    });
  });
};

// ===== INICIALIZACIÓN DEL SERVIDOR =====

server.listen(PORT, () => {
  logger.info(`🚀 MCP Orchestrator Service started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });

  logOrchestratorEvent('service_started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ===== MANEJO DE SEÑALES =====

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // En producción, es mejor cerrar el proceso
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Manejo de promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
  
  // En producción, es mejor cerrar el proceso
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ===== MONITOREO DE MEMORIA =====

if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    logger.debug('Memory usage', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
    });
  }, 300000); // Cada 5 minutos
}

export default app; 