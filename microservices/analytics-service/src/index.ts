import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { checkConnection, initializeTables } from './database';
import analyticsRoutes from './routes/analytics.routes';
import reportsRoutes from './routes/reports.routes';
import dashboardRoutes from './routes/dashboard.routes';
import metricsRoutes from './routes/metrics.routes';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// ===== MIDDLEWARE DE SEGURIDAD =====

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
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
  max: 200, // máximo 200 requests por ventana
  message: {
    success: false,
    error: 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting específico para reportes pesados
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 reportes por ventana
  message: {
    success: false,
    error: 'Demasiados reportes solicitados, intenta de nuevo en 15 minutos'
  },
});
app.use('/analytics/reports', reportLimiter);

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
      service: 'analytics-service',
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbConnected ? 'connected' : 'disconnected',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: [
        'Real-time analytics',
        'Custom reports',
        'Data visualization',
        'Export capabilities',
        'Dashboard builder'
      ]
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      service: 'analytics-service',
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Analytics Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Real-time analytics',
      'Custom reports',
      'Data visualization',
      'Export capabilities',
      'Dashboard builder',
      'Performance metrics',
      'User behavior tracking',
      'Business intelligence'
    ]
  });
});

// API routes
app.use('/analytics', analyticsRoutes);
app.use('/reports', reportsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/metrics', metricsRoutes);

// ===== MIDDLEWARE DE ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ===== INICIALIZACIÓN DEL SERVIDOR =====

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    const dbConnected = await checkConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }
    
    logger.info('Database connection established');
    
    // Inicializar tablas si es necesario
    await initializeTables();
    logger.info('Database tables initialized');
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      logger.info(`🚀 Analytics Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📈 Analytics API: http://localhost:${PORT}/analytics`);
      logger.info(`📋 Reports API: http://localhost:${PORT}/reports`);
      logger.info(`📊 Dashboard API: http://localhost:${PORT}/dashboard`);
      logger.info(`📊 Metrics API: http://localhost:${PORT}/metrics`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ===== MANEJO DE SEÑALES =====

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Cerrar servidor HTTP
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===== INICIAR SERVIDOR =====

startServer();