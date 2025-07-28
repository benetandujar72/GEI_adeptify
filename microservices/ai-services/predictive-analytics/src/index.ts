import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { logger, logHttpRequest } from './utils/logger.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();
const PORT = process.env.PORT || 3006;

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
const analyticsLimiter = rateLimit({
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
app.use('/api/analytics', analyticsLimiter);
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
    message: 'Predictive Analytics Service',
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
    service: 'Predictive Analytics Service',
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
    message: 'Predictive Analytics Service API',
    version: '1.0.0',
    description: 'AI-powered predictive analytics service for educational insights',
    endpoints: {
      '/api/analytics': {
        description: 'Predictive analytics endpoints',
        methods: {
          'POST /predict/student-performance': 'Predict student performance',
          'POST /predict/course-success': 'Predict course success rate',
          'POST /recommendations/learning-path': 'Generate learning path recommendations',
          'POST /early-warning': 'Generate early warning alerts',
          'POST /analyze/engagement': 'Analyze student engagement',
          'POST /predict/realtime': 'Real-time predictions',
          'POST /predict/batch': 'Batch predictions',
          'GET /predict/batch/:batchId': 'Get batch prediction status',
          'POST /analyze/data': 'Analyze educational data',
          'POST /models/train': 'Train predictive models',
          'GET /metrics': 'Get service metrics',
          'GET /models': 'Get active models',
          'GET /health': 'Health check',
        },
      },
    },
    features: [
      'Student performance prediction',
      'Course success rate prediction',
      'Learning path recommendations',
      'Early warning system',
      'Engagement analysis',
      'Real-time predictions',
      'Batch processing',
      'Data analysis and insights',
      'Model training and management',
      'Comprehensive metrics and monitoring',
    ],
    technologies: [
      'Node.js 18+',
      'TypeScript',
      'Express.js',
      'Zod validation',
      'Winston logging',
      'Helmet security',
      'Rate limiting',
      'LLM Gateway integration',
    ],
  });
});

// Montar rutas de analytics
app.use('/api/analytics', analyticsRoutes);

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
      'POST /api/analytics/predict/student-performance',
      'POST /api/analytics/predict/course-success',
      'POST /api/analytics/recommendations/learning-path',
      'POST /api/analytics/early-warning',
      'POST /api/analytics/analyze/engagement',
      'POST /api/analytics/predict/realtime',
      'POST /api/analytics/predict/batch',
      'GET /api/analytics/predict/batch/:batchId',
      'POST /api/analytics/analyze/data',
      'POST /api/analytics/models/train',
      'GET /api/analytics/metrics',
      'GET /api/analytics/models',
      'GET /api/analytics/health',
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
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`Predictive Analytics Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API documentation: http://localhost:${PORT}/api`);
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