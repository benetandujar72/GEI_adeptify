import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import courseRoutes from './routes/course.routes';

const app = express();
const PORT = process.env.PORT || 3002;

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
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ===== MIDDLEWARE DE PARSING =====

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== MIDDLEWARE DE LOGGING =====

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ===== RUTAS =====

// Health check básico
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Course Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', courseRoutes);

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
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  // Si es un error de validación de Zod
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors
    });
  }
  
  // Si es un error de base de datos
  if (error.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      details: error.detail
    });
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      success: false,
      error: 'Referenced resource does not exist',
      details: error.detail
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// ===== INICIO DEL SERVIDOR =====

const server = app.listen(PORT, () => {
  logger.info(`🚀 Course Service running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api`);
});

// ===== EVENT HANDLERS =====

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app; 