import { Router } from 'express';
import { z } from 'zod';
import { attendanceService } from '../services/attendance-service.js';
import { isAuthenticated, requireRole } from '../middleware/auth.js';
import { publishEvent } from '../src/services/events';
import { EventTopics } from '../../shared/events';

const router = Router();

// Schemas de validación
const attendanceRecordSchema = z.object({
  classId: z.string().min(1, 'ID de clase requerido'),
  studentId: z.string().min(1, 'ID de estudiante requerido'),
  date: z.string().min(1, 'Fecha requerida'),
  status: z.enum(['present', 'absent', 'late', 'justified']),
  notes: z.string().optional()
});

const bulkAttendanceSchema = z.object({
  classId: z.string().min(1, 'ID de clase requerido'),
  date: z.string().min(1, 'Fecha requerida'),
  records: z.array(z.object({
    studentId: z.string().min(1, 'ID de estudiante requerido'),
    status: z.enum(['present', 'absent', 'late', 'justified']),
    notes: z.string().optional()
  }))
});

const attendanceFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  classId: z.string().optional(),
  status: z.string().optional()
});

// ============================================================================
// RUTAS DE REGISTRO DE ASISTENCIA
// ============================================================================

// POST /api/attendance/record - Registrar asistencia individual
router.post('/record', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const data = attendanceRecordSchema.parse(req.body);
    const user = req.user as any;

    const record = await attendanceService.recordAttendance(data);

    // Publicar evento de asistencia individual
    await publishEvent(
      EventTopics.attendance,
      'attendance.marked',
      {
        classId: data.classId,
        studentId: data.studentId,
        date: data.date,
        status: data.status,
      },
      {
        actor: { userId: (user?.id || '').toString(), role: user?.role },
      }
    );

    res.status(201).json({
      success: true,
      data: record,
      message: 'Assistència registrada correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error registrant assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// POST /api/attendance/bulk - Registrar asistencia masiva
router.post('/bulk', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const data = bulkAttendanceSchema.parse(req.body);
    const user = req.user as any;

    // Verificar si ya existe asistencia para esta clase y fecha
    const existingAttendance = await attendanceService.checkExistingAttendance(data.classId, data.date);
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Ja existeix assistència registrada per aquesta classe i data'
      });
    }

    const records = await attendanceService.recordBulkAttendance(
      data.classId,
      data.date,
      data.records
    );

    // Publicar evento de asistencia masiva
    await publishEvent(
      EventTopics.attendance,
      'attendance.bulk_marked',
      {
        classId: data.classId,
        date: data.date,
        count: records.length,
      },
      {
        actor: { userId: (user?.id || '').toString(), role: user?.role },
      }
    );

    res.status(201).json({
      success: true,
      data: records,
      message: `${records.length} registres d'assistència creats correctament`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error registrant assistència massiva:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE CONSULTA DE ASISTENCIA
// ============================================================================

// GET /api/attendance/student/:studentId - Obtener asistencia de un estudiante
router.get('/student/:studentId', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin', 'parent']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user as any;
    const filters = attendanceFiltersSchema.parse(req.query);

    // Verificar permisos: solo puede ver su propio hijo si es padre
    if (user.role === 'parent' && user.id !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'No tens permisos per veure aquesta informació'
      });
    }

    const attendance = await attendanceService.getStudentAttendance(studentId, filters);

    res.json({
      success: true,
      data: attendance,
      message: 'Assistència obtinguda correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Paràmetres invàlids',
        details: error.errors
      });
    }

    console.error('Error obtenint assistència d\'estudiant:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/attendance/class/:classId/:date - Obtener asistencia de una clase
router.get('/class/:classId/:date', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId, date } = req.params;
    const user = req.user as any;

    const attendance = await attendanceService.getClassAttendance(classId, date);

    res.json({
      success: true,
      data: attendance,
      message: 'Assistència de classe obtinguda correctament'
    });
  } catch (error) {
    console.error('Error obtenint assistència de classe:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/attendance/stats/:classId - Obtener estadísticas de asistencia
router.get('/stats/:classId', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;
    const user = req.user as any;

    const period = startDate && endDate ? {
      startDate: startDate as string,
      endDate: endDate as string
    } : undefined;

    const stats = await attendanceService.getAttendanceStats(classId, period);

    res.json({
      success: true,
      data: stats,
      message: 'Estadístiques obtingudes correctament'
    });
  } catch (error) {
    console.error('Error obtenint estadístiques d\'assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE GESTIÓN DE ASISTENCIA
// ============================================================================

// PUT /api/attendance/:id - Actualizar registro de asistencia
router.put('/:id', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = attendanceRecordSchema.partial().parse(req.body);
    const user = req.user as any;

    const record = await attendanceService.updateAttendance(id, data);

    res.json({
      success: true,
      data: record,
      message: 'Assistència actualitzada correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dades invàlides',
        details: error.errors
      });
    }

    console.error('Error actualitzant assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// DELETE /api/attendance/:id - Eliminar registro de asistencia
router.delete('/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    await attendanceService.deleteAttendance(id);

    res.json({
      success: true,
      message: 'Assistència eliminada correctament'
    });
  } catch (error) {
    console.error('Error eliminant assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE INFORMACIÓN ADICIONAL
// ============================================================================

// GET /api/attendance/students/:classId - Obtener estudiantes de una clase
router.get('/students/:classId', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId } = req.params;
    const user = req.user as any;

    const students = await attendanceService.getClassStudents(classId);

    res.json({
      success: true,
      data: students,
      message: 'Estudiants obtinguts correctament'
    });
  } catch (error) {
    console.error('Error obtenint estudiants de classe:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// GET /api/attendance/report - Obtener reporte de asistencia
router.get('/report', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const filters = attendanceFiltersSchema.parse(req.query);

    const report = await attendanceService.getAttendanceReport(user.instituteId, filters);

    res.json({
      success: true,
      data: report,
      message: 'Report d\'assistència generat correctament'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Paràmetres invàlids',
        details: error.errors
      });
    }

    console.error('Error generant report d\'assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE VERIFICACIÓN
// ============================================================================

// GET /api/attendance/check/:classId/:date - Verificar si existe asistencia
router.get('/check/:classId/:date', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const { classId, date } = req.params;
    const user = req.user as any;

    const exists = await attendanceService.checkExistingAttendance(classId, date);

    res.json({
      success: true,
      data: { exists },
      message: 'Verificació completada'
    });
  } catch (error) {
    console.error('Error verificant assistència:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

export default router; 