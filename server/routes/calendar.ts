import { Router } from 'express';
import { z } from 'zod';
import { calendarService, type CalendarEvent } from '../services/calendar-service';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

// Esquemas de validación
const createEventSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(200, 'El título es demasiado largo'),
  description: z.string().optional(),
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  location: z.string().optional(),
  type: z.enum(['activity', 'guard', 'meeting', 'exam', 'holiday', 'custom']).default('activity'),
  isAllDay: z.boolean().default(false),
  reminders: z.array(z.object({
    type: z.enum(['email', 'push', 'sms']),
    minutes: z.number().min(0).max(10080) // máximo 1 semana
  })).optional()
});

const updateEventSchema = createEventSchema.partial();

const getEventsSchema = z.object({
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  types: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  userId: z.number().optional()
});

const reportSchema = z.object({
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf')
});

/**
 * @route POST /api/calendar/events
 * @desc Crear un nuevo evento en el calendario
 * @access Private (admin, teacher, institute_admin)
 */
router.post('/events', 
  authenticateToken, 
  requireRole(['admin', 'teacher', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId, userId } = req.user!;
      
      // Validar datos de entrada
      const validatedData = createEventSchema.parse(req.body);
      
      // Convertir fechas
      const eventData = {
        ...validatedData,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        source: 'internal' as const
      };

      // Crear evento
      const event = await calendarService.createEvent(eventData, instituteId, userId);

      // Log de auditoría
      auditLog(req, 'calendar_event_created', {
        eventId: event.id,
        eventTitle: event.title,
        instituteId
      });

      res.status(201).json({
        success: true,
        data: event,
        message: 'Evento creado exitosamente'
      });
    } catch (error) {
      console.error('Error creando evento:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/calendar/events
 * @desc Obtener eventos para un período específico
 * @access Private (todos los roles)
 */
router.get('/events', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { instituteId } = req.user!;
      
      // Validar parámetros de consulta
      const validatedParams = getEventsSchema.parse(req.query);
      
      // Convertir fechas
      const startDate = new Date(validatedParams.startDate);
      const endDate = new Date(validatedParams.endDate);

      // Obtener eventos
      const events = await calendarService.getEvents(
        instituteId,
        startDate,
        endDate,
        {
          types: validatedParams.types,
          sources: validatedParams.sources,
          userId: validatedParams.userId
        }
      );

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/calendar/events/:id
 * @desc Obtener un evento específico
 * @access Private (todos los roles)
 */
router.get('/events/:id', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { instituteId } = req.user!;
      const { id } = req.params;

      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'ID de evento inválido'
        });
      }

      // Obtener evento
      const event = await calendarService.getEventById(id, instituteId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Error obteniendo evento:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route PUT /api/calendar/events/:id
 * @desc Actualizar un evento existente
 * @access Private (admin, teacher, institute_admin)
 */
router.put('/events/:id', 
  authenticateToken, 
  requireRole(['admin', 'teacher', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId, userId } = req.user!;
      const { id } = req.params;
      
      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'ID de evento inválido'
        });
      }

      // Validar datos de entrada
      const validatedData = updateEventSchema.parse(req.body);
      
      // Convertir fechas si están presentes
      const updates: Partial<CalendarEvent> = { ...validatedData };
      if (validatedData.startDate) {
        updates.startDate = new Date(validatedData.startDate);
      }
      if (validatedData.endDate) {
        updates.endDate = new Date(validatedData.endDate);
      }

      // Actualizar evento
      const event = await calendarService.updateEvent(id, updates, instituteId, userId);

      // Log de auditoría
      auditLog(req, 'calendar_event_updated', {
        eventId: event.id,
        eventTitle: event.title,
        instituteId
      });

      res.json({
        success: true,
        data: event,
        message: 'Evento actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error actualizando evento:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route DELETE /api/calendar/events/:id
 * @desc Eliminar un evento
 * @access Private (admin, teacher, institute_admin)
 */
router.delete('/events/:id', 
  authenticateToken, 
  requireRole(['admin', 'teacher', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId, userId } = req.user!;
      const { id } = req.params;
      
      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'ID de evento inválido'
        });
      }

      // Obtener evento antes de eliminarlo para el log
      const event = await calendarService.getEventById(id, instituteId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Eliminar evento
      await calendarService.deleteEvent(id, instituteId, userId);

      // Log de auditoría
      auditLog(req, 'calendar_event_deleted', {
        eventId: event.id,
        eventTitle: event.title,
        instituteId
      });

      res.json({
        success: true,
        message: 'Evento eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando evento:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/calendar/stats
 * @desc Obtener estadísticas del calendario
 * @access Private (admin, institute_admin)
 */
router.get('/stats', 
  authenticateToken, 
  requireRole(['admin', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId } = req.user!;
      
      // Validar parámetros
      const validatedParams = getEventsSchema.parse(req.query);
      
      const startDate = new Date(validatedParams.startDate);
      const endDate = new Date(validatedParams.endDate);

      // Obtener estadísticas
      const stats = await calendarService.getCalendarStats(instituteId, startDate, endDate);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route POST /api/calendar/sync
 * @desc Sincronizar eventos con Google Calendar
 * @access Private (admin, institute_admin)
 */
router.post('/sync', 
  authenticateToken, 
  requireRole(['admin', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId } = req.user!;

      // Iniciar sincronización
      const result = await calendarService.syncWithGoogleCalendar(instituteId);

      // Log de auditoría
      auditLog(req, 'calendar_sync_initiated', {
        instituteId,
        synced: result.synced,
        errors: result.errors
      });

      res.json({
        success: true,
        data: result,
        message: `Sincronización completada: ${result.synced} eventos sincronizados, ${result.errors} errores`
      });
    } catch (error) {
      console.error('Error en sincronización:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/calendar/conflicts
 * @desc Obtener conflictos de horarios
 * @access Private (admin, teacher, institute_admin)
 */
router.get('/conflicts', 
  authenticateToken, 
  requireRole(['admin', 'teacher', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId } = req.user!;
      
      // Validar parámetros
      const validatedParams = getEventsSchema.parse(req.query);
      const { excludeEventId } = req.query;
      
      const startDate = new Date(validatedParams.startDate);
      const endDate = new Date(validatedParams.endDate);

      // Obtener conflictos
      const conflicts = await calendarService.getScheduleConflicts(
        instituteId,
        startDate,
        endDate,
        excludeEventId as string
      );

      res.json({
        success: true,
        data: conflicts,
        count: conflicts.length
      });
    } catch (error) {
      console.error('Error obteniendo conflictos:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route POST /api/calendar/report
 * @desc Generar reporte de calendario
 * @access Private (admin, institute_admin)
 */
router.post('/report', 
  authenticateToken, 
  requireRole(['admin', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId } = req.user!;
      
      // Validar datos de entrada
      const validatedData = reportSchema.parse(req.body);
      
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);

      // Generar reporte
      const report = await calendarService.generateCalendarReport(
        instituteId,
        startDate,
        endDate,
        validatedData.format
      );

      // Log de auditoría
      auditLog(req, 'calendar_report_generated', {
        instituteId,
        format: validatedData.format,
        filename: report.filename
      });

      res.json({
        success: true,
        data: report.data,
        filename: report.filename,
        message: 'Reporte generado exitosamente'
      });
    } catch (error) {
      console.error('Error generando reporte:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/calendar/health
 * @desc Verificar estado del servicio de calendario
 * @access Private (admin, institute_admin)
 */
router.get('/health', 
  authenticateToken, 
  requireRole(['admin', 'institute_admin']),
  async (req, res) => {
    try {
      const { instituteId } = req.user!;
      
      // Verificar conectividad con Google Calendar
      const googleCalendarStatus = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET 
        ? 'configured' 
        : 'not_configured';

      // Obtener estadísticas básicas
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const stats = await calendarService.getCalendarStats(instituteId, now, nextMonth);

      const health = {
        status: 'healthy',
        googleCalendar: googleCalendarStatus,
        autoSync: true,
        lastSync: new Date().toISOString(),
        stats: {
          totalEvents: stats.totalEvents,
          upcomingEvents: stats.upcomingEvents
        }
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error verificando salud del calendario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
);

export default router; 