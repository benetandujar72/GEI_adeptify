import { Router } from 'express';
import { z } from 'zod';
import { scheduleService } from '../services/schedule-service.js';
import { isAuthenticated, requireRole } from '../middleware/auth.js';

const router = Router();

// Schemas de validación
const scheduleSchema = z.object({
  teacherId: z.string().min(1, 'ID de professor requerit'),
  classId: z.string().min(1, 'ID de classe requerit'),
  subjectId: z.string().min(1, 'ID d\'assignatura requerit'),
  dayOfWeek: z.number().min(0).max(6, 'Dia de la setmana ha de ser entre 0 i 6'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'hora invàlid (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'hora invàlid (HH:MM)'),
  room: z.string().optional(),
  notes: z.string().optional()
});

const scheduleUpdateSchema = scheduleSchema.partial();

const availabilityCheckSchema = z.object({
  teacherId: z.string().min(1, 'ID de professor requerit'),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
});

// ============================================================================
// RUTAS DE GESTIÓN DE HORARIOS
// ============================================================================

// POST /api/schedule - Crear nuevo horario
router.post('/', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const data = scheduleSchema.parse(req.body);

    // Verificar que la hora de fin es posterior a la de inicio
    if (data.startTime >= data.endTime) {
      return res.status(400).json({
        success: false,
        error: 'L\'hora de fi ha de ser posterior a l\'hora d\'inici'
      });
    }

    const schedule = await scheduleService.createSchedule(data);

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Horari creat correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    if (error instanceof Error && error.message.includes('Conflictes detectats')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    console.error('Error creant horari:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/schedule/teacher/:teacherId - Obtener horarios de un profesor
router.get('/teacher/:teacherId', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const user = req.user as any;
    const { dayOfWeek } = req.query;

    // Verificar permisos: solo puede ver su propio horario o ser admin
    if (user.role === 'teacher' && user.id !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'No tens permisos per veure aquest horari'
      });
    }

    const filters = {
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek as string) : undefined
    };

    const schedules = await scheduleService.getTeacherSchedule(teacherId, filters);

    res.json({
      success: true,
      data: schedules,
      message: 'Horaris de professor obtinguts correctament'
    });
  } catch (error) {
    console.error('Error obtenint horaris de professor:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/schedule/class/:classId - Obtener horarios de una clase
router.get('/class/:classId', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { dayOfWeek } = req.query;

    const filters = {
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek as string) : undefined
    };

    const schedules = await scheduleService.getClassSchedule(classId, filters);

    res.json({
      success: true,
      data: schedules,
      message: 'Horaris de classe obtinguts correctament'
    });
  } catch (error) {
    console.error('Error obtenint horaris de classe:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/schedule/institute - Obtener horarios del instituto
router.get('/institute', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const { dayOfWeek, teacherId, classId } = req.query;

    const filters = {
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek as string) : undefined,
      teacherId: teacherId as string,
      classId: classId as string
    };

    const schedules = await scheduleService.getInstituteSchedule(user.instituteId, filters);

    res.json({
      success: true,
      data: schedules,
      message: 'Horaris d\'institut obtinguts correctament'
    });
  } catch (error) {
    console.error('Error obtenint horaris d\'institut:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// PUT /api/schedule/:id - Actualizar horario
router.put('/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = scheduleUpdateSchema.parse(req.body);

    // Verificar que la hora de fin es posterior a la de inicio si se están actualizando
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      return res.status(400).json({
        success: false,
        error: 'L\'hora de fi ha de ser posterior a l\'hora d\'inici'
      });
    }

    const schedule = await scheduleService.updateSchedule(id, data);

    res.json({
      success: true,
      data: schedule,
      message: 'Horari actualitzat correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    if (error instanceof Error && error.message.includes('Conflictes detectats')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    console.error('Error actualitzant horari:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// DELETE /api/schedule/:id - Eliminar horario
router.delete('/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await scheduleService.deleteSchedule(id);

    res.json({
      success: true,
      message: 'Horari eliminat correctament'
    });
  } catch (error) {
    console.error('Error eliminant horari:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE VERIFICACIÓN Y CONFLICTOS
// ============================================================================

// POST /api/schedule/check-conflicts - Verificar conflictos
router.post('/check-conflicts', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const data = scheduleSchema.parse(req.body);

    const conflicts = await scheduleService.checkConflicts(data);

    res.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts
      },
      message: conflicts.length > 0 ? 'Conflictes detectats' : 'No hi ha conflictes'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error verificant conflictes:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// POST /api/schedule/check-availability - Verificar disponibilidad de profesor
router.post('/check-availability', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const data = availabilityCheckSchema.parse(req.body);

    const isAvailable = await scheduleService.checkTeacherAvailability(
      data.teacherId,
      data.dayOfWeek,
      data.startTime,
      data.endTime
    );

    res.json({
      success: true,
      data: {
        isAvailable,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime
      },
      message: isAvailable ? 'Professor disponible' : 'Professor no disponible'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error verificant disponibilitat:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE ESTADÍSTICAS
// ============================================================================

// GET /api/schedule/stats - Obtener estadísticas de horarios
router.get('/stats', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;

    const stats = await scheduleService.getScheduleStats(user.instituteId);

    res.json({
      success: true,
      data: stats,
      message: 'Estadístiques d\'horaris obtingudes correctament'
    });
  } catch (error) {
    console.error('Error obtenint estadístiques d\'horaris:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS ADICIONALES
// ============================================================================

// GET /api/schedule/room/:room - Obtener horarios por aula
router.get('/room/:room', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { room } = req.params;
    const user = req.user as any;
    const { dayOfWeek } = req.query;

    const filters = {
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek as string) : undefined
    };

    const schedules = await scheduleService.getRoomSchedule(room, user.instituteId, filters);

    res.json({
      success: true,
      data: schedules,
      message: `Horaris de l'aula ${room} obtinguts correctament`
    });
  } catch (error) {
    console.error('Error obtenint horaris d\'aula:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/schedule/my-schedule - Obtener horario propio (para profesores)
router.get('/my-schedule', isAuthenticated, requireRole(['teacher']), async (req, res) => {
  try {
    const user = req.user as any;
    const { dayOfWeek } = req.query;

    const filters = {
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek as string) : undefined
    };

    const schedules = await scheduleService.getTeacherSchedule(user.id, filters);

    res.json({
      success: true,
      data: schedules,
      message: 'El teu horari obtingut correctament'
    });
  } catch (error) {
    console.error('Error obtenint horari propi:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

export default router; 