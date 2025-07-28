import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import llmRoutes from './routes/llm.routes';

const app = express();
const PORT = process.env.PORT || 3003;

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
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting más permisivo para LLM requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por ventana (más permisivo para LLM)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ===== MIDDLEWARE DE PARSING =====

// Parse JSON bodies con límite más alto para LLM requests
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    service: 'LLM Gateway',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Multi-provider LLM support (OpenAI, Anthropic, Google)',
      'Cost tracking and optimization',
      'Caching and rate limiting',
      'Batch processing',
      'Streaming support',
      'Health monitoring'
    ]
  });
});

// API routes
app.use('/api', llmRoutes);

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
  
  // Si es un error de LLM específico
  if (error.provider && error.model) {
    return res.status(500).json({
      success: false,
      error: 'LLM provider error',
      provider: error.provider,
      model: error.model,
      details: error.error
    });
  }
  
  // Si es un error de rate limiting
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: error.retryAfter
    });
  }
  
  // Si es un error de quota
  if (error.code === 'QUOTA_EXCEEDED') {
    return res.status(429).json({
      success: false,
      error: 'Quota exceeded',
      provider: error.provider
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
  logger.info(`🚀 LLM Gateway running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`🤖 API Documentation: http://localhost:${PORT}/api`);
  logger.info(`💰 Cost tracking: http://localhost:${PORT}/api/costs`);
  logger.info(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
  
  // Log available providers
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push('OpenAI');
  if (process.env.ANTHROPIC_API_KEY) providers.push('Anthropic');
  if (process.env.GOOGLE_API_KEY) providers.push('Google');
  
  logger.info(`🔌 Available providers: ${providers.join(', ') || 'None configured'}`);
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