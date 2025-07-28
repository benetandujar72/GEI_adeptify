import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger, logHttpRequest, logWebSocketEvent } from './utils/logger.js';
import chatbotRoutes from './routes/chatbot.routes.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3007;

// Configuración de seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Configuración de CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por ventana
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting
app.use('/api/chatbot', chatbotLimiter);
app.use(generalLimiter);

// Middleware de compresión
app.use(compression());

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use(logHttpRequest);

// Rutas básicas
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chatbot Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Chatbot Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chatbot Service API',
    version: '1.0.0',
    description: 'AI-powered conversational chatbot service for educational assistance',
    endpoints: {
      '/api/chatbot': {
        description: 'Chatbot endpoints',
        methods: {
          'POST /chat': 'Process chat message',
          'POST /sessions': 'Create new chat session',
          'GET /sessions/:sessionId': 'Get session details',
          'PUT /sessions/:sessionId/close': 'Close session',
          'GET /sessions/:sessionId/messages': 'Get session messages',
          'GET /personalities': 'Get all personalities',
          'GET /personalities/:personalityId': 'Get specific personality',
          'POST /personalities': 'Create new personality',
          'GET /flows': 'Get all conversation flows',
          'GET /flows/:flowId': 'Get specific flow',
          'POST /feedback': 'Submit feedback',
          'GET /sessions/:sessionId/analytics': 'Get session analytics',
          'GET /metrics': 'Get service metrics',
          'GET /health': 'Health check',
        },
      },
    },
    features: [
      'Real-time chat processing',
      'Session management',
      'Multiple personalities',
      'Conversation flows',
      'Educational insights',
      'Feedback collection',
      'Analytics and metrics',
      'WebSocket support',
      'File attachments',
      'Context awareness',
    ],
    technologies: [
      'Node.js 18+',
      'TypeScript',
      'Express.js',
      'Socket.io',
      'Zod validation',
      'Winston logging',
      'Helmet security',
      'Rate limiting',
      'LLM Gateway integration',
    ],
  });
});

// Montar rutas del chatbot
app.use('/api/chatbot', chatbotRoutes);

// WebSocket handling
io.on('connection', (socket) => {
  logWebSocketEvent('connected', socket.id, 'anonymous', {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
  });

  // Join session room
  socket.on('join-session', (data) => {
    const { sessionId, userId } = data;
    socket.join(sessionId);
    
    logWebSocketEvent('joined-session', sessionId, userId, {
      socketId: socket.id,
    });

    socket.emit('session-joined', { sessionId, userId });
  });

  // Handle chat messages
  socket.on('chat-message', async (data) => {
    try {
      const { sessionId, userId, message, context, options } = data;
      
      // Process message through chatbot service
      // This would integrate with the ChatbotService
      
      // Broadcast to session room
      socket.to(sessionId).emit('chat-message', {
        sessionId,
        userId,
        message: 'Response from chatbot...', // This would be the actual response
        timestamp: new Date().toISOString(),
      });

      logWebSocketEvent('message-sent', sessionId, userId, {
        messageLength: message.length,
        hasContext: !!context,
      });
    } catch (error) {
      logger.error('WebSocket message error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
      
      socket.emit('error', {
        message: 'Error processing message',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { sessionId, userId } = data;
    socket.to(sessionId).emit('user-typing', { userId, isTyping: true });
  });

  socket.on('typing-stop', (data) => {
    const { sessionId, userId } = data;
    socket.to(sessionId).emit('user-typing', { userId, isTyping: false });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logWebSocketEvent('disconnected', socket.id, 'anonymous', {
      reason,
      ip: socket.handshake.address,
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error('WebSocket error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      socketId: socket.id,
    });
  });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api',
      'POST /api/chatbot/chat',
      'POST /api/chatbot/sessions',
      'GET /api/chatbot/sessions/:sessionId',
      'PUT /api/chatbot/sessions/:sessionId/close',
      'GET /api/chatbot/sessions/:sessionId/messages',
      'GET /api/chatbot/personalities',
      'GET /api/chatbot/personalities/:personalityId',
      'POST /api/chatbot/personalities',
      'GET /api/chatbot/flows',
      'GET /api/chatbot/flows/:flowId',
      'POST /api/chatbot/feedback',
      'GET /api/chatbot/sessions/:sessionId/analytics',
      'GET /api/chatbot/metrics',
      'GET /api/chatbot/health',
    ],
  });
});

// Middleware de manejo de errores global
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  // Error de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
      details: error.details,
    });
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token',
    });
  }

  // Error de base de datos
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'Database connection failed',
    });
  }

  // Error de rate limiting
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
    });
  }

  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// Función de cierre graceful
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    io.close(() => {
      logger.info('WebSocket server closed');
      process.exit(0);
    });
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Iniciar servidor
server.listen(PORT, () => {
  logger.info(`Chatbot Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API documentation: http://localhost:${PORT}/api`);
  logger.info(`WebSocket server: ws://localhost:${PORT}`);
});

// Manejar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app; 