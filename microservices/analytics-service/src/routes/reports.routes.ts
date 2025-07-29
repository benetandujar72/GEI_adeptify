import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const customReportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['analytics', 'performance', 'business', 'custom']),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  createdBy: z.number().positive(),
  isPublic: z.boolean().optional(),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    time: z.string().optional(),
    timezone: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  }).optional(),
  configuration: z.object({
    dataSources: z.array(z.string()).optional(),
    filters: z.array(z.record(z.any())).optional(),
    aggregations: z.array(z.record(z.any())).optional(),
    visualizations: z.array(z.record(z.any())).optional(),
    exportFormats: z.array(z.string()).optional(),
  }).optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
});

// ===== RUTAS DE REPORTES PERSONALIZADOS =====

/**
 * POST /reports
 * Crear reporte personalizado
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = customReportSchema.parse(req.body);
    const report = await analyticsService.createReport(validatedData);
    
    res.status(201).json({
      success: true,
      data: report,
      message: 'Custom report created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating custom report:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating custom report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom report'
    });
  }
});

/**
 * GET /reports
 * Obtener reportes personalizados
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
    
    const result = await analyticsService.getReports(filters);
    
    res.json({
      success: true,
      data: result.reports,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reports'
    });
  }
});

/**
 * GET /reports/:id
 * Obtener reporte específico
 */
router.get('/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report ID'
      });
    }
    
    const result = await analyticsService.getReports({ createdBy: undefined, limit: 1, offset: 0 });
    const report = result.reports.find(r => r.id === reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      data: report,
      message: 'Report retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report'
    });
  }
});

/**
 * POST /reports/:id/execute
 * Ejecutar reporte
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { parameters } = req.body;
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report ID'
      });
    }
    
    const execution = await analyticsService.executeReport(reportId, parameters);
    
    res.status(201).json({
      success: true,
      data: execution,
      message: 'Report execution started successfully'
    });
  } catch (error) {
    logger.error('Error executing report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute report'
    });
  }
});

/**
 * GET /reports/executions/:executionId
 * Obtener estado de ejecución de reporte
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const executionId = parseInt(req.params.executionId);
    
    if (isNaN(executionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid execution ID'
      });
    }
    
    // Aquí se obtendría la ejecución específica
    // Por simplicidad, retornamos un mock
    const mockExecution = {
      id: executionId,
      status: 'completed',
      startedAt: new Date(Date.now() - 5000),
      completedAt: new Date(),
      duration: 5000,
      resultUrl: `/reports/executions/${executionId}/download`,
      metadata: {
        recordCount: 1000,
        fileSize: 1024000
      }
    };
    
    res.json({
      success: true,
      data: mockExecution,
      message: 'Report execution status retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting report execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report execution'
    });
  }
});

/**
 * GET /reports/executions/:executionId/download
 * Descargar resultado de reporte
 */
router.get('/executions/:executionId/download', async (req, res) => {
  try {
    const executionId = parseInt(req.params.executionId);
    
    if (isNaN(executionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid execution ID'
      });
    }
    
    // Aquí se generaría el archivo de descarga
    // Por simplicidad, retornamos un mock
    const mockData = {
      executionId,
      reportName: 'Sample Report',
      generatedAt: new Date().toISOString(),
      data: [
        { metric: 'Users', value: 1500, change: '+5%' },
        { metric: 'Sessions', value: 3200, change: '+12%' },
        { metric: 'Page Views', value: 8500, change: '+8%' }
      ]
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${executionId}.json"`);
    
    res.json({
      success: true,
      data: mockData,
      message: 'Report download ready'
    });
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download report'
    });
  }
});

/**
 * GET /reports/templates
 * Obtener plantillas de reportes
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 1,
        name: 'User Activity Report',
        description: 'Comprehensive report of user activity and engagement',
        type: 'analytics',
        category: 'user',
        configuration: {
          dataSources: ['analytics_events', 'performance_metrics'],
          filters: [{ field: 'eventType', operator: 'in', values: ['page_view', 'click', 'form_submit'] }],
          aggregations: [
            { field: 'eventType', function: 'count', alias: 'event_count' },
            { field: 'userId', function: 'count_distinct', alias: 'unique_users' }
          ],
          visualizations: [
            { type: 'line_chart', title: 'Events Over Time', xAxis: 'timestamp', yAxis: 'event_count' },
            { type: 'pie_chart', title: 'Event Distribution', field: 'eventType' }
          ]
        }
      },
      {
        id: 2,
        name: 'Performance Dashboard',
        description: 'Performance metrics and page load times',
        type: 'performance',
        category: 'technical',
        configuration: {
          dataSources: ['performance_metrics'],
          filters: [{ field: 'loadTime', operator: 'gt', value: 0 }],
          aggregations: [
            { field: 'loadTime', function: 'avg', alias: 'avg_load_time' },
            { field: 'firstPaint', function: 'avg', alias: 'avg_first_paint' },
            { field: 'firstContentfulPaint', function: 'avg', alias: 'avg_fcp' }
          ],
          visualizations: [
            { type: 'line_chart', title: 'Load Times Over Time', xAxis: 'timestamp', yAxis: 'avg_load_time' },
            { type: 'bar_chart', title: 'Performance by Page', xAxis: 'pageUrl', yAxis: 'avg_load_time' }
          ]
        }
      },
      {
        id: 3,
        name: 'Business Metrics Summary',
        description: 'Key business metrics and KPIs',
        type: 'business',
        category: 'executive',
        configuration: {
          dataSources: ['business_metrics'],
          filters: [{ field: 'status', operator: 'eq', value: 'active' }],
          aggregations: [
            { field: 'value', function: 'sum', alias: 'total_value' },
            { field: 'value', function: 'avg', alias: 'avg_value' }
          ],
          visualizations: [
            { type: 'metric_card', title: 'Total Value', field: 'total_value' },
            { type: 'line_chart', title: 'Metrics Trend', xAxis: 'periodStart', yAxis: 'value' }
          ]
        }
      }
    ];
    
    res.json({
      success: true,
      data: templates,
      message: 'Report templates retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting report templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report templates'
    });
  }
});

export default router;