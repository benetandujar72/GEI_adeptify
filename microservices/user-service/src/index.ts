import express from 'express';
import compression from 'compression';
import 'express-async-errors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import healthRoutes from './routes/health.routes.js';
import advancedRoutes from './routes/advanced.routes.js';
import monitoringRoutes from './routes/monitoring.routes.js';

// Importar middleware
import { errorHandler } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { loggingMiddleware } from './middleware/logging.middleware.js';

// Importar nuevos middlewares avanzados
import { RateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { CorsMiddleware } from './middleware/cors.middleware.js';
import { SecurityMiddleware } from './middleware/security.middleware.js';
import { MonitoringMiddleware } from './middleware/monitoring.middleware.js';
import { validateSchema, validateContentType, sanitizeHeaders } from './middleware/validation.middleware.js';
import { UserSchemas, AdminSchemas, CommonSchemas } from './middleware/validation.middleware.js';

// Importar servicios
import { logger } from './services/logging.service.js';
import { metrics } from './services/metrics.service.js';
import { alerts } from './services/alerts.service.js';
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

// ===== INICIALIZACIÓN DE SERVICIOS DE MONITOREO =====

// Configurar logging avanzado
const loggingService = logger;

// Configurar métricas de Prometheus
const metricsService = metrics;

// Configurar sistema de alertas
const alertsService = alerts;

// ===== INICIALIZACIÓN DE MIDDLEWARES AVANZADOS =====

// Configurar CORS según entorno
const corsConfig = process.env.NODE_ENV === 'production' 
  ? CorsMiddleware.PRODUCTION_CONFIG 
  : CorsMiddleware.DEVELOPMENT_CONFIG;

const corsMiddleware = new CorsMiddleware(corsConfig);

// Configurar Rate Limiting
const rateLimitMiddleware = new RateLimitMiddleware();

// Configurar Security según entorno
const securityConfig = process.env.NODE_ENV === 'production'
  ? SecurityMiddleware.PRODUCTION_CONFIG
  : SecurityMiddleware.DEVELOPMENT_CONFIG;

const securityMiddleware = new SecurityMiddleware(securityConfig);

// Configurar Monitoring según entorno
const monitoringConfig = process.env.NODE_ENV === 'production'
  ? MonitoringMiddleware.PRODUCTION_CONFIG
  : MonitoringMiddleware.DEVELOPMENT_CONFIG;

const monitoringMiddleware = new MonitoringMiddleware(monitoringConfig);

// ===== CONFIGURACIÓN DE SEGURIDAD AVANZADA =====

// Aplicar todos los middlewares de seguridad
securityMiddleware.complete().forEach(middleware => {
  app.use(middleware);
});

// CORS avanzado
app.use(corsMiddleware.middleware());

// Sanitización de headers
app.use(sanitizeHeaders);

// Validación de content-type
app.use(validateContentType(['application/json']));

// ===== RATE LIMITING AVANZADO =====

// Rate limiting específico para autenticación
app.use('/api/v1/auth', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.AUTH_RATE_LIMIT
));

// Rate limiting general para API
app.use('/api/v1', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.API_RATE_LIMIT
));

// Rate limiting estricto para endpoints sensibles
app.use('/api/v1/admin', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.STRICT_RATE_LIMIT
));

// ===== MIDDLEWARE DE MONITOREO =====

// Middleware principal de monitoreo
app.use(monitoringMiddleware.monitoring());

// Middleware de logging de performance
app.use(monitoringMiddleware.performanceLogging());

// Middleware de auditoría
app.use(monitoringMiddleware.auditLogging());

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
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

// Parsing de URL encoded
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ===== MIDDLEWARE DE LOGGING =====

// Logging middleware (mantener el existente para compatibilidad)
app.use(loggingMiddleware);

// ===== RUTAS CON VALIDACIÓN AVANZADA =====

// Health check básico
app.use('/health', healthRoutes);

// Rutas de monitoreo
app.use('/monitoring', monitoringRoutes);

// Rutas de autenticación con validación
app.use('/api/v1/auth/register', validateSchema(UserSchemas.register));
app.use('/api/v1/auth/login', validateSchema(UserSchemas.login));
app.use('/api/v1/auth', authRoutes);

// Rutas de usuario con autenticación y validación
app.use('/api/v1/users', authMiddleware, validateSchema(CommonSchemas.pagination, 'query'), userRoutes);

// Rutas de admin con autenticación, roles y validación
app.use('/api/v1/admin', authMiddleware, roleMiddleware(['admin']), validateSchema(AdminSchemas.adminAction, 'body'), adminRoutes);

// Rutas avanzadas
app.use('/api/v1/advanced', authMiddleware, advancedRoutes);

// ===== WEBSOCKET HANDLERS =====

io.on('connection', (socket) => {
  logger.info('Cliente conectado via WebSocket', { 
    socketId: socket.id,
    ip: socket.handshake.address 
  });

  socket.on('disconnect', () => {
    logger.info('Cliente desconectado via WebSocket', { socketId: socket.id });
  });

  socket.on('error', (error) => {
    logger.error('Error en WebSocket', { socketId: socket.id, error });
  });
});

// ===== MANEJO DE ERRORES =====

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Ruta no encontrada', { 
    method: req.method, 
    path: req.originalUrl,
    ip: req.ip 
  });
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler global
app.use(errorHandler);

// ===== INICIALIZACIÓN DE SERVICIOS =====

async function initializeServices() {
  logger.info('Inicializando servicios...');
  
  try {
    // Inicializar Redis
    const redisService = new RedisService();
    await redisService.connect();
    logger.info('Redis conectado');

    // Inicializar Database
    const databaseService = new DatabaseService();
    await databaseService.connect();
    logger.info('Database conectada');

    // Inicializar sistema de alertas
    await alertsService.start();
    logger.info('Sistema de alertas iniciado');

    // Actualizar métricas de conexiones
    metricsService.setRedisConnections(1);
    metricsService.setDbConnections(1);

    logger.info('Servicios inicializados correctamente');
  } catch (error) {
    logger.error('Error al inicializar servicios', { error });
    throw error;
  }
}

// ===== VERIFICACIÓN DE CONEXIONES =====

async function checkServiceConnections() {
  try {
    const redisService = new RedisService();
    const databaseService = new DatabaseService();

    // Verificar Redis
    await redisService.ping();
    logger.info('Verificación de Redis: OK');

    // Verificar Database
    await databaseService.ping();
    logger.info('Verificación de Database: OK');

    // Verificar Elasticsearch si está configurado
    if (process.env.ELASTICSEARCH_URL) {
      try {
        const response = await fetch(`${process.env.ELASTICSEARCH_URL}/_cluster/health`);
        if (response.ok) {
          logger.info('Verificación de Elasticsearch: OK');
        } else {
          logger.warn('Verificación de Elasticsearch: FAILED');
        }
      } catch (error) {
        logger.warn('Verificación de Elasticsearch: ERROR', { error });
      }
    }

  } catch (error) {
    logger.error('Error en verificación de conexiones', { error });
    throw error;
  }
}

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = (signal: string) => {
  logger.info(`Recibida señal ${signal}, iniciando shutdown graceful...`);
  
  server.close(async () => {
    logger.info('Servidor HTTP cerrado');
    
    try {
      // Detener sistema de alertas
      await alertsService.stop();
      logger.info('Sistema de alertas detenido');

      // Cerrar conexiones de servicios
      const redisService = new RedisService();
      await redisService.disconnect();
      logger.info('Conexión Redis cerrada');

      const databaseService = new DatabaseService();
      await databaseService.disconnect();
      logger.info('Conexión Database cerrada');

      logger.info('Shutdown graceful completado');
      process.exit(0);
    } catch (error) {
      logger.error('Error durante shutdown graceful', { error });
      process.exit(1);
    }
  });

  // Timeout de 30 segundos para forzar el cierre
  setTimeout(() => {
    logger.error('Shutdown timeout alcanzado, forzando cierre');
    process.exit(1);
  }, 30000);
};

// ===== MANEJADORES DE SEÑALES =====

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===== MANEJADORES DE ERRORES NO CAPTURADOS =====

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
      logger.info(`🚀 User Service iniciado en puerto ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        service: 'user-service',
        version: process.env.npm_package_version || '1.0.0'
      });

      // Log de métricas de inicio
      metricsService.updateMemoryUsage();
      
      // Log de información del sistema
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
  } catch (error) {
    logger.error('Error al iniciar el servidor', { error });
    process.exit(1);
  }
}

// Iniciar el servidor
startServer(); 