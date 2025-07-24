import { Router } from 'express';
import { z } from 'zod';
import { communicationService } from '../services/communication-service.js';
import { isAuthenticated, requireRole } from '../middleware/auth.js';

const router = Router();

// Schemas de validación
const notificationSchema = z.object({
  title: z.string().min(1, 'Títol requerit'),
  message: z.string().min(1, 'Missatge requerit'),
  type: z.enum(['info', 'warning', 'error', 'success']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  recipientIds: z.array(z.string()).optional(),
  classIds: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

const classNotificationSchema = z.object({
  title: z.string().min(1, 'Títol requerit'),
  message: z.string().min(1, 'Missatge requerit'),
  type: z.enum(['info', 'warning', 'error', 'success']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  metadata: z.record(z.any()).optional()
});

const instituteNotificationSchema = z.object({
  title: z.string().min(1, 'Títol requerit'),
  message: z.string().min(1, 'Missatge requerit'),
  type: z.enum(['info', 'warning', 'error', 'success']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  metadata: z.record(z.any()).optional()
});

// ============================================================================
// RUTAS DE ENVÍO DE NOTIFICACIONES
// ============================================================================

// POST /api/communication/send - Enviar notificación individual
router.post('/send', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const data = notificationSchema.parse(req.body);

    const notificationData = {
      ...data,
      instituteId: user.instituteId,
      senderId: user.id
    };

    const notification = await communicationService.sendNotification(notificationData);

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notificació enviada correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error enviant notificació:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// POST /api/communication/send-class/:classId - Enviar notificación a una clase
router.post('/send-class/:classId', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId } = req.params;
    const user = req.user as any;
    const data = classNotificationSchema.parse(req.body);

    const notificationData = {
      ...data,
      instituteId: user.instituteId,
      senderId: user.id
    };

    const notification = await communicationService.sendClassNotification(classId, notificationData);

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notificació de classe enviada correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error enviant notificació de classe:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// POST /api/communication/send-institute - Enviar notificación a todo el instituto
router.post('/send-institute', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const data = instituteNotificationSchema.parse(req.body);

    const notificationData = {
      ...data,
      instituteId: user.instituteId,
      senderId: user.id
    };

    const notification = await communicationService.sendInstituteNotification(user.instituteId, notificationData);

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notificació d\'institut enviada correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error enviant notificació d\'institut:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE GESTIÓN DE NOTIFICACIONES
// ============================================================================

// GET /api/communication/notifications - Obtener notificaciones del usuario
router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { unreadOnly, type, priority, limit } = req.query;

    const filters = {
      unreadOnly: unreadOnly === 'true',
      type: type as string,
      priority: priority as string,
      limit: limit ? parseInt(limit as string) : undefined
    };

    const notifications = await communicationService.getUserNotifications(user.id, filters);

    res.json({
      success: true,
      data: notifications,
      message: 'Notificacions obtingudes correctament'
    });
  } catch (error) {
    console.error('Error obtenint notificacions:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// PUT /api/communication/notifications/:id/read - Marcar notificación como leída
router.put('/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    const notification = await communicationService.markAsRead(id, user.id);

    res.json({
      success: true,
      data: notification,
      message: 'Notificació marcada com llegida'
    });
  } catch (error) {
    console.error('Error marcant notificació com llegida:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// PUT /api/communication/notifications/read-all - Marcar todas como leídas
router.put('/notifications/read-all', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;

    await communicationService.markAllAsRead(user.id);

    res.json({
      success: true,
      message: 'Totes les notificacions marcades com llegides'
    });
  } catch (error) {
    console.error('Error marcant totes les notificacions com llegides:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// DELETE /api/communication/notifications/:id - Eliminar notificación
router.delete('/notifications/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    await communicationService.deleteNotification(id, user.id);

    res.json({
      success: true,
      message: 'Notificació eliminada correctament'
    });
  } catch (error) {
    console.error('Error eliminant notificació:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE ESTADÍSTICAS
// ============================================================================

// GET /api/communication/stats - Obtener estadísticas de notificaciones
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;

    const stats = await communicationService.getNotificationStats(user.id);

    res.json({
      success: true,
      data: stats,
      message: 'Estadístiques obtingudes correctament'
    });
  } catch (error) {
    console.error('Error obtenint estadístiques de notificacions:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE NOTIFICACIONES AUTOMÁTICAS
// ============================================================================

// POST /api/communication/guard-assignment - Notificación de guardia asignada
router.post('/guard-assignment', isAuthenticated, requireRole(['admin', 'institute_admin', 'manager']), async (req, res) => {
  try {
    const { guardId, substituteTeacherId } = req.body;

    if (!guardId || !substituteTeacherId) {
      return res.status(400).json({
        success: false,
        error: 'guardId i substituteTeacherId són requerits'
      });
    }

    await communicationService.sendGuardAssignmentNotification(guardId, substituteTeacherId);

    res.json({
      success: true,
      message: 'Notificació de guàrdia enviada correctament'
    });
  } catch (error) {
    console.error('Error enviant notificació de guàrdia:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// POST /api/communication/attendance-reminder - Recordatorio de asistencia
router.post('/attendance-reminder', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId, teacherId } = req.body;

    if (!classId || !teacherId) {
      return res.status(400).json({
        success: false,
        error: 'classId i teacherId són requerits'
      });
    }

    await communicationService.sendAttendanceReminderNotification(classId, teacherId);

    res.json({
      success: true,
      message: 'Recordatori d\'assistència enviat correctament'
    });
  } catch (error) {
    console.error('Error enviant recordatori d\'assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// POST /api/communication/evaluation-reminder - Recordatorio de evaluación
router.post('/evaluation-reminder', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { teacherId, competencyType } = req.body;

    if (!teacherId || !competencyType) {
      return res.status(400).json({
        success: false,
        error: 'teacherId i competencyType són requerits'
      });
    }

    await communicationService.sendEvaluationReminderNotification(teacherId, competencyType);

    res.json({
      success: true,
      message: 'Recordatori d\'evaluació enviat correctament'
    });
  } catch (error) {
    console.error('Error enviant recordatori d\'evaluació:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

export default router; 