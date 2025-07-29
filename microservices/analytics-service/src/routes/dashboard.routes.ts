import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const dashboardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['overview', 'detailed', 'executive', 'custom']),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  createdBy: z.number().positive(),
  isPublic: z.boolean().optional(),
  layout: z.object({
    grid: z.object({
      columns: z.number().optional(),
      rows: z.number().optional(),
    }).optional(),
    widgets: z.array(z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      configuration: z.record(z.any()),
    })).optional(),
  }).optional(),
  configuration: z.object({
    refreshInterval: z.number().optional(),
    autoRefresh: z.boolean().optional(),
    theme: z.string().optional(),
    permissions: z.object({
      view: z.array(z.number()).optional(),
      edit: z.array(z.number()).optional(),
      admin: z.array(z.number()).optional(),
    }).optional(),
  }).optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
});

const widgetSchema = z.object({
  dashboardId: z.number().positive(),
  name: z.string().min(1).max(200),
  type: z.enum(['chart', 'table', 'metric', 'text', 'iframe']),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  configuration: z.object({
    dataSource: z.string().optional(),
    query: z.string().optional(),
    chartType: z.string().optional(),
    colors: z.array(z.string()).optional(),
    options: z.record(z.any()).optional(),
    refreshInterval: z.number().optional(),
  }).optional(),
  isVisible: z.boolean().optional(),
  order: z.number().optional(),
});

// ===== RUTAS DE DASHBOARDS =====

/**
 * POST /dashboard
 * Crear dashboard
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = dashboardSchema.parse(req.body);
    const dashboard = await analyticsService.createDashboard(validatedData);
    
    res.status(201).json({
      success: true,
      data: dashboard,
      message: 'Dashboard created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating dashboard:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dashboard'
    });
  }
});

/**
 * GET /dashboard
 * Obtener dashboards
 */
router.get('/', async (req, res) => {
  try {
    const { createdBy, type, status, isPublic, limit, offset } = req.query;
    
    const filters = {
      createdBy: createdBy ? parseInt(createdBy as string) : undefined,
      type: type as string,
      status: status as string,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await analyticsService.getDashboards(filters);
    
    res.json({
      success: true,
      data: result.dashboards,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting dashboards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboards'
    });
  }
});

/**
 * GET /dashboard/:id
 * Obtener dashboard específico
 */
router.get('/:id', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    
    if (isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dashboard ID'
      });
    }
    
    const result = await analyticsService.getDashboards({ createdBy: undefined, limit: 1, offset: 0 });
    const dashboard = result.dashboards.find(d => d.id === dashboardId);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found'
      });
    }
    
    // Obtener widgets del dashboard
    const widgets = await analyticsService.getDashboardWidgets(dashboardId);
    
    res.json({
      success: true,
      data: {
        ...dashboard,
        widgets
      },
      message: 'Dashboard retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard'
    });
  }
});

/**
 * GET /dashboard/:id/widgets
 * Obtener widgets de un dashboard
 */
router.get('/:id/widgets', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    
    if (isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dashboard ID'
      });
    }
    
    const widgets = await analyticsService.getDashboardWidgets(dashboardId);
    
    res.json({
      success: true,
      data: widgets,
      message: 'Dashboard widgets retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting dashboard widgets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard widgets'
    });
  }
});

/**
 * POST /dashboard/:id/widgets
 * Agregar widget a dashboard
 */
router.post('/:id/widgets', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    
    if (isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dashboard ID'
      });
    }
    
    const validatedData = widgetSchema.parse({
      ...req.body,
      dashboardId
    });
    
    const widget = await analyticsService.addWidget(validatedData);
    
    res.status(201).json({
      success: true,
      data: widget,
      message: 'Widget added to dashboard successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error adding widget:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error adding widget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add widget'
    });
  }
});

/**
 * GET /dashboard/templates
 * Obtener plantillas de dashboards
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 1,
        name: 'Executive Overview',
        description: 'High-level metrics and KPIs for executives',
        type: 'executive',
        category: 'management',
        layout: {
          grid: { columns: 3, rows: 2 },
          widgets: [
            {
              id: 'metric-1',
              type: 'metric',
              position: { x: 0, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'Total Users',
                dataSource: 'analytics_events',
                query: 'SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE timestamp >= NOW() - INTERVAL \'30 days\'',
                format: 'number'
              }
            },
            {
              id: 'metric-2',
              type: 'metric',
              position: { x: 1, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'Active Sessions',
                dataSource: 'analytics_events',
                query: 'SELECT COUNT(*) FROM analytics_events WHERE timestamp >= NOW() - INTERVAL \'1 hour\'',
                format: 'number'
              }
            },
            {
              id: 'metric-3',
              type: 'metric',
              position: { x: 2, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'Conversion Rate',
                dataSource: 'analytics_events',
                query: 'SELECT (COUNT(*) FILTER (WHERE event_type = \'form_submit\') * 100.0 / COUNT(*)) FROM analytics_events WHERE timestamp >= NOW() - INTERVAL \'7 days\'',
                format: 'percentage'
              }
            },
            {
              id: 'chart-1',
              type: 'chart',
              position: { x: 0, y: 1, width: 2, height: 1 },
              configuration: {
                title: 'User Activity Trend',
                chartType: 'line',
                dataSource: 'analytics_events',
                query: 'SELECT DATE(timestamp) as date, COUNT(*) as events FROM analytics_events WHERE timestamp >= NOW() - INTERVAL \'30 days\' GROUP BY DATE(timestamp) ORDER BY date',
                xAxis: 'date',
                yAxis: 'events'
              }
            },
            {
              id: 'chart-2',
              type: 'chart',
              position: { x: 2, y: 1, width: 1, height: 1 },
              configuration: {
                title: 'Event Distribution',
                chartType: 'pie',
                dataSource: 'analytics_events',
                query: 'SELECT event_type, COUNT(*) as count FROM analytics_events WHERE timestamp >= NOW() - INTERVAL \'7 days\' GROUP BY event_type',
                field: 'event_type'
              }
            }
          ]
        }
      },
      {
        id: 2,
        name: 'Performance Monitor',
        description: 'Real-time performance metrics and monitoring',
        type: 'detailed',
        category: 'technical',
        layout: {
          grid: { columns: 2, rows: 3 },
          widgets: [
            {
              id: 'perf-1',
              type: 'metric',
              position: { x: 0, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'Avg Load Time',
                dataSource: 'performance_metrics',
                query: 'SELECT AVG(load_time) FROM performance_metrics WHERE timestamp >= NOW() - INTERVAL \'1 hour\'',
                format: 'duration'
              }
            },
            {
              id: 'perf-2',
              type: 'metric',
              position: { x: 1, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'First Paint',
                dataSource: 'performance_metrics',
                query: 'SELECT AVG(first_paint) FROM performance_metrics WHERE timestamp >= NOW() - INTERVAL \'1 hour\'',
                format: 'duration'
              }
            },
            {
              id: 'perf-chart-1',
              type: 'chart',
              position: { x: 0, y: 1, width: 2, height: 1 },
              configuration: {
                title: 'Performance Over Time',
                chartType: 'line',
                dataSource: 'performance_metrics',
                query: 'SELECT timestamp, load_time, first_paint, first_contentful_paint FROM performance_metrics WHERE timestamp >= NOW() - INTERVAL \'24 hours\' ORDER BY timestamp',
                xAxis: 'timestamp',
                yAxis: 'load_time'
              }
            },
            {
              id: 'perf-table',
              type: 'table',
              position: { x: 0, y: 2, width: 2, height: 1 },
              configuration: {
                title: 'Page Performance',
                dataSource: 'performance_metrics',
                query: 'SELECT page_url, AVG(load_time) as avg_load, AVG(first_paint) as avg_fp, COUNT(*) as samples FROM performance_metrics WHERE timestamp >= NOW() - INTERVAL \'1 hour\' GROUP BY page_url ORDER BY avg_load DESC LIMIT 10',
                columns: ['page_url', 'avg_load', 'avg_fp', 'samples']
              }
            }
          ]
        }
      },
      {
        id: 3,
        name: 'User Analytics',
        description: 'Detailed user behavior and engagement analytics',
        type: 'detailed',
        category: 'analytics',
        layout: {
          grid: { columns: 3, rows: 2 },
          widgets: [
            {
              id: 'user-1',
              type: 'metric',
              position: { x: 0, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'New Users',
                dataSource: 'analytics_events',
                query: 'SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_type = \'first_visit\' AND timestamp >= NOW() - INTERVAL \'7 days\'',
                format: 'number'
              }
            },
            {
              id: 'user-2',
              type: 'metric',
              position: { x: 1, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'Returning Users',
                dataSource: 'analytics_events',
                query: 'SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_type = \'return_visit\' AND timestamp >= NOW() - INTERVAL \'7 days\'',
                format: 'number'
              }
            },
            {
              id: 'user-3',
              type: 'metric',
              position: { x: 2, y: 0, width: 1, height: 1 },
              configuration: {
                title: 'Session Duration',
                dataSource: 'analytics_events',
                query: 'SELECT AVG(session_duration) FROM user_sessions WHERE timestamp >= NOW() - INTERVAL \'7 days\'',
                format: 'duration'
              }
            },
            {
              id: 'user-chart-1',
              type: 'chart',
              position: { x: 0, y: 1, width: 2, height: 1 },
              configuration: {
                title: 'User Engagement',
                chartType: 'bar',
                dataSource: 'analytics_events',
                query: 'SELECT event_type, COUNT(*) as count FROM analytics_events WHERE timestamp >= NOW() - INTERVAL \'7 days\' GROUP BY event_type ORDER BY count DESC',
                xAxis: 'event_type',
                yAxis: 'count'
              }
            },
            {
              id: 'user-chart-2',
              type: 'chart',
              position: { x: 2, y: 1, width: 1, height: 1 },
              configuration: {
                title: 'User Retention',
                chartType: 'line',
                dataSource: 'user_retention',
                query: 'SELECT day, retention_rate FROM user_retention WHERE cohort_date >= NOW() - INTERVAL \'30 days\' ORDER BY day',
                xAxis: 'day',
                yAxis: 'retention_rate'
              }
            }
          ]
        }
      }
    ];
    
    res.json({
      success: true,
      data: templates,
      message: 'Dashboard templates retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting dashboard templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard templates'
    });
  }
});

export default router;