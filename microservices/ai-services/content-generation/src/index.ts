import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { logger, logHttpRequest } from './utils/logger.js';
import contentRoutes from './routes/content.routes.js';

const app = express();
const PORT = process.env.PORT || 3005;

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
const contentLimiter = rateLimit({
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
app.use('/api/content', contentLimiter);
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
    message: 'Content Generation Service',
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
    service: 'Content Generation Service',
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
    message: 'Content Generation Service API',
    version: '1.0.0',
    description: 'AI-powered educational content generation service',
    endpoints: {
      '/api/content': {
        description: 'Content generation endpoints',
        methods: {
          'POST /generate': 'Generate educational content',
          'POST /quiz': 'Generate educational quiz',
          'POST /assignment': 'Generate educational assignment',
          'POST /summary': 'Generate content summary',
          'POST /explanation': 'Generate concept explanation',
          'POST /translate': 'Translate content',
          'POST /adapt': 'Adapt content for different audiences',
          'POST /quality-check': 'Check content quality',
          'GET /metrics': 'Get service metrics',
          'GET /health': 'Health check',
        },
      },
    },
    features: [
      'Multi-format content generation (text, markdown, HTML, PDF, JSON)',
      'Educational content types (lessons, quizzes, assignments, summaries)',
      'Multi-language support',
      'Content translation and adaptation',
      'Quality assessment and improvement',
      'Integration with LLM Gateway',
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

// Montar rutas de contenido
app.use('/api/content', contentRoutes);

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
      'POST /api/content/generate',
      'POST /api/content/quiz',
      'POST /api/content/assignment',
      'POST /api/content/summary',
      'POST /api/content/explanation',
      'POST /api/content/translate',
      'POST /api/content/adapt',
      'POST /api/content/quality-check',
      'GET /api/content/metrics',
      'GET /api/content/health',
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
  logger.info(`Content Generation Service running on port ${PORT}`);
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