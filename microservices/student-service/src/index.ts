import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { checkConnection, initializeTables } from './database';
import studentRoutes from './routes/student.routes';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

// ===== MIDDLEWARE DE SEGURIDAD =====

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compresión
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    error: 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting específico para endpoints de creación
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 requests de creación por ventana
  message: {
    success: false,
    error: 'Demasiadas requests de creación, intenta de nuevo en 15 minutos'
  },
});

// ===== MIDDLEWARE DE PARSING =====

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== MIDDLEWARE DE LOGGING =====

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ===== RUTAS =====

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkConnection();
    const status = dbConnected ? 'healthy' : 'unhealthy';
    const statusCode = dbConnected ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      service: 'student-service',
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbConnected ? 'connected' : 'disconnected',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      service: 'student-service',
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

// Métricas básicas
app.get('/metrics', (req, res) => {
  res.json({
    success: true,
    service: 'student-service',
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
    },
  });
});

// API Routes
app.use('/api/students', createLimiter, studentRoutes);

// ===== MIDDLEWARE DE ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
  });
});

// Error handler global
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
  });
});

// ===== INICIALIZACIÓN DEL SERVIDOR =====

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    logger.info('🔍 Verificando conexión a la base de datos...');
    const dbConnected = await checkConnection();
    
    if (!dbConnected) {
      logger.error('❌ No se pudo conectar a la base de datos');
      process.exit(1);
    }
    
    logger.info('✅ Conexión a la base de datos establecida');

    // Inicializar tablas
    logger.info('🔍 Verificando tablas de la base de datos...');
    const tablesInitialized = await initializeTables();
    
    if (!tablesInitialized) {
      logger.error('❌ Error al verificar las tablas de la base de datos');
      process.exit(1);
    }
    
    logger.info('✅ Tablas de la base de datos verificadas');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Student Service iniciado en puerto ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📈 Métricas: http://localhost:${PORT}/metrics`);
      logger.info(`🔗 API: http://localhost:${PORT}/api/students`);
    });

  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// ===== MANEJO DE SEÑALES =====

process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// ===== INICIAR SERVIDOR =====

startServer(); 