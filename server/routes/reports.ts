import { Router } from 'express';
import { reportService } from '../services/report-service.js';
import { isAuthenticated } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();

// Middleware de auditoría para todas las rutas
router.use(auditMiddleware('reports'));

// Esquemas de validación
const reportConfigSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  type: z.enum(['evaluation', 'attendance', 'guard_duty', 'survey', 'audit', 'custom']),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()).min(1, 'Al menos una columna es requerida'),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional(),
  includeCharts: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  type: z.string(),
  config: reportConfigSchema,
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/reports/templates
 * Obtiene plantillas de reportes disponibles
 */
router.get('/templates', isAuthenticated, async (req: any, res) => {
  try {
    const templates = await reportService.getReportTemplates(req.user?.instituteId);

    res.json({
      success: true,
      data: templates,
    });

  } catch (error) {
    logger.error('Error getting report templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener plantillas de reportes',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/reports/generate
 * Genera un reporte basado en la configuración
 */
router.post('/generate', isAuthenticated, async (req: any, res) => {
  try {
    // Validar configuración del reporte
    const config = reportConfigSchema.parse(req.body);

    // Generar el reporte
    const reportData = await reportService.generateReport(
      config,
      req.user?.id,
      req.user?.instituteId
    );

    // Determinar el formato de respuesta
    switch (config.format) {
      case 'json':
        res.json({
          success: true,
          data: reportData,
        });
        break;

      case 'csv':
        const csvContent = generateCSV(reportData.headers, reportData.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${config.title.replace(/[^a-z0-9]/gi, '_')}.csv"`);
        res.send(csvContent);
        break;

      case 'excel':
        // Para Excel necesitaríamos una librería como xlsx
        // Por ahora devolvemos JSON
        res.json({
          success: true,
          data: reportData,
          message: 'Formato Excel no implementado aún, devolviendo JSON',
        });
        break;

      case 'pdf':
        // Para PDF necesitaríamos una librería como puppeteer o jsPDF
        // Por ahora devolvemos JSON
        res.json({
          success: true,
          data: reportData,
          message: 'Formato PDF no implementado aún, devolviendo JSON',
        });
        break;

      default:
        res.json({
          success: true,
          data: reportData,
        });
    }

  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/reports/generate-from-template
 * Genera un reporte desde una plantilla
 */
router.post('/generate-from-template', isAuthenticated, async (req: any, res) => {
  try {
    const { templateId, customFilters = {} } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'ID de plantilla es requerido',
      });
    }

    // Obtener plantillas disponibles
    const templates = await reportService.getReportTemplates(req.user?.instituteId);
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada',
      });
    }

    // Verificar permisos para plantillas privadas
    if (!template.isPublic && template.createdBy !== req.user?.id && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para usar esta plantilla',
      });
    }

    // Combinar configuración de plantilla con filtros personalizados
    const config = {
      ...template.config,
      filters: {
        ...template.config.filters,
        ...customFilters,
      },
    };

    // Generar el reporte
    const reportData = await reportService.generateReport(
      config,
      req.user?.id,
      req.user?.instituteId
    );

    res.json({
      success: true,
      data: reportData,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
      },
    });

  } catch (error) {
    logger.error('Error generating report from template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte desde plantilla',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/reports/save-template
 * Guarda una nueva plantilla de reporte
 */
router.post('/save-template', isAuthenticated, async (req: any, res) => {
  try {
    // Verificar permisos
    if (!['super_admin', 'institute_admin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear plantillas',
      });
    }

    const templateData = templateSchema.parse(req.body);

    // Generar ID único para la plantilla
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const template = {
      id: templateId,
      ...templateData,
      createdBy: req.user?.id,
      createdAt: new Date(),
    };

    // Aquí normalmente guardaríamos en la base de datos
    // Por ahora solo devolvemos la plantilla creada
    res.json({
      success: true,
      data: template,
      message: 'Plantilla creada exitosamente',
    });

  } catch (error) {
    logger.error('Error saving template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar la plantilla',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/reports/types
 * Obtiene tipos de reportes disponibles
 */
router.get('/types', isAuthenticated, async (req: any, res) => {
  try {
    const reportTypes = [
      {
        id: 'evaluation',
        name: 'Evaluaciones',
        description: 'Reportes de evaluaciones y calificaciones',
        icon: '📊',
        availableFormats: ['pdf', 'excel', 'csv', 'json'],
      },
      {
        id: 'attendance',
        name: 'Asistencia',
        description: 'Reportes de asistencia de estudiantes',
        icon: '✅',
        availableFormats: ['pdf', 'excel', 'csv', 'json'],
      },
      {
        id: 'guard_duty',
        name: 'Guardias',
        description: 'Reportes de guardias docentes',
        icon: '🛡️',
        availableFormats: ['pdf', 'excel', 'csv', 'json'],
      },
      {
        id: 'survey',
        name: 'Encuestas',
        description: 'Reportes de encuestas y respuestas',
        icon: '📋',
        availableFormats: ['pdf', 'excel', 'csv', 'json'],
      },
      {
        id: 'audit',
        name: 'Auditoría',
        description: 'Reportes de auditoría del sistema',
        icon: '🔍',
        availableFormats: ['csv', 'json'],
        requiresAdmin: true,
      },
      {
        id: 'custom',
        name: 'Personalizado',
        description: 'Reportes personalizados con SQL',
        icon: '⚙️',
        availableFormats: ['json'],
        requiresAdmin: true,
      },
    ];

    // Filtrar por permisos
    const filteredTypes = reportTypes.filter(type => {
      if (type.requiresAdmin && !['super_admin', 'institute_admin'].includes(req.user?.role)) {
        return false;
      }
      return true;
    });

    res.json({
      success: true,
      data: filteredTypes,
    });

  } catch (error) {
    logger.error('Error getting report types:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de reportes',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/reports/columns/:type
 * Obtiene columnas disponibles para un tipo de reporte
 */
router.get('/columns/:type', isAuthenticated, async (req: any, res) => {
  try {
    const { type } = req.params;

    const columnMappings: Record<string, any[]> = {
      evaluation: [
        { id: 'studentName', name: 'Nombre del Estudiante', type: 'string' },
        { id: 'competencyName', name: 'Competencia', type: 'string' },
        { id: 'score', name: 'Puntuación', type: 'number' },
        { id: 'grade', name: 'Calificación', type: 'number' },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date' },
        { id: 'updatedAt', name: 'Fecha de Actualización', type: 'date' },
      ],
      attendance: [
        { id: 'studentName', name: 'Nombre del Estudiante', type: 'string' },
        { id: 'date', name: 'Fecha', type: 'date' },
        { id: 'status', name: 'Estado', type: 'string' },
        { id: 'reason', name: 'Motivo', type: 'string' },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date' },
      ],
      guard_duty: [
        { id: 'teacherName', name: 'Nombre del Profesor', type: 'string' },
        { id: 'date', name: 'Fecha', type: 'date' },
        { id: 'timeSlot', name: 'Horario', type: 'string' },
        { id: 'type', name: 'Tipo', type: 'string' },
        { id: 'status', name: 'Estado', type: 'string' },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date' },
      ],
      survey: [
        { id: 'title', name: 'Título', type: 'string' },
        { id: 'description', name: 'Descripción', type: 'string' },
        { id: 'status', name: 'Estado', type: 'string' },
        { id: 'responseCount', name: 'Número de Respuestas', type: 'number' },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date' },
        { id: 'updatedAt', name: 'Fecha de Actualización', type: 'date' },
      ],
      audit: [
        { id: 'userId', name: 'Usuario', type: 'string' },
        { id: 'action', name: 'Acción', type: 'string' },
        { id: 'resource', name: 'Recurso', type: 'string' },
        { id: 'ipAddress', name: 'Dirección IP', type: 'string' },
        { id: 'createdAt', name: 'Fecha', type: 'date' },
      ],
    };

    const columns = columnMappings[type] || [];

    res.json({
      success: true,
      data: columns,
    });

  } catch (error) {
    logger.error('Error getting columns:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener columnas',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * Función auxiliar para generar CSV
 */
function generateCSV(headers: string[], rows: any[][]): string {
  if (rows.length === 0) {
    return headers.join(',');
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export default router; 