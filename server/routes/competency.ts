import { Router } from 'express';
import { z } from 'zod';
import { competencyService } from '../services/competency-service.js';
import { isAuthenticated, requireRole } from '../middleware/auth.js';

const router = Router();

// Schemas de validación
const competencySchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  abbreviation: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().min(1, 'La descripción es requerida'),
  type: z.enum(['CT_CC', 'CT_CD', 'CT_CE', 'CT_CPSAA', 'CCL', 'CP', 'STEM', 'CCEC'])
});

const criteriaSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().min(1, 'La descripción es requerida')
});

const evaluationSchema = z.object({
  groupName: z.string().min(1, 'El nombre del grupo es requerido'),
  competencyType: z.string().min(1, 'El tipo de competencia es requerido'),
  competencyCode: z.string().min(1, 'El código de competencia es requerido'),
  competencyDescription: z.string().min(1, 'La descripción de competencia es requerida'),
  studentCount: z.number().min(1, 'El número de estudiantes debe ser mayor a 0'),
  evaluationData: z.object({
    students: z.array(z.object({
      id: z.number(),
      name: z.string(),
      group_name: z.string(),
      email: z.string().email(),
      gender: z.string()
    })),
    criteria: z.array(z.object({
      id: z.number(),
      competencyId: z.number(),
      code: z.string(),
      description: z.string()
    })),
    grades: z.array(z.object({
      studentId: z.number(),
      criteriaId: z.number(),
      grade: z.enum(['NA', 'AS', 'AN', 'AE'])
    }))
  }),
  googleSheetId: z.string().optional()
});

// ============================================================================
// RUTAS DE COMPETENCIAS
// ============================================================================

// GET /api/competencies - Obtener competencias
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { academicYearId } = req.query;

    const competencies = await competencyService.getCompetencies(
      user.instituteId,
      academicYearId as string
    );

    res.json({
      success: true,
      data: competencies,
      message: 'Competencias obtenidas correctamente'
    });
  } catch (error) {
    console.error('Error obteniendo competencias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/competencies - Crear competencia
router.post('/', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const data = competencySchema.parse(req.body);

    const competency = await competencyService.createCompetency({
      ...data,
      instituteId: user.instituteId,
      academicYearId: user.academicYearId || req.body.academicYearId
    });

    res.status(201).json({
      success: true,
      data: competency,
      message: 'Competencia creada correctamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    console.error('Error creando competencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/competencies/:id - Actualizar competencia
router.put('/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = competencySchema.partial().parse(req.body);

    const competency = await competencyService.updateCompetency(id, data);

    res.json({
      success: true,
      data: competency,
      message: 'Competencia actualizada correctamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    console.error('Error actualizando competencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/competencies/:id - Eliminar competencia
router.delete('/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await competencyService.deleteCompetency(id);

    res.json({
      success: true,
      message: 'Competencia eliminada correctamente'
    });
  } catch (error) {
    console.error('Error eliminando competencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE CRITERIOS
// ============================================================================

// GET /api/competencies/:competencyId/criteria - Obtener criterios
router.get('/:competencyId/criteria', isAuthenticated, async (req, res) => {
  try {
    const { competencyId } = req.params;

    const criteria = await competencyService.getCriteria(competencyId);

    res.json({
      success: true,
      data: criteria,
      message: 'Criterios obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error obteniendo criterios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/competencies/:competencyId/criteria - Crear criterio
router.post('/:competencyId/criteria', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { competencyId } = req.params;
    const data = criteriaSchema.parse(req.body);

    const criterion = await competencyService.createCriteria({
      ...data,
      competencyId
    });

    res.status(201).json({
      success: true,
      data: criterion,
      message: 'Criterio creado correctamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    console.error('Error creando criterio:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/criteria/:id - Actualizar criterio
router.put('/criteria/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = criteriaSchema.partial().parse(req.body);

    const criterion = await competencyService.updateCriteria(id, data);

    res.json({
      success: true,
      data: criterion,
      message: 'Criterio actualizado correctamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    console.error('Error actualizando criterio:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/criteria/:id - Eliminar criterio
router.delete('/criteria/:id', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await competencyService.deleteCriteria(id);

    res.json({
      success: true,
      message: 'Criterio eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando criterio:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE EVALUACIONES
// ============================================================================

// POST /api/competencies/evaluations - Guardar evaluación
router.post('/evaluations', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const data = evaluationSchema.parse(req.body);

    const evaluation = await competencyService.saveEvaluation({
      ...data,
      teacherId: user.id
    });

    res.status(201).json({
      success: true,
      data: evaluation,
      message: 'Evaluación guardada correctamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    console.error('Error guardando evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/competencies/evaluations - Obtener evaluaciones
router.get('/evaluations', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const { groupName, competencyType, startDate, endDate } = req.query;

    const filters: any = {};
    if (groupName) filters.groupName = groupName as string;
    if (competencyType) filters.competencyType = competencyType as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const evaluations = await competencyService.getEvaluations(user.id, filters);

    res.json({
      success: true,
      data: evaluations,
      message: 'Evaluaciones obtenidas correctamente'
    });
  } catch (error) {
    console.error('Error obteniendo evaluaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/competencies/evaluations/stats - Obtener estadísticas
router.get('/evaluations/stats', isAuthenticated, requireRole(['teacher', 'admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const { startDate, endDate } = req.query;

    const period = startDate && endDate ? {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    } : undefined;

    const stats = await competencyService.getEvaluationStats(user.id, period);

    res.json({
      success: true,
      data: stats,
      message: 'Estadísticas obtenidas correctamente'
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE ADMINISTRACIÓN
// ============================================================================

// POST /api/competencies/initialize - Inicializar competencias por defecto
router.post('/initialize', isAuthenticated, requireRole(['admin', 'institute_admin']), async (req, res) => {
  try {
    const user = req.user as any;
    const { academicYearId } = req.body;

    await competencyService.initializeDefaultCompetencies(
      user.instituteId,
      academicYearId || user.academicYearId
    );

    res.json({
      success: true,
      message: 'Competencias inicializadas correctamente'
    });
  } catch (error) {
    console.error('Error inicializando competencias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router; 