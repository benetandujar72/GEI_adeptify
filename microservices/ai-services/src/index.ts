import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { metricsMiddleware } from './middleware/metrics';
import { contentGenerationRoutes } from './routes/content-generation';
import { predictiveAnalyticsRoutes } from './routes/predictive-analytics';
import { personalizationRoutes } from './routes/personalization';
import { mlPipelineRoutes } from './routes/ml-pipeline';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { cacheService } from './services/cache';
import { vectorStoreService } from './services/vector-store';
import { mlModelService } from './services/ml-model';
import { queueService } from './services/queue';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware de seguridad
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
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://gei.adeptify.es'],
  credentials: true,
}));

// Compresión
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: 'Demasiadas requests desde esta IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting específico para AI services
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // máximo 20 requests por minuto
  message: 'Demasiadas requests a AI services desde esta IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Parse JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de métricas
app.use(metricsMiddleware);

// Rutas de salud (sin autenticación)
app.use('/api/health', healthRoutes);

// Middleware de autenticación para rutas protegidas
app.use('/api/ai/content', authMiddleware, aiLimiter, contentGenerationRoutes);
app.use('/api/ai/analytics', authMiddleware, aiLimiter, predictiveAnalyticsRoutes);
app.use('/api/ai/personalization', authMiddleware, aiLimiter, personalizationRoutes);
app.use('/api/ai/pipeline', authMiddleware, aiLimiter, mlPipelineRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Inicializar servicios
async function initializeServices() {
  try {
    await cacheService.initialize();
    await vectorStoreService.initialize();
    await mlModelService.initialize();
    await queueService.initialize();
    logger.info('Servicios AI inicializados correctamente');
  } catch (error) {
    logger.error('Error inicializando servicios AI:', error);
    process.exit(1);
  }
}

// Iniciar servidor
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`🚀 AI Services iniciado en puerto ${PORT}`);
    logger.info(`📊 Métricas disponibles en http://localhost:${PORT}/api/metrics`);
    logger.info(`🏥 Health check en http://localhost:${PORT}/api/health`);
    logger.info(`🤖 Content Generation en http://localhost:${PORT}/api/ai/content`);
    logger.info(`📈 Predictive Analytics en http://localhost:${PORT}/api/ai/analytics`);
    logger.info(`🎯 Personalization en http://localhost:${PORT}/api/ai/personalization`);
    logger.info(`🔧 ML Pipeline en http://localhost:${PORT}/api/ai/pipeline`);
  });
}

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  await cacheService.close();
  await vectorStoreService.close();
  await mlModelService.close();
  await queueService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  await cacheService.close();
  await vectorStoreService.close();
  await mlModelService.close();
  await queueService.close();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
  process.exit(1);
});

startServer().catch((error) => {
  logger.error('Error iniciando servidor:', error);
  process.exit(1);
});