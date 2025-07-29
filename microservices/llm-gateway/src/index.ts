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
import { llmRoutes } from './routes/llm';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { cacheService } from './services/cache';
import { costTrackingService } from './services/cost-tracking';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

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

// Rate limiting específico para LLM
const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requests por minuto
  message: 'Demasiadas requests a LLM desde esta IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de métricas
app.use(metricsMiddleware);

// Rutas de salud (sin autenticación)
app.use('/api/health', healthRoutes);

// Middleware de autenticación para rutas protegidas
app.use('/api/llm', authMiddleware, llmLimiter, llmRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Inicializar servicios
async function initializeServices() {
  try {
    await cacheService.initialize();
    await costTrackingService.initialize();
    logger.info('Servicios inicializados correctamente');
  } catch (error) {
    logger.error('Error inicializando servicios:', error);
    process.exit(1);
  }
}

// Iniciar servidor
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`🚀 LLM Gateway Service iniciado en puerto ${PORT}`);
    logger.info(`📊 Métricas disponibles en http://localhost:${PORT}/api/metrics`);
    logger.info(`🏥 Health check en http://localhost:${PORT}/api/health`);
  });
}

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  await cacheService.close();
  await costTrackingService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  await cacheService.close();
  await costTrackingService.close();
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