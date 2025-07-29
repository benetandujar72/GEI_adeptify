import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const analyticsEventSchema = z.object({
  userId: z.number().positive().optional(),
  sessionId: z.string().optional(),
  eventType: z.string().min(1).max(100),
  eventName: z.string().min(1).max(200),
  pageUrl: z.string().url().optional(),
  referrer: z.string().url().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  metadata: z.object({
    elementId: z.string().optional(),
    elementClass: z.string().optional(),
    elementText: z.string().optional(),
    formData: z.record(z.any()).optional(),
    customData: z.record(z.any()).optional(),
    performance: z.object({
      loadTime: z.number().optional(),
      domContentLoaded: z.number().optional(),
      firstPaint: z.number().optional(),
      firstContentfulPaint: z.number().optional(),
    }).optional(),
  }).optional(),
});

const performanceMetricSchema = z.object({
  userId: z.number().positive().optional(),
  sessionId: z.string().optional(),
  pageUrl: z.string().url(),
  loadTime: z.number().positive().optional(),
  domContentLoaded: z.number().positive().optional(),
  firstPaint: z.number().positive().optional(),
  firstContentfulPaint: z.number().positive().optional(),
  largestContentfulPaint: z.number().positive().optional(),
  cumulativeLayoutShift: z.number().min(0).max(1).optional(),
  firstInputDelay: z.number().positive().optional(),
  timeToInteractive: z.number().positive().optional(),
  metadata: z.object({
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    connectionType: z.string().optional(),
    customMetrics: z.record(z.number()).optional(),
  }).optional(),
});

// ===== RUTAS DE EVENTOS DE ANALYTICS =====

/**
 * POST /analytics/events
 * Registrar un evento de analytics
 */
router.post('/events', async (req, res) => {
  try {
    const validatedData = analyticsEventSchema.parse(req.body);
    const event = await analyticsService.trackEvent(validatedData);
    
    res.status(201).json({
      success: true,
      data: event,
      message: 'Analytics event tracked successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error tracking analytics event:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error tracking analytics event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track analytics event'
    });
  }
});

/**
 * GET /analytics/events
 * Obtener eventos de analytics
 */
router.get('/events', async (req, res) => {
  try {
    const { 
      userId, eventType, eventName, startDate, endDate, limit, offset 
    } = req.query;
    
    const filters = {
      userId: userId ? parseInt(userId as string) : undefined,
      eventType: eventType as string,
      eventName: eventName as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await analyticsService.getEvents(filters);
    
    res.json({
      success: true,
      data: result.events,
      pagination: {
        total: result.total,
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 100) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting analytics events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics events'
    });
  }
});

/**
 * GET /analytics/events/stats
 * Obtener estadísticas de eventos
 */
router.get('/events/stats', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    
    if (!['day', 'week', 'month', 'year'].includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: day, week, month, year'
      });
    }
    
    const stats = await analyticsService.getEventStats(period as 'day' | 'week' | 'month' | 'year');
    
    res.json({
      success: true,
      data: stats,
      period: period,
      message: 'Event statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting event stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event statistics'
    });
  }
});

// ===== RUTAS DE MÉTRICAS DE RENDIMIENTO =====

/**
 * POST /analytics/performance
 * Registrar métrica de rendimiento
 */
router.post('/performance', async (req, res) => {
  try {
    const validatedData = performanceMetricSchema.parse(req.body);
    const metric = await analyticsService.trackPerformance(validatedData);
    
    res.status(201).json({
      success: true,
      data: metric,
      message: 'Performance metric tracked successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error tracking performance metric:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error tracking performance metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track performance metric'
    });
  }
});

/**
 * GET /analytics/performance
 * Obtener métricas de rendimiento
 */
router.get('/performance', async (req, res) => {
  try {
    const { pageUrl, startDate, endDate, limit } = req.query;
    
    const filters = {
      pageUrl: pageUrl as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };
    
    const metrics = await analyticsService.getPerformanceMetrics(filters);
    
    res.json({
      success: true,
      data: metrics,
      message: 'Performance metrics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

/**
 * GET /analytics/performance/stats
 * Obtener estadísticas de rendimiento
 */
router.get('/performance/stats', async (req, res) => {
  try {
    const stats = await analyticsService.getPerformanceStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Performance statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance statistics'
    });
  }
});

// ===== RUTAS DE ESTADÍSTICAS GENERALES =====

/**
 * GET /analytics/stats
 * Obtener estadísticas generales del sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await analyticsService.getSystemStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'System statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics'
    });
  }
});

// ===== RUTAS DE MÉTRICAS DE NEGOCIO =====

/**
 * POST /analytics/business-metrics
 * Crear métrica de negocio
 */
router.post('/business-metrics', async (req, res) => {
  try {
    const businessMetricSchema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      category: z.enum(['academic', 'financial', 'operational', 'user']),
      type: z.enum(['count', 'sum', 'average', 'percentage', 'ratio']),
      value: z.number().positive(),
      unit: z.string().max(50).optional(),
      period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
      target: z.number().optional(),
      threshold: z.number().optional(),
      metadata: z.object({
        calculation: z.string().optional(),
        dataSource: z.string().optional(),
        filters: z.record(z.any()).optional(),
        trend: z.object({
          direction: z.enum(['up', 'down', 'stable']).optional(),
          percentage: z.number().optional(),
          previousValue: z.number().optional(),
        }).optional(),
      }).optional(),
    });

    const validatedData = businessMetricSchema.parse(req.body);
    const metric = await analyticsService.createBusinessMetric(validatedData);
    
    res.status(201).json({
      success: true,
      data: metric,
      message: 'Business metric created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating business metric:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating business metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create business metric'
    });
  }
});

/**
 * GET /analytics/business-metrics
 * Obtener métricas de negocio
 */
router.get('/business-metrics', async (req, res) => {
  try {
    const { category, period, status, limit, offset } = req.query;
    
    const filters = {
      category: category as string,
      period: period as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await analyticsService.getBusinessMetrics(filters);
    
    res.json({
      success: true,
      data: result.metrics,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting business metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get business metrics'
    });
  }
});

export default router;