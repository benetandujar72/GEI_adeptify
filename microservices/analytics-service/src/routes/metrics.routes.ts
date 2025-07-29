import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const dataExportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['analytics', 'reports', 'metrics', 'custom']),
  format: z.enum(['csv', 'json', 'excel', 'pdf']),
  requestedBy: z.number().positive(),
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    dataSources: z.array(z.string()).optional(),
    customFilters: z.record(z.any()).optional(),
  }).optional(),
  configuration: z.object({
    columns: z.array(z.string()).optional(),
    sorting: z.array(z.record(z.string())).optional(),
    grouping: z.array(z.string()).optional(),
    aggregations: z.array(z.record(z.string())).optional(),
  }).optional(),
  expiresAt: z.string().datetime().optional(),
});

const metricAlertSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  metricId: z.number().positive(),
  condition: z.enum(['greater_than', 'less_than', 'equals', 'not_equals']),
  threshold: z.number().positive(),
  status: z.enum(['active', 'inactive', 'triggered']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notificationChannels: z.object({
    email: z.array(z.string()).optional(),
    slack: z.array(z.string()).optional(),
    webhook: z.array(z.string()).optional(),
    sms: z.array(z.string()).optional(),
  }).optional(),
  cooldownPeriod: z.number().positive().optional(),
  metadata: z.object({
    message: z.string().optional(),
    customActions: z.array(z.record(z.any())).optional(),
  }).optional(),
});

// ===== RUTAS DE EXPORTACIÓN DE DATOS =====

/**
 * POST /metrics/exports
 * Crear exportación de datos
 */
router.post('/exports', async (req, res) => {
  try {
    const validatedData = dataExportSchema.parse(req.body);
    const dataExport = await analyticsService.createDataExport(validatedData);
    
    res.status(201).json({
      success: true,
      data: dataExport,
      message: 'Data export created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating data export:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating data export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create data export'
    });
  }
});

/**
 * GET /metrics/exports
 * Obtener exportaciones de datos
 */
router.get('/exports', async (req, res) => {
  try {
    const { requestedBy, type, status, limit, offset } = req.query;
    
    const filters = {
      requestedBy: requestedBy ? parseInt(requestedBy as string) : undefined,
      type: type as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await analyticsService.getDataExports(filters);
    
    res.json({
      success: true,
      data: result.exports,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting data exports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data exports'
    });
  }
});

/**
 * GET /metrics/exports/:id/download
 * Descargar exportación de datos
 */
router.get('/exports/:id/download', async (req, res) => {
  try {
    const exportId = parseInt(req.params.id);
    
    if (isNaN(exportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export ID'
      });
    }
    
    // Aquí se generaría el archivo de descarga real
    // Por simplicidad, retornamos un mock
    const mockData = {
      exportId,
      name: 'Analytics Data Export',
      format: 'csv',
      generatedAt: new Date().toISOString(),
      recordCount: 5000,
      data: [
        { userId: 1, eventType: 'page_view', timestamp: '2024-01-15T10:00:00Z', pageUrl: '/dashboard' },
        { userId: 2, eventType: 'click', timestamp: '2024-01-15T10:05:00Z', pageUrl: '/reports' },
        { userId: 1, eventType: 'form_submit', timestamp: '2024-01-15T10:10:00Z', pageUrl: '/settings' }
      ]
    };
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${exportId}.csv"`);
    
    // Convertir a CSV
    const csvHeaders = ['userId', 'eventType', 'timestamp', 'pageUrl'];
    const csvData = mockData.data.map(row => 
      csvHeaders.map(header => row[header as keyof typeof row]).join(',')
    );
    const csv = [csvHeaders.join(','), ...csvData].join('\n');
    
    res.send(csv);
  } catch (error) {
    logger.error('Error downloading data export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download data export'
    });
  }
});

// ===== RUTAS DE ALERTAS DE MÉTRICAS =====

/**
 * POST /metrics/alerts
 * Crear alerta de métrica
 */
router.post('/alerts', async (req, res) => {
  try {
    const validatedData = metricAlertSchema.parse(req.body);
    const alert = await analyticsService.createMetricAlert(validatedData);
    
    res.status(201).json({
      success: true,
      data: alert,
      message: 'Metric alert created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating metric alert:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating metric alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create metric alert'
    });
  }
});

/**
 * GET /metrics/alerts
 * Obtener alertas de métricas
 */
router.get('/alerts', async (req, res) => {
  try {
    const { metricId, status, severity, limit, offset } = req.query;
    
    const filters = {
      metricId: metricId ? parseInt(metricId as string) : undefined,
      status: status as string,
      severity: severity as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await analyticsService.getMetricAlerts(filters);
    
    res.json({
      success: true,
      data: result.alerts,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting metric alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metric alerts'
    });
  }
});

/**
 * PUT /metrics/alerts/:id/acknowledge
 * Reconocer alerta
 */
router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const { acknowledgedBy } = req.body;
    
    if (isNaN(alertId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID'
      });
    }
    
    // Aquí se actualizaría la alerta
    // Por simplicidad, retornamos un mock
    const mockAlert = {
      id: alertId,
      status: 'acknowledged',
      acknowledgedBy: acknowledgedBy || 1,
      acknowledgedAt: new Date().toISOString(),
      message: 'Alert acknowledged successfully'
    };
    
    res.json({
      success: true,
      data: mockAlert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// ===== RUTAS DE MÉTRICAS EN TIEMPO REAL =====

/**
 * GET /metrics/realtime
 * Obtener métricas en tiempo real
 */
router.get('/realtime', async (req, res) => {
  try {
    const realtimeMetrics = {
      activeUsers: Math.floor(Math.random() * 100) + 50,
      currentSessions: Math.floor(Math.random() * 200) + 100,
      requestsPerMinute: Math.floor(Math.random() * 1000) + 500,
      averageResponseTime: Math.floor(Math.random() * 200) + 50,
      errorRate: (Math.random() * 2).toFixed(2),
      systemLoad: (Math.random() * 100).toFixed(1),
      memoryUsage: (Math.random() * 80 + 20).toFixed(1),
      cpuUsage: (Math.random() * 60 + 20).toFixed(1),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: realtimeMetrics,
      message: 'Real-time metrics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get real-time metrics'
    });
  }
});

/**
 * GET /metrics/summary
 * Obtener resumen de métricas
 */
router.get('/summary', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    
    if (!['hour', 'day', 'week', 'month'].includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: hour, day, week, month'
      });
    }
    
    const summaryMetrics = {
      period: period,
      totalUsers: Math.floor(Math.random() * 10000) + 5000,
      totalSessions: Math.floor(Math.random() * 20000) + 10000,
      totalEvents: Math.floor(Math.random() * 100000) + 50000,
      averageSessionDuration: Math.floor(Math.random() * 300) + 120,
      bounceRate: (Math.random() * 30 + 10).toFixed(1),
      conversionRate: (Math.random() * 5 + 1).toFixed(2),
      topPages: [
        { page: '/dashboard', views: Math.floor(Math.random() * 1000) + 500 },
        { page: '/reports', views: Math.floor(Math.random() * 800) + 400 },
        { page: '/analytics', views: Math.floor(Math.random() * 600) + 300 },
        { page: '/settings', views: Math.floor(Math.random() * 400) + 200 },
        { page: '/profile', views: Math.floor(Math.random() * 300) + 150 }
      ],
      topEvents: [
        { event: 'page_view', count: Math.floor(Math.random() * 5000) + 2000 },
        { event: 'click', count: Math.floor(Math.random() * 3000) + 1500 },
        { event: 'form_submit', count: Math.floor(Math.random() * 1000) + 500 },
        { event: 'download', count: Math.floor(Math.random() * 500) + 200 },
        { event: 'scroll', count: Math.floor(Math.random() * 2000) + 1000 }
      ],
      deviceBreakdown: [
        { device: 'desktop', percentage: (Math.random() * 30 + 50).toFixed(1) },
        { device: 'mobile', percentage: (Math.random() * 30 + 30).toFixed(1) },
        { device: 'tablet', percentage: (Math.random() * 10 + 10).toFixed(1) }
      ],
      browserBreakdown: [
        { browser: 'Chrome', percentage: (Math.random() * 20 + 60).toFixed(1) },
        { browser: 'Firefox', percentage: (Math.random() * 10 + 15).toFixed(1) },
        { browser: 'Safari', percentage: (Math.random() * 10 + 15).toFixed(1) },
        { browser: 'Edge', percentage: (Math.random() * 5 + 5).toFixed(1) },
        { browser: 'Other', percentage: (Math.random() * 5 + 5).toFixed(1) }
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: summaryMetrics,
      message: 'Metrics summary retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting metrics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics summary'
    });
  }
});

/**
 * GET /metrics/trends
 * Obtener tendencias de métricas
 */
router.get('/trends', async (req, res) => {
  try {
    const { metric, period = '7d' } = req.query;
    
    const validMetrics = ['users', 'sessions', 'events', 'conversions', 'revenue'];
    const validPeriods = ['1d', '7d', '30d', '90d'];
    
    if (!validMetrics.includes(metric as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
      });
    }
    
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }
    
    // Generar datos de tendencia
    const days = period === '1d' ? 24 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const dataPoints = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      
      dataPoints.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 1000) + 100,
        change: (Math.random() * 20 - 10).toFixed(1) // -10% to +10%
      });
    }
    
    const trendData = {
      metric: metric,
      period: period,
      dataPoints: dataPoints,
      summary: {
        total: dataPoints.reduce((sum, point) => sum + point.value, 0),
        average: Math.floor(dataPoints.reduce((sum, point) => sum + point.value, 0) / dataPoints.length),
        trend: dataPoints[dataPoints.length - 1].change > 0 ? 'up' : 'down',
        change: dataPoints[dataPoints.length - 1].change
      }
    };
    
    res.json({
      success: true,
      data: trendData,
      message: 'Metric trends retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting metric trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metric trends'
    });
  }
});

export default router;