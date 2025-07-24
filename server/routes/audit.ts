import { Router } from 'express';
import { auditService } from '../services/audit-service.js';
import { isAuthenticated } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();

// Middleware de auditoría para todas las rutas
router.use(auditMiddleware('audit'));

// Esquemas de validación
const auditFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  instituteId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

const exportSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  filters: auditFilterSchema.optional(),
});

/**
 * GET /api/audit/logs
 * Obtiene logs de auditoría con filtros
 */
router.get('/logs', isAuthenticated, async (req: any, res) => {
  try {
    // Verificar permisos
    if (!req.user || !auditService.canViewAuditLogs(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver logs de auditoría',
      });
    }

    // Validar filtros
    const filters = auditFilterSchema.parse(req.query);
    
    // Convertir fechas si están presentes
    const auditFilters: any = { ...filters };
    if (auditFilters.startDate) {
      auditFilters.startDate = new Date(auditFilters.startDate);
    }
    if (auditFilters.endDate) {
      auditFilters.endDate = new Date(auditFilters.endDate);
    }

    // Aplicar filtro de instituto si no es super_admin
    if (req.user.role !== 'super_admin') {
      auditFilters.instituteId = req.user.instituteId;
    }

    const logs = await auditService.getAuditLogs(auditFilters);

    res.json({
      success: true,
      data: logs,
      total: logs.length,
      filters,
    });

  } catch (error) {
    logger.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs de auditoría',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/audit/stats
 * Obtiene estadísticas de auditoría
 */
router.get('/stats', isAuthenticated, async (req: any, res) => {
  try {
    // Verificar permisos
    if (!req.user || !auditService.canViewAuditLogs(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estadísticas de auditoría',
      });
    }

    const { startDate, endDate } = req.query;
    
    // Convertir fechas si están presentes
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Aplicar filtro de instituto si no es super_admin
    const instituteId = req.user.role !== 'super_admin' ? req.user.instituteId : undefined;

    const stats = await auditService.getAuditStats(instituteId, start, end);

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de auditoría',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/audit/export
 * Exporta logs de auditoría
 */
router.post('/export', isAuthenticated, async (req: any, res) => {
  try {
    // Verificar permisos
    if (!req.user || !auditService.canExportAuditLogs(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para exportar logs de auditoría',
      });
    }

    // Validar parámetros
    const { format, filters } = exportSchema.parse(req.body);
    
    // Convertir fechas si están presentes
    const auditFilters: any = { ...filters };
    if (auditFilters?.startDate) {
      auditFilters.startDate = new Date(auditFilters.startDate);
    }
    if (auditFilters?.endDate) {
      auditFilters.endDate = new Date(auditFilters.endDate);
    }

    // Aplicar filtro de instituto si no es super_admin
    if (req.user.role !== 'super_admin' && auditFilters) {
      auditFilters.instituteId = req.user.instituteId;
    }

    const logs = await auditService.getAuditLogs(auditFilters);

    // Generar exportación según el formato
    let exportData: any;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(logs, null, 2);
        contentType = 'application/json';
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'csv':
        exportData = generateCSV(logs);
        contentType = 'text/csv';
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'xlsx':
        // Para XLSX necesitaríamos una librería como xlsx
        // Por ahora devolvemos JSON
        exportData = JSON.stringify(logs, null, 2);
        contentType = 'application/json';
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        break;

      default:
        throw new Error('Formato de exportación no soportado');
    }

    // Configurar headers de descarga
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(exportData));

    res.send(exportData);

  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar logs de auditoría',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/audit/cleanup
 * Limpia logs antiguos
 */
router.post('/cleanup', isAuthenticated, async (req: any, res) => {
  try {
    // Solo super_admin puede limpiar logs
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los super administradores pueden limpiar logs',
      });
    }

    const { olderThanDays = 365 } = req.body;

    if (typeof olderThanDays !== 'number' || olderThanDays < 30) {
      return res.status(400).json({
        success: false,
        message: 'Los logs deben tener al menos 30 días para ser eliminados',
      });
    }

    const deletedCount = await auditService.cleanupOldLogs(olderThanDays);

    res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} logs antiguos`,
      deletedCount,
    });

  } catch (error) {
    logger.error('Error cleaning up audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar logs de auditoría',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * GET /api/audit/actions
 * Obtiene lista de acciones disponibles
 */
router.get('/actions', isAuthenticated, async (req: any, res) => {
  try {
    // Verificar permisos
    if (!req.user || !auditService.canViewAuditLogs(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta información',
      });
    }

    const actions = [
      'CREATE', 'READ', 'READ_ONE', 'READ_LIST', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'EXPORT', 'IMPORT',
      'PASSWORD_CHANGE', 'PROFILE_UPDATE', 'SETTINGS_CHANGE'
    ];

    const resources = [
      'users', 'institutes', 'academic_years', 'competencies', 'criteria',
      'evaluations', 'grades', 'classes', 'students', 'teachers',
      'attendance', 'schedules', 'absences', 'guard_duties',
      'surveys', 'survey_questions', 'survey_responses',
      'resources', 'reservations', 'achievements', 'notifications',
      'auth', 'audit', 'reports', 'exports'
    ];

    res.json({
      success: true,
      data: {
        actions,
        resources,
      },
    });

  } catch (error) {
    logger.error('Error getting audit actions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener acciones de auditoría',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * Función auxiliar para generar CSV
 */
function generateCSV(logs: any[]): string {
  if (logs.length === 0) {
    return 'No hay datos para exportar';
  }

  const headers = ['ID', 'Usuario', 'Instituto', 'Acción', 'Recurso', 'IP', 'Fecha', 'Detalles'];
  const rows = logs.map(log => [
    log.id,
    log.userId || 'N/A',
    log.instituteId || 'N/A',
    log.action,
    log.resource,
    log.ipAddress || 'N/A',
    new Date(log.createdAt).toISOString(),
    JSON.stringify(log.details || {}),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export default router; 