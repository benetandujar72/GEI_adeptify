import express from 'express';
import compression from 'compression';
import 'express-async-errors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Importar middlewares de seguridad
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Importar rutas
import llmRoutes from './routes/llm.routes.js';
import contentRoutes from './routes/content.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import monitoringRoutes from './routes/monitoring.routes.js';

// Importar servicios
import { logger } from './services/logging.service.js';
import { metrics } from './services/metrics.service.js';
import RedisService from './services/redis.service.js';
import LLMGatewayService from './services/llm-gateway.service.js';
import ContentGenerationService from './services/content-generation.service.js';
import ChatbotService from './services/chatbot.service.js';
import PredictiveAnalyticsService from './services/predictive-analytics.service.js';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3009;

// ===== CONFIGURACIÓN DE SEGURIDAD =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting específico para LLM
const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requests por minuto
  message: 'Too many LLM requests, please try again later.',
  keyGenerator: (req) => req.headers.authorization || req.ip,
});
app.use('/api/llm', llmLimiter);

// ===== MIDDLEWARE DE PROCESAMIENTO =====
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ===== MIDDLEWARE DE MONITOREO =====
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Agregar request ID a la respuesta
  res.setHeader('X-Request-ID', requestId);
  
  // Log de la petición
  logger.info('HTTP Request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.headers.authorization ? 'authenticated' : 'anonymous'
  });

  // Interceptar la respuesta
  res.on('finish', () => {
    const duration = Date.now() - start;
    const contentLength = res.get('Content-Length') || 0;
    
    // Registrar métricas
    metrics.recordHttpRequest(req.method, req.url, res.statusCode, duration);
    metrics.recordHttpResponseSize(req.method, req.url, res.statusCode, parseInt(contentLength.toString()));
    
    // Log de la respuesta
    logger.info('HTTP Response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: parseInt(contentLength.toString())
    });

    // Log de operaciones lentas
    if (duration > 5000) {
      logger.warn('Slow HTTP request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration
      });
    }
  });

  next();
});

// ===== RUTAS DE LA API =====
app.use('/api/llm', llmRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);

// ===== WEBSOCKET HANDLERS =====
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { 
    socketId: socket.id,
    ip: socket.handshake.address 
  });

  // Manejar mensajes de chat en tiempo real
  socket.on('chat_message', async (data) => {
    try {
      const chatbotService = ChatbotService.getInstance();
      const response = await chatbotService.processMessage(data);
      
      socket.emit('chat_response', response);
      
      // Broadcast a otros clientes si es necesario
      socket.broadcast.emit('chat_message_broadcast', {
        userId: data.userId,
        message: data.message,
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.error('WebSocket chat error', { 
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });
      socket.emit('chat_error', { 
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Manejar predicciones en tiempo real
  socket.on('prediction_request', async (data) => {
    try {
      const analyticsService = PredictiveAnalyticsService.getInstance();
      const response = await analyticsService.predictPerformance(data);
      
      socket.emit('prediction_response', response);
      
    } catch (error) {
      logger.error('WebSocket prediction error', { 
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });
      socket.emit('prediction_error', { 
        error: 'Failed to generate prediction',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });
});

// ===== MANEJO DE ERRORES =====
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    timestamp: new Date().toISOString()
  });
});

// ===== INICIALIZACIÓN DE SERVICIOS =====
async function initializeServices() {
  logger.info('Inicializando servicios de AI Services...');
  
  try {
    // Inicializar Redis
    const redisService = new RedisService();
    await redisService.connect();
    logger.info('Redis conectado para AI Services');

    // Inicializar LLM Gateway
    const llmConfig = {
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          organization: process.env.OPENAI_ORGANIZATION
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY || ''
        },
        cohere: {
          apiKey: process.env.COHERE_API_KEY || ''
        }
      },
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

    const llmGateway = LLMGatewayService.getInstance(llmConfig);
    logger.info('LLM Gateway inicializado');

    // Inicializar Content Generation
    const contentService = ContentGenerationService.getInstance();
    logger.info('Content Generation Service inicializado');

    // Inicializar Chatbot
    const chatbotService = ChatbotService.getInstance();
    logger.info('Chatbot Service inicializado');

    // Inicializar Predictive Analytics
    const analyticsService = PredictiveAnalyticsService.getInstance();
    logger.info('Predictive Analytics Service inicializado');

    // Configurar métricas del sistema
    metrics.setServiceVersion('1.0.0');
    metrics.setServiceHealth('llm_gateway', 1);
    metrics.setServiceHealth('content_generation', 1);
    metrics.setServiceHealth('chatbot', 1);
    metrics.setServiceHealth('predictive_analytics', 1);

    logger.info('Servicios de AI Services inicializados correctamente');
    
  } catch (error) {
    logger.error('Error al inicializar servicios de AI Services', { error });
    throw error;
  }
}

// ===== VERIFICACIÓN DE CONEXIONES =====
async function checkServiceConnections() {
  try {
    const redisService = new RedisService();
    await redisService.ping();
    logger.info('Verificación de Redis: OK');

    // Verificar Elasticsearch si está configurado
    if (process.env.ELASTICSEARCH_URL) {
      try {
        const response = await fetch(`${process.env.ELASTICSEARCH_URL}/_cluster/health`);
        if (response.ok) {
          logger.info('Verificación de Elasticsearch: OK');
          metrics.setElasticsearchConnections(1, 'connected');
        } else {
          logger.warn('Elasticsearch health check failed');
          metrics.setElasticsearchConnections(0, 'error');
        }
      } catch (error) {
        logger.warn('Elasticsearch not available', { error: error instanceof Error ? error.message : String(error) });
        metrics.setElasticsearchConnections(0, 'disconnected');
      }
    }

    logger.info('Verificación de conexiones completada');
    
  } catch (error) {
    logger.error('Error en verificación de conexiones', { error });
    throw error;
  }
}

// ===== SHUTDOWN GRACEFUL =====
const gracefulShutdown = (signal: string) => {
  logger.info(`Recibida señal ${signal}, iniciando shutdown graceful de AI Services...`);
  
  server.close(async () => {
    logger.info('Servidor HTTP cerrado');
    
    io.close(() => {
      logger.info('WebSocket server cerrado');
      
      try {
        // Cerrar conexiones de servicios
        const redisService = new RedisService();
        redisService.disconnect();
        logger.info('Conexión Redis cerrada');
        
        logger.info('Shutdown graceful de AI Services completado');
        process.exit(0);
      } catch (error) {
        logger.error('Error durante shutdown graceful', { error });
        process.exit(1);
      }
    });
  });

  // Timeout de shutdown
  setTimeout(() => {
    logger.error('Shutdown timeout alcanzado, forzando cierre');
    process.exit(1);
  }, 30000);
};

// ===== MANEJADORES DE SEÑALES =====
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada', { reason, promise });
  process.exit(1);
});

// ===== INICIO DEL SERVIDOR =====
async function startServer() {
  try {
    await initializeServices();
    await checkServiceConnections();
    
    server.listen(PORT, () => {
      logger.info(`🚀 AI Services iniciado exitosamente`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        service: 'ai-services',
        version: '1.0.0'
      });

      logger.logServiceStart('ai-services', '1.0.0', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });

      // Configurar métricas iniciales
      metrics.setServiceUptime(0);
      metrics.updateMemoryUsage();
      
      const memUsage = process.memoryUsage();
      logger.info('Información del sistema al inicio', {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        }
      });
    });

    // Actualizar métricas periódicamente
    setInterval(() => {
      metrics.updateMemoryUsage();
      metrics.setServiceUptime(process.uptime());
    }, 30000); // Cada 30 segundos

  } catch (error) {
    logger.error('Error al iniciar el servidor AI Services', { error });
    process.exit(1);
  }
}

startServer();