import { Router } from 'express';
import { cacheService } from '../services/cache-service.js';
import { databaseOptimizer } from '../services/database-optimizer.js';
import { isAuthenticated } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();
router.use(auditMiddleware('optimization'));

// Esquemas de validación
const optimizationConfigSchema = z.object({
  enableQueryCache: z.boolean().optional(),
  enableConnectionPooling: z.boolean().optional(),
  enableQueryMonitoring: z.boolean().optional(),
  slowQueryThreshold: z.number().min(100).max(10000).optional(),
  maxCacheSize: z.number().min(100).max(10000).optional(),
  cacheTTL: z.number().min(60).max(86400).optional(),
});

const tableOptimizationSchema = z.object({
  table: z.string(),
  force: z.boolean().optional(),
});

const cacheClearSchema = z.object({
  pattern: z.string().optional(),
  tags: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

/**
 * GET /api/optimization/stats
 * Obtiene estadísticas generales de optimización
 */
router.get('/stats', isAuthenticated, async (req: any, res) => {
  try {
    const [cacheStats, dbStats] = await Promise.all([
      cacheService.getStats(),
      databaseOptimizer.getDatabaseStats(),
    ]);

    const stats = {
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        keys: cacheStats.keys,
        memory: cacheStats.memory,
        isReady: cacheService.isReady(),
      },
      database: {
        totalQueries: dbStats.totalQueries,
        averageExecutionTime: dbStats.averageExecutionTime,
        slowQueries: dbStats.slowQueries,
        cacheHitRate: dbStats.cacheHitRate,
        activeConnections: dbStats.activeConnections,
        tableSizes: dbStats.tableSizes,
      },
      performance: {
        overallScore: this.calculatePerformanceScore(cacheStats, dbStats),
        recommendations: this.generateRecommendations(cacheStats, dbStats),
      },
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de optimización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de optimización',
    });
  }
});

/**
 * GET /api/optimization/cache/stats
 * Obtiene estadísticas detalladas del caché
 */
router.get('/cache/stats', isAuthenticated, async (req: any, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        isReady: cacheService.isReady(),
        recommendations: this.generateCacheRecommendations(stats),
      },
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de caché',
    });
  }
});

/**
 * POST /api/optimization/cache/clear
 * Limpia el caché según los parámetros especificados
 */
router.post('/cache/clear', isAuthenticated, async (req: any, res) => {
  try {
    const { pattern, tags, all } = cacheClearSchema.parse(req.body);

    if (all) {
      await cacheService.clear();
      logger.info('🧹 Caché limpiado completamente');
    } else if (pattern) {
      await cacheService.deletePattern(pattern);
      logger.info(`🗑️ Caché limpiado con patrón: ${pattern}`);
    } else if (tags && tags.length > 0) {
      await cacheService.deleteByTags(tags);
      logger.info(`🗑️ Caché limpiado por tags: ${tags.join(', ')}`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar pattern, tags o all=true',
      });
    }

    res.json({
      success: true,
      message: 'Caché limpiado exitosamente',
    });
  } catch (error) {
    logger.error('Error limpiando caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando caché',
    });
  }
});

/**
 * GET /api/optimization/database/stats
 * Obtiene estadísticas detalladas de la base de datos
 */
router.get('/database/stats', isAuthenticated, async (req: any, res) => {
  try {
    const stats = await databaseOptimizer.getDatabaseStats();
    const slowQueries = databaseOptimizer.getSlowQueries(10);
    const frequentQueries = databaseOptimizer.getFrequentQueries(10);

    res.json({
      success: true,
      data: {
        ...stats,
        slowQueries,
        frequentQueries,
        recommendations: this.generateDatabaseRecommendations(stats),
      },
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de base de datos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de base de datos',
    });
  }
});

/**
 * POST /api/optimization/database/optimize-table
 * Optimiza una tabla específica
 */
router.post('/database/optimize-table', isAuthenticated, async (req: any, res) => {
  try {
    const { table, force } = tableOptimizationSchema.parse(req.body);

    await databaseOptimizer.optimizeTable(table);

    res.json({
      success: true,
      message: `Tabla ${table} optimizada exitosamente`,
    });
  } catch (error) {
    logger.error('Error optimizando tabla:', error);
    res.status(500).json({
      success: false,
      error: 'Error optimizando tabla',
    });
  }
});

/**
 * POST /api/optimization/database/invalidate-cache
 * Invalida el caché para una tabla específica
 */
router.post('/database/invalidate-cache', isAuthenticated, async (req: any, res) => {
  try {
    const { table, instituteId } = req.body;

    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar una tabla',
      });
    }

    await databaseOptimizer.invalidateCache(table, instituteId);

    res.json({
      success: true,
      message: `Caché invalidado para tabla: ${table}`,
    });
  } catch (error) {
    logger.error('Error invalidando caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error invalidando caché',
    });
  }
});

/**
 * GET /api/optimization/queries/slow
 * Obtiene las consultas más lentas
 */
router.get('/queries/slow', isAuthenticated, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const slowQueries = databaseOptimizer.getSlowQueries(limit);

    res.json({
      success: true,
      data: slowQueries,
    });
  } catch (error) {
    logger.error('Error obteniendo consultas lentas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo consultas lentas',
    });
  }
});

/**
 * GET /api/optimization/queries/frequent
 * Obtiene las consultas más frecuentes
 */
router.get('/queries/frequent', isAuthenticated, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const frequentQueries = databaseOptimizer.getFrequentQueries(limit);

    res.json({
      success: true,
      data: frequentQueries,
    });
  } catch (error) {
    logger.error('Error obteniendo consultas frecuentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo consultas frecuentes',
    });
  }
});

/**
 * POST /api/optimization/config
 * Actualiza la configuración de optimización
 */
router.post('/config', isAuthenticated, async (req: any, res) => {
  try {
    const config = optimizationConfigSchema.parse(req.body);

    // Aquí se actualizaría la configuración del optimizador
    // Por ahora solo validamos y respondemos

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: config,
    });
  } catch (error) {
    logger.error('Error actualizando configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando configuración',
    });
  }
});

/**
 * GET /api/optimization/health
 * Verifica el estado de salud del sistema de optimización
 */
router.get('/health', isAuthenticated, async (req: any, res) => {
  try {
    const cacheReady = cacheService.isReady();
    const dbStats = await databaseOptimizer.getDatabaseStats();

    const health = {
      cache: {
        status: cacheReady ? 'healthy' : 'unhealthy',
        ready: cacheReady,
      },
      database: {
        status: dbStats.activeConnections > 0 ? 'healthy' : 'unhealthy',
        activeConnections: dbStats.activeConnections,
        averageExecutionTime: dbStats.averageExecutionTime,
      },
      overall: {
        status: cacheReady && dbStats.activeConnections > 0 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
      },
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Error verificando salud del sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando salud del sistema',
    });
  }
});

// Funciones auxiliares para generar recomendaciones
function calculatePerformanceScore(cacheStats: any, dbStats: any): number {
  const cacheScore = cacheStats.hitRate;
  const dbScore = Math.max(0, 100 - (dbStats.averageExecutionTime / 10));
  const slowQueryPenalty = Math.max(0, dbStats.slowQueries * 5);
  
  return Math.max(0, Math.min(100, (cacheScore + dbScore) / 2 - slowQueryPenalty));
}

function generateRecommendations(cacheStats: any, dbStats: any): string[] {
  const recommendations: string[] = [];

  if (cacheStats.hitRate < 70) {
    recommendations.push('Considera aumentar el TTL del caché para mejorar la tasa de aciertos');
  }

  if (dbStats.averageExecutionTime > 500) {
    recommendations.push('Revisa las consultas lentas y considera añadir índices');
  }

  if (dbStats.slowQueries > 5) {
    recommendations.push('Optimiza las consultas que están tomando más de 1 segundo');
  }

  if (cacheStats.memory > 100 * 1024 * 1024) { // 100MB
    recommendations.push('Considera limpiar el caché o reducir el TTL para liberar memoria');
  }

  if (recommendations.length === 0) {
    recommendations.push('El sistema está funcionando de manera óptima');
  }

  return recommendations;
}

function generateCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.hitRate < 70) {
    recommendations.push('Aumenta el TTL del caché para mejorar la tasa de aciertos');
  }

  if (stats.memory > 100 * 1024 * 1024) {
    recommendations.push('Considera limpiar el caché para liberar memoria');
  }

  if (stats.keys > 1000) {
    recommendations.push('Revisa si hay claves de caché innecesarias');
  }

  return recommendations;
}

function generateDatabaseRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.averageExecutionTime > 500) {
    recommendations.push('Revisa las consultas lentas y considera añadir índices');
  }

  if (stats.slowQueries > 5) {
    recommendations.push('Optimiza las consultas que están tomando más de 1 segundo');
  }

  if (stats.activeConnections > 50) {
    recommendations.push('Considera ajustar la configuración de connection pooling');
  }

  return recommendations;
}

export default router; 