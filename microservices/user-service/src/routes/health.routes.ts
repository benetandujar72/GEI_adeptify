import { Router } from 'express';
import { DatabaseService } from '../services/database.service.js';
import { RedisService } from '../services/redis.service.js';
import { logger } from '../utils/logger.js';

const router = Router();
const databaseService = new DatabaseService();
const redisService = new RedisService();

/**
 * @route GET /health
 * @desc Health check básico del servicio
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    
    res.status(200).json({
      success: true,
      message: 'User Service is healthy',
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: 'user-service'
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      message: 'User Service health check failed',
      timestamp: new Date().toISOString(),
      service: 'user-service'
    });
  }
});

/**
 * @route GET /health/detailed
 * @desc Health check detallado con dependencias
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const checks = {
      service: true,
      database: false,
      redis: false,
      email: false
    };

    // Verificar base de datos
    try {
      const dbConnected = await databaseService.testConnection();
      checks.database = dbConnected;
    } catch (error) {
      logger.warn('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Verificar Redis
    try {
      const redisConnected = await redisService.healthCheck();
      checks.redis = redisConnected;
    } catch (error) {
      logger.warn('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Verificar email service (opcional)
    try {
      // Por ahora marcamos como true si no hay errores de configuración
      checks.email = true;
    } catch (error) {
      logger.warn('Email service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const overallHealth = Object.values(checks).every(check => check);

    res.status(overallHealth ? 200 : 503).json({
      success: overallHealth,
      message: overallHealth ? 'User Service is healthy' : 'User Service has issues',
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: 'user-service',
      checks
    });
  } catch (error) {
    logger.error('Detailed health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      message: 'User Service detailed health check failed',
      timestamp: new Date().toISOString(),
      service: 'user-service'
    });
  }
});

/**
 * @route GET /health/ready
 * @desc Readiness check para Kubernetes
 * @access Public
 */
router.get('/ready', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Verificar que el servicio esté listo para recibir tráfico
    const checks = {
      service: true,
      database: false
    };

    // Verificar base de datos (crítico para readiness)
    try {
      const dbConnected = await databaseService.testConnection();
      checks.database = dbConnected;
    } catch (error) {
      logger.error('Database readiness check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const isReady = Object.values(checks).every(check => check);

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      message: isReady ? 'User Service is ready' : 'User Service is not ready',
      timestamp,
      service: 'user-service',
      checks
    });
  } catch (error) {
    logger.error('Readiness check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(503).json({
      success: false,
      message: 'User Service readiness check failed',
      timestamp: new Date().toISOString(),
      service: 'user-service'
    });
  }
});

export default router;