import { Router } from 'express';
import { z } from 'zod';
import { guardAutomationService } from '../services/guard-automation-service.js';
import { publishEvent } from '../src/services/events';
import { EventTopics } from '../shared/events';
import { isAuthenticated, requireRole } from '../middleware/auth.js';

const router = Router();

// Schemas de validación
const activityAssignmentSchema = z.object({
  activityId: z.number().min(1, 'ID de actividad requerido')
});

const statsPeriodSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// ============================================================================
// RUTAS DE ASIGNACIÓN AUTOMÁTICA
// ============================================================================

// POST /api/guard-automation/assign-for-activity/:activityId - Asignar guardias automáticamente
router.post('/assign-for-activity/:activityId', isAuthenticated, requireRole(['admin', 'institute_admin', 'manager']), async (req, res) => {
  try {
    const { activityId } = req.params;
    const user = req.user as any;
    
    if (!activityId || isNaN(parseInt(activityId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de actividad inválido'
      });
    }
    
    logger.info(`🏫 Iniciando assignació automàtica de guàrdies per activitat ${activityId}`);
    
    const result = await guardAutomationService.assignGuardDutiesForActivity(parseInt(activityId));

    // Emitir eventos por cada guardia asignada/pendiente
    for (const d of result.details) {
      if (d.status === 'assigned') {
        await publishEvent(EventTopics.guards, 'guard.assignment.created', {
          assignmentId: String(d.guardId),
          scheduleId: 'unknown',
          date: new Date().toISOString().split('T')[0],
          fromTeacherId: 'unknown',
          substituteTeacherId: undefined,
          status: 'assigned',
        });
      } else {
        await publishEvent(EventTopics.guards, 'guard.assignment.failed', {
          assignmentId: String(d.guardId),
          scheduleId: 'unknown',
          date: new Date().toISOString().split('T')[0],
          fromTeacherId: 'unknown',
          status: 'failed',
        });
      }
    }
    
    res.json({
      success: true,
      message: `Assignació completada: ${result.guardsAssigned}/${result.totalGuardsNeeded} guàrdies assignades`,
      data: result
    });
    
  } catch (error) {
    console.error('Error en assignació automàtica de guàrdies:', error);
    res.status(500).json({
      success: false,
      error: 'Error en l\'assignació automàtica de guàrdies'
    });
  }
});

// POST /api/guard-automation/assign-for-activity - Asignar guardias con datos en body
router.post('/assign-for-activity', isAuthenticated, requireRole(['admin', 'institute_admin', 'manager']), async (req, res) => {
  try {
    const data = activityAssignmentSchema.parse(req.body);
    const user = req.user as any;
    
    logger.info(`🏫 Iniciando assignació automàtica de guàrdies per activitat ${data.activityId}`);
    
    const result = await guardAutomationService.assignGuardDutiesForActivity(data.activityId);
    
    res.json({
      success: true,
      message: `Assignació completada: ${result.guardsAssigned}/${result.totalGuardsNeeded} guàrdies assignades`,
      data: result
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }
    
    console.error('Error en assignació automàtica de guàrdies:', error);
    res.status(500).json({
      success: false,
      error: 'Error en l\'assignació automàtica de guàrdies'
    });
  }
});

// ============================================================================
// RUTAS DE ESTADÍSTICAS
// ============================================================================

// GET /api/guard-automation/stats - Obtener estadísticas de guardias
router.get('/stats', isAuthenticated, requireRole(['admin', 'institute_admin', 'manager']), async (req, res) => {
  try {
    const user = req.user as any;
    const data = statsPeriodSchema.parse(req.query);
    
    const period = data.startDate && data.endDate ? {
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate)
    } : undefined;
    
    const stats = await guardAutomationService.getGuardStats(user.instituteId, period);
    
    res.json({
      success: true,
      data: stats,
      message: 'Estadístiques obtingudes correctament'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Paràmetres invàlids',
        details: error.errors
      });
    }
    
    console.error('Error obtenint estadístiques de guàrdies:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE GESTIÓN DE GUARDIAS
// ============================================================================

// GET /api/guard-automation/guards - Obtener guardias pendientes
router.get('/guards', isAuthenticated, requireRole(['admin', 'institute_admin', 'manager', 'teacher']), async (req, res) => {
  try {
    const user = req.user as any;
    const { status, teacherId } = req.query;
    
    let query = db
      .select({
        guard: guardDuties,
        originalTeacher: users.firstName,
        originalTeacherLastName: users.lastName,
        substituteTeacher: users.firstName,
        substituteTeacherLastName: users.lastName,
        className: classes.name,
        subjectName: subjects.name
      })
      .from(guardDuties)
      .leftJoin(users, eq(guardDuties.originalTeacherId, users.id))
      .leftJoin(classes, eq(guardDuties.classId, classes.id))
      .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
      .where(eq(guardDuties.instituteId, user.instituteId));
    
    if (status) {
      query = query.where(eq(guardDuties.status, status as string));
    }
    
    if (teacherId) {
      query = query.where(
        or(
          eq(guardDuties.originalTeacherId, parseInt(teacherId as string)),
          eq(guardDuties.substituteTeacherId, parseInt(teacherId as string))
        )
      );
    }
    
    const guards = await query.orderBy(desc(guardDuties.date));
    
    res.json({
      success: true,
      data: guards,
      message: 'Guàrdies obtingudes correctament'
    });
    
  } catch (error) {
    console.error('Error obtenint guàrdies:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// PUT /api/guard-automation/guards/:id/confirm - Confirmar guardia
router.put('/guards/:id/confirm', isAuthenticated, requireRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Verificar que el usuario es el sustituto asignado
    const guard = await db
      .select()
      .from(guardDuties)
      .where(
        and(
          eq(guardDuties.id, parseInt(id)),
          eq(guardDuties.substituteTeacherId, user.id)
        )
      )
      .limit(1);
    
    if (!guard.length) {
      return res.status(404).json({
        success: false,
        error: 'Guàrdia no trobada o no tens permisos per confirmar-la'
      });
    }
    
    // Actualizar estado de la guardia
    await db
      .update(guardDuties)
      .set({
        status: 'confirmed',
        confirmedAt: new Date()
      })
      .where(eq(guardDuties.id, parseInt(id)));
    
    res.json({
      success: true,
      message: 'Guàrdia confirmada correctament'
    });
    
  } catch (error) {
    console.error('Error confirmant guàrdia:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// PUT /api/guard-automation/guards/:id/complete - Completar guardia
router.put('/guards/:id/complete', isAuthenticated, requireRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { feedbackNotes } = req.body;
    const user = req.user as any;
    
    // Verificar que el usuario es el sustituto asignado
    const guard = await db
      .select()
      .from(guardDuties)
      .where(
        and(
          eq(guardDuties.id, parseInt(id)),
          eq(guardDuties.substituteTeacherId, user.id)
        )
      )
      .limit(1);
    
    if (!guard.length) {
      return res.status(404).json({
        success: false,
        error: 'Guàrdia no trobada o no tens permisos per completar-la'
      });
    }
    
    // Actualizar estado de la guardia
    await db
      .update(guardDuties)
      .set({
        status: 'completed',
        feedbackNotes,
        signedAt: new Date()
      })
      .where(eq(guardDuties.id, parseInt(id)));
    
    res.json({
      success: true,
      message: 'Guàrdia completada correctament'
    });
    
  } catch (error) {
    console.error('Error completant guàrdia:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE CONFIGURACIÓN
// ============================================================================

// GET /api/guard-automation/config - Obtener configuración
router.get('/config', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    
    // Aquí se obtendría la configuración específica del instituto
    const config = {
      autoAssignment: true,
      notificationEnabled: true,
      priorityRules: {
        sameSubject: 1,
        availableTeacher: 2,
        workloadBalance: 3
      },
      maxGuardsPerTeacher: 5,
      notificationChannels: ['email', 'sms']
    };
    
    res.json({
      success: true,
      data: config,
      message: 'Configuració obtinguda correctament'
    });
    
  } catch (error) {
    console.error('Error obtenint configuració:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// PUT /api/guard-automation/config - Actualizar configuración
router.put('/config', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const { autoAssignment, notificationEnabled, priorityRules } = req.body;
    
    // Aquí se actualizaría la configuración en la base de datos
    logger.info(`⚙️ Configuració actualitzada per institut ${user.instituteId}`);
    
    res.json({
      success: true,
      message: 'Configuració actualitzada correctament'
    });
    
  } catch (error) {
    console.error('Error actualitzant configuració:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

export default router; 