import { Router } from 'express';
import { exportService } from '../services/export-service.js';
import { isAuthenticated } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();

// Middleware de auditoría para todas las rutas
router.use(auditMiddleware('export'));

// Esquemas de validación
const exportConfigSchema = z.object({
  type: z.enum(['evaluation', 'attendance', 'guard_duty', 'survey', 'resource', 'user', 'custom']),
  format: z.enum(['csv', 'excel', 'json', 'xml']),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()).min(1, 'Al menos una columna es requerida'),
  includeHeaders: z.boolean().default(true),
  dateFormat: z.enum(['iso', 'local', 'custom']).default('iso'),
  customDateFormat: z.string().optional(),
  encoding: z.enum(['utf8', 'latin1', 'utf16']).default('utf8'),
  delimiter: z.string().optional(),
  includeMetadata: z.boolean().default(false),
  compression: z.boolean().default(false),
});

const quickExportSchema = z.object({
  type: z.enum(['evaluation', 'attendance', 'guard_duty', 'survey', 'resource', 'user']),
  format: z.enum(['csv', 'excel', 'json']).default('csv'),
  filters: z.record(z.any()).optional(),
});

/**
 * POST /api/export/data
 * Exporta datos con configuración completa
 */
router.post('/data', isAuthenticated, async (req: any, res) => {
  try {
    // Validar configuración
    const config = exportConfigSchema.parse(req.body);

    // Exportar datos
    const result = await exportService.exportData(
      config,
      req.user?.id,
      req.user?.instituteId
    );

    // Configurar headers de descarga
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.size);

    // Enviar archivo
    res.send(result.data);

  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar datos',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/export/quick
 * Exportación rápida con configuración predefinida
 */
router.post('/quick', isAuthenticated, async (req: any, res) => {
  try {
    const { type, format, filters } = quickExportSchema.parse(req.body);

    // Obtener configuración predefinida
    const configs = exportService.getExportConfigs();
    const configKey = `${type}-${format === 'excel' ? 'detailed' : 'basic'}`;
    const baseConfig = configs[configKey] || configs[`${type}-basic`];

    if (!baseConfig) {
      return res.status(400).json({
        success: false,
        message: `Configuración no encontrada para tipo: ${type}`,
      });
    }

    // Combinar con filtros personalizados
    const config = {
      ...baseConfig,
      format,
      filters: {
        ...baseConfig.filters,
        ...filters,
      },
    };

    // Exportar datos
    const result = await exportService.exportData(
      config,
      req.user?.id,
      req.user?.instituteId
    );

    // Configurar headers de descarga
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.size);

    // Enviar archivo
    res.send(result.data);

  } catch (error) {
    logger.error('Error in quick export:', error);
    res.status(500).json({
      success: false,
      message: 'Error en exportación rápida',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/export/configs
 * Obtiene configuraciones de exportación predefinidas
 */
router.get('/configs', isAuthenticated, async (req: any, res) => {
  try {
    const configs = exportService.getExportConfigs();

    res.json({
      success: true,
      data: configs,
    });

  } catch (error) {
    logger.error('Error getting export configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones de exportación',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/export/types
 * Obtiene tipos de exportación disponibles
 */
router.get('/types', isAuthenticated, async (req: any, res) => {
  try {
    const exportTypes = [
      {
        id: 'evaluation',
        name: 'Evaluaciones',
        description: 'Datos de evaluaciones y calificaciones',
        icon: '📊',
        availableFormats: ['csv', 'excel', 'json', 'xml'],
        defaultColumns: ['studentName', 'competencyName', 'score', 'grade'],
      },
      {
        id: 'attendance',
        name: 'Asistencia',
        description: 'Datos de asistencia de estudiantes',
        icon: '✅',
        availableFormats: ['csv', 'excel', 'json', 'xml'],
        defaultColumns: ['studentName', 'date', 'status', 'reason'],
      },
      {
        id: 'guard_duty',
        name: 'Guardias',
        description: 'Datos de guardias docentes',
        icon: '🛡️',
        availableFormats: ['csv', 'excel', 'json', 'xml'],
        defaultColumns: ['teacherName', 'date', 'timeSlot', 'type', 'status'],
      },
      {
        id: 'survey',
        name: 'Encuestas',
        description: 'Datos de encuestas y respuestas',
        icon: '📋',
        availableFormats: ['csv', 'excel', 'json', 'xml'],
        defaultColumns: ['title', 'description', 'type', 'status', 'responseCount'],
      },
      {
        id: 'resource',
        name: 'Recursos',
        description: 'Datos de recursos y reservas',
        icon: '🏫',
        availableFormats: ['csv', 'excel', 'json', 'xml'],
        defaultColumns: ['name', 'description', 'type', 'capacity', 'isActive'],
      },
      {
        id: 'user',
        name: 'Usuarios',
        description: 'Datos de usuarios del sistema',
        icon: '👥',
        availableFormats: ['csv', 'excel', 'json', 'xml'],
        defaultColumns: ['email', 'displayName', 'role', 'isActive'],
        requiresAdmin: true,
      },
    ];

    // Filtrar por permisos
    const filteredTypes = exportTypes.filter(type => {
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
    logger.error('Error getting export types:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de exportación',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/export/columns/:type
 * Obtiene columnas disponibles para un tipo de exportación
 */
router.get('/columns/:type', isAuthenticated, async (req: any, res) => {
  try {
    const { type } = req.params;

    const columnMappings: Record<string, any[]> = {
      evaluation: [
        { id: 'studentName', name: 'Nombre del Estudiante', type: 'string', required: true },
        { id: 'studentEmail', name: 'Email del Estudiante', type: 'string', required: false },
        { id: 'competencyName', name: 'Competencia', type: 'string', required: true },
        { id: 'competencyCode', name: 'Código de Competencia', type: 'string', required: false },
        { id: 'score', name: 'Puntuación', type: 'number', required: true },
        { id: 'grade', name: 'Calificación', type: 'number', required: true },
        { id: 'comments', name: 'Comentarios', type: 'string', required: false },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date', required: false },
        { id: 'updatedAt', name: 'Fecha de Actualización', type: 'date', required: false },
      ],
      attendance: [
        { id: 'studentName', name: 'Nombre del Estudiante', type: 'string', required: true },
        { id: 'studentEmail', name: 'Email del Estudiante', type: 'string', required: false },
        { id: 'date', name: 'Fecha', type: 'date', required: true },
        { id: 'status', name: 'Estado', type: 'string', required: true },
        { id: 'reason', name: 'Motivo', type: 'string', required: false },
        { id: 'notes', name: 'Notas', type: 'string', required: false },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date', required: false },
      ],
      guard_duty: [
        { id: 'teacherName', name: 'Nombre del Profesor', type: 'string', required: true },
        { id: 'teacherEmail', name: 'Email del Profesor', type: 'string', required: false },
        { id: 'date', name: 'Fecha', type: 'date', required: true },
        { id: 'timeSlot', name: 'Horario', type: 'string', required: true },
        { id: 'type', name: 'Tipo', type: 'string', required: true },
        { id: 'status', name: 'Estado', type: 'string', required: true },
        { id: 'notes', name: 'Notas', type: 'string', required: false },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date', required: false },
      ],
      survey: [
        { id: 'title', name: 'Título', type: 'string', required: true },
        { id: 'description', name: 'Descripción', type: 'string', required: false },
        { id: 'type', name: 'Tipo', type: 'string', required: true },
        { id: 'status', name: 'Estado', type: 'string', required: true },
        { id: 'responseCount', name: 'Número de Respuestas', type: 'number', required: false },
        { id: 'startDate', name: 'Fecha de Inicio', type: 'date', required: false },
        { id: 'endDate', name: 'Fecha de Fin', type: 'date', required: false },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date', required: false },
        { id: 'updatedAt', name: 'Fecha de Actualización', type: 'date', required: false },
      ],
      resource: [
        { id: 'name', name: 'Nombre', type: 'string', required: true },
        { id: 'description', name: 'Descripción', type: 'string', required: false },
        { id: 'type', name: 'Tipo', type: 'string', required: true },
        { id: 'capacity', name: 'Capacidad', type: 'number', required: false },
        { id: 'isActive', name: 'Activo', type: 'boolean', required: true },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date', required: false },
        { id: 'updatedAt', name: 'Fecha de Actualización', type: 'date', required: false },
      ],
      user: [
        { id: 'email', name: 'Email', type: 'string', required: true },
        { id: 'displayName', name: 'Nombre Completo', type: 'string', required: true },
        { id: 'firstName', name: 'Nombre', type: 'string', required: false },
        { id: 'lastName', name: 'Apellido', type: 'string', required: false },
        { id: 'role', name: 'Rol', type: 'string', required: true },
        { id: 'isActive', name: 'Activo', type: 'boolean', required: true },
        { id: 'lastLogin', name: 'Último Login', type: 'date', required: false },
        { id: 'createdAt', name: 'Fecha de Creación', type: 'date', required: false },
        { id: 'updatedAt', name: 'Fecha de Actualización', type: 'date', required: false },
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
 * POST /api/export/preview
 * Genera una vista previa de los datos a exportar
 */
router.post('/preview', isAuthenticated, async (req: any, res) => {
  try {
    const config = exportConfigSchema.parse(req.body);

    // Limitar a 10 registros para la vista previa
    const previewConfig = {
      ...config,
      filters: {
        ...config.filters,
        limit: 10,
      },
    };

    // Obtener datos de vista previa
    const result = await exportService.exportData(
      previewConfig,
      req.user?.id,
      req.user?.instituteId
    );

    res.json({
      success: true,
      data: {
        preview: result.data,
        totalRecords: result.metadata.totalRecords,
        sampleSize: 10,
        config: previewConfig,
      },
    });

  } catch (error) {
    logger.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar vista previa',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/export/formats
 * Obtiene formatos de exportación disponibles
 */
router.get('/formats', isAuthenticated, async (req: any, res) => {
  try {
    const formats = [
      {
        id: 'csv',
        name: 'CSV',
        description: 'Archivo de valores separados por comas',
        icon: '📄',
        mimeType: 'text/csv',
        extension: '.csv',
        features: ['Compresión', 'Delimitadores personalizables', 'Metadata opcional'],
      },
      {
        id: 'excel',
        name: 'Excel',
        description: 'Archivo de Microsoft Excel',
        icon: '📊',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        features: ['Múltiples hojas', 'Formato avanzado', 'Fórmulas'],
      },
      {
        id: 'json',
        name: 'JSON',
        description: 'Formato de intercambio de datos',
        icon: '🔧',
        mimeType: 'application/json',
        extension: '.json',
        features: ['Estructura anidada', 'Metadata incluida', 'Compresión'],
      },
      {
        id: 'xml',
        name: 'XML',
        description: 'Lenguaje de marcado extensible',
        icon: '📋',
        mimeType: 'application/xml',
        extension: '.xml',
        features: ['Estructura jerárquica', 'Validación', 'Metadata incluida'],
      },
    ];

    res.json({
      success: true,
      data: formats,
    });

  } catch (error) {
    logger.error('Error getting formats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener formatos',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router; 