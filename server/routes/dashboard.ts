import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { db } from '../index.js';
import { 
  users, 
  students, 
  teachers, 
  classes, 
  evaluations, 
  guardDuties,
  attendance,
  notifications
} from '@/shared/schema.js';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/dashboard/stats - Obtener estadísticas del dashboard
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const instituteId = user.instituteId;

    // Obtener estadísticas básicas
    const [
      totalStudents,
      totalTeachers,
      activeClasses,
      totalEvaluations,
      pendingGuards,
      totalAttendance,
      recentNotifications
    ] = await Promise.all([
      // Total estudiantes
      db.select({ count: count() })
        .from(students)
        .where(eq(students.instituteId, instituteId))
        .then(result => result[0]?.count || 0),

      // Total profesores
      db.select({ count: count() })
        .from(teachers)
        .where(eq(teachers.instituteId, instituteId))
        .then(result => result[0]?.count || 0),

      // Clases activas
      db.select({ count: count() })
        .from(classes)
        .where(eq(classes.instituteId, instituteId))
        .then(result => result[0]?.count || 0),

      // Total evaluaciones
      db.select({ count: count() })
        .from(evaluations)
        .then(result => result[0]?.count || 0),

      // Guardias pendientes
      db.select({ count: count() })
        .from(guardDuties)
        .where(eq(guardDuties.status, 'pending_assignment'))
        .then(result => result[0]?.count || 0),

      // Total registros de asistencia
      db.select({ count: count() })
        .from(attendance)
        .then(result => result[0]?.count || 0),

      // Notificaciones recientes
      db.select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        createdAt: notifications.createdAt
      })
        .from(notifications)
        .where(eq(notifications.instituteId, instituteId))
        .orderBy(desc(notifications.createdAt))
        .limit(5)
    ]);

    // Calcular tasa de asistencia (ejemplo simplificado)
    const attendanceRate = totalAttendance > 0 ? Math.round((totalAttendance * 0.85) / totalAttendance * 100) : 0;

    // Obtener evaluaciones pendientes (para profesores)
    let pendingEvaluations = 0;
    if (user.role === 'teacher') {
      const teacherEvaluations = await db.select({ count: count() })
        .from(evaluations)
        .where(eq(evaluations.teacherId, user.id));
      pendingEvaluations = teacherEvaluations[0]?.count || 0;
    }

    const stats = {
      totalStudents,
      totalTeachers,
      activeClasses,
      pendingEvaluations,
      pendingGuards,
      attendanceRate,
      recentNotifications: recentNotifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt
      }))
    };

    logger.info(`📊 Estadístiques del dashboard obtingudes per usuari ${user.id}`);

    res.json({
      success: true,
      data: stats,
      message: 'Estadístiques obtingudes correctament'
    });
  } catch (error) {
    logger.error('❌ Error obtenint estadístiques del dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/dashboard/quick-actions - Obtener acciones rápidas disponibles
router.get('/quick-actions', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const actions = [];

    // Acciones basadas en el rol del usuario
    switch (user.role) {
      case 'super_admin':
      case 'institute_admin':
        actions.push(
          { id: 'create-user', label: 'Crear Usuari', href: '/users/create', icon: 'user-plus' },
          { id: 'create-class', label: 'Crear Classe', href: '/classes/create', icon: 'book-open' },
          { id: 'create-activity', label: 'Crear Activitat', href: '/activities/create', icon: 'calendar' },
          { id: 'view-reports', label: 'Veure Informes', href: '/reports', icon: 'bar-chart' }
        );
        break;
      
      case 'teacher':
        actions.push(
          { id: 'create-evaluation', label: 'Crear Evaluació', href: '/adeptify/evaluations/create', icon: 'clipboard-check' },
          { id: 'record-attendance', label: 'Registrar Assistència', href: '/assistatut/attendance', icon: 'users' },
          { id: 'view-schedule', label: 'Veure Horari', href: '/assistatut/schedules', icon: 'calendar' },
          { id: 'send-notification', label: 'Enviar Notificació', href: '/communication', icon: 'message-square' }
        );
        break;
      
      case 'student':
        actions.push(
          { id: 'view-grades', label: 'Veure Notes', href: '/grades', icon: 'award' },
          { id: 'view-schedule', label: 'Veure Horari', href: '/schedule', icon: 'calendar' },
          { id: 'view-notifications', label: 'Veure Notificacions', href: '/notifications', icon: 'bell' }
        );
        break;
      
      default:
        actions.push(
          { id: 'view-dashboard', label: 'Veure Dashboard', href: '/', icon: 'home' },
          { id: 'view-notifications', label: 'Veure Notificacions', href: '/notifications', icon: 'bell' }
        );
    }

    res.json({
      success: true,
      data: actions,
      message: 'Accions ràpides obtingudes correctament'
    });
  } catch (error) {
    logger.error('❌ Error obtenint accions ràpides:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/dashboard/recent-activity - Obtener actividad reciente
router.get('/recent-activity', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const instituteId = user.instituteId;
    const limit = parseInt(req.query.limit as string) || 10;

    // Obtener actividad reciente (ejemplo simplificado)
    const recentActivity = [
      {
        id: '1',
        type: 'evaluation_created',
        title: 'Nova evaluació creada',
        description: 'S\'ha creat una nova evaluació per a la competència CT_CC',
        timestamp: new Date().toISOString(),
        user: 'Professor García'
      },
      {
        id: '2',
        type: 'guard_assigned',
        title: 'Guàrdia assignada',
        description: 'S\'ha assignat una guàrdia per a l\'activitat d\'excursió',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: 'Sistema Automàtic'
      },
      {
        id: '3',
        type: 'attendance_recorded',
        title: 'Assistència registrada',
        description: 'S\'ha registrat l\'assistència de la classe 2n ESO A',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user: 'Professor López'
      }
    ];

    res.json({
      success: true,
      data: recentActivity.slice(0, limit),
      message: 'Activitat recent obtinguda correctament'
    });
  } catch (error) {
    logger.error('❌ Error obtenint activitat recent:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

export default router; 