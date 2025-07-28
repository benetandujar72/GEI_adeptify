import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Importar middleware
import { errorHandler } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { validationMiddleware } from './middleware/validation.middleware.js';
import { loggingMiddleware } from './middleware/logging.middleware.js';

// Importar servicios
import { logger } from './utils/logger.js';
import { DatabaseService } from './services/database.service.js';
import { RedisService } from './services/redis.service.js';

// Configurar variables de entorno
dotenv.config();

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

const PORT = process.env.PORT || 3001;

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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por ventana
  message: {
    success: false,
    error: 'Demasiados intentos de login. Intente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    error: 'Demasiados requests desde esta IP. Intente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting
app.use('/api/v1/auth', authLimiter);
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

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== MIDDLEWARE PERSONALIZADO =====

// Logging middleware
app.use(loggingMiddleware);

// ===== RUTAS =====

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User Service is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);
app.use('/api/v1/admin', authMiddleware, adminRoutes);

// ===== WEBSOCKET HANDLERS =====

io.on('connection', (socket) => {
  logger.info('Cliente conectado al User Service', {
    socketId: socket.id,
    ip: socket.handshake.address
  });

  socket.on('user:status', (data) => {
    // Manejar cambios de estado de usuario
    logger.info('Cambio de estado de usuario', {
      socketId: socket.id,
      data
    });
  });

  socket.on('disconnect', () => {
    logger.info('Cliente desconectado del User Service', {
      socketId: socket.id
    });
  });
});

// ===== MIDDLEWARE DE ERROR =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// ===== INICIALIZACIÓN DE SERVICIOS =====

async function initializeServices() {
  try {
    // Inicializar base de datos
    const databaseService = new DatabaseService();
    await databaseService.initialize();
    logger.info('Base de datos inicializada correctamente');

    // Inicializar Redis
    const redisService = new RedisService();
    await redisService.initialize();
    logger.info('Redis inicializado correctamente');

    // Verificar conectividad con otros servicios
    await checkServiceConnections();

  } catch (error) {
    logger.error('Error inicializando servicios', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    process.exit(1);
  }
}

async function checkServiceConnections() {
  try {
    // Verificar conexión con MCP Orchestrator
    const mcpOrchestratorUrl = process.env.MCP_ORCHESTRATOR_URL || 'http://localhost:3008';
    const response = await fetch(`${mcpOrchestratorUrl}/health`);
    
    if (response.ok) {
      logger.info('Conexión con MCP Orchestrator establecida');
    } else {
      logger.warn('No se pudo conectar con MCP Orchestrator');
    }

  } catch (error) {
    logger.warn('Error verificando conexiones de servicio', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

// ===== MANEJO DE SEÑALES =====

const gracefulShutdown = (signal: string) => {
  logger.info(`Recibida señal ${signal}. Iniciando cierre graceful...`);
  
  server.close(() => {
    logger.info('Servidor HTTP cerrado');
    process.exit(0);
  });

  // Forzar cierre después de 30 segundos
  setTimeout(() => {
    logger.error('Forzando cierre del servidor');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===== MANEJO DE ERRORES NO CAPTURADOS =====

process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada', {
    reason: reason instanceof Error ? reason.message : reason,
    promise
  });
  process.exit(1);
});

// ===== INICIO DEL SERVIDOR =====

async function startServer() {
  try {
    // Inicializar servicios
    await initializeServices();

    // Iniciar servidor
    server.listen(PORT, () => {
      logger.info(`🚀 User Service iniciado en puerto ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString()
      });

      // Log de configuración
      logger.info('Configuración del servicio:', {
        corsOrigin: process.env.CORS_ORIGIN || '*',
        databaseUrl: process.env.DATABASE_URL ? 'Configurado' : 'No configurado',
        redisUrl: process.env.REDIS_URL ? 'Configurado' : 'No configurado',
        jwtSecret: process.env.JWT_SECRET ? 'Configurado' : 'No configurado',
        mcpOrchestratorUrl: process.env.MCP_ORCHESTRATOR_URL || 'http://localhost:3008'
      });
    });

  } catch (error) {
    logger.error('Error iniciando servidor', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

export default app; 