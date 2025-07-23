import { Router } from 'express';
import { z } from 'zod';
import { adeptifyService } from '../services/adeptify-service.js';

const router = Router();

// Schemas de validación
const competencySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criteria: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    weight: z.number().min(0).max(100)
  }))
});

const evaluationSchema = z.object({
  studentId: z.number(),
  competencyId: z.number(),
  score: z.number().min(0).max(10),
  observations: z.string().optional(),
  evaluatorId: z.number()
});

const courseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instituteId: z.number(),
  academicYearId: z.number()
});

const learningActivitySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subjectId: z.number(),
  academicYearId: z.number(),
  competencies: z.array(z.number()),
  duration: z.number().min(1),
  materials: z.array(z.string()).optional()
});

// Rutas de competencias
router.get('/competencies', async (req, res) => {
  try {
    const competencies = await adeptifyService.getCompetencies();
    res.json({
      message: 'Lista de competencias',
      data: competencies
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener competencias' });
  }
});

router.post('/competencies', async (req, res) => {
  try {
    const validatedData = competencySchema.parse(req.body);
    const competency = await adeptifyService.createCompetency(validatedData);
    res.status(201).json({
      message: 'Competencia creada exitosamente',
      data: competency
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error al crear competencia' });
  }
});

// Rutas de evaluaciones
router.get('/evaluations', async (req, res) => {
  try {
    const { studentId, competencyId, academicYearId } = req.query;
    const filters = {
      studentId: studentId ? parseInt(studentId as string) : undefined,
      competencyId: competencyId ? parseInt(competencyId as string) : undefined,
      academicYearId: academicYearId ? parseInt(academicYearId as string) : undefined
    };
    const evaluations = await adeptifyService.getEvaluations(filters);
    res.json({
      message: 'Lista de evaluaciones',
      data: evaluations
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener evaluaciones' });
  }
});

router.post('/evaluations', async (req, res) => {
  try {
    const validatedData = evaluationSchema.parse(req.body);
    const evaluation = await adeptifyService.createEvaluation(validatedData);
    res.status(201).json({
      message: 'Evaluación creada exitosamente',
      data: evaluation
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error al crear evaluación' });
  }
});

// Rutas de cursos
router.get('/courses', async (req, res) => {
  try {
    const { instituteId, academicYearId } = req.query;
    // TODO: Implementar lógica de base de datos con filtros
    res.json({
      message: 'Lista de cursos',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const validatedData = courseSchema.parse(req.body);
    // TODO: Implementar lógica de base de datos
    res.status(201).json({
      message: 'Curso creado exitosamente',
      data: validatedData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

// Rutas de actividades de aprendizaje
router.get('/learning-activities', async (req, res) => {
  try {
    const { subjectId, academicYearId } = req.query;
    // TODO: Implementar lógica de base de datos con filtros
    res.json({
      message: 'Lista de actividades de aprendizaje',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener actividades de aprendizaje' });
  }
});

router.post('/learning-activities', async (req, res) => {
  try {
    const validatedData = learningActivitySchema.parse(req.body);
    // TODO: Implementar lógica de base de datos
    res.status(201).json({
      message: 'Actividad de aprendizaje creada exitosamente',
      data: validatedData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error al crear actividad de aprendizaje' });
  }
});

// Rutas de estadísticas y análisis
router.get('/analytics/competency-progress', async (req, res) => {
  try {
    const { studentId, academicYearId } = req.query;
    // TODO: Implementar lógica de análisis de progreso
    res.json({
      message: 'Análisis de progreso de competencias',
      data: {
        studentId,
        academicYearId,
        progress: [],
        averageScore: 0,
        completedCompetencies: 0,
        totalCompetencies: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener análisis de progreso' });
  }
});

router.get('/analytics/institute-performance', async (req, res) => {
  try {
    const { instituteId, academicYearId } = req.query;
    // TODO: Implementar lógica de análisis de rendimiento del instituto
    res.json({
      message: 'Análisis de rendimiento del instituto',
      data: {
        instituteId,
        academicYearId,
        averageScores: {},
        competencyDistribution: {},
        topPerformers: [],
        improvementAreas: []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener análisis de rendimiento' });
  }
});

export default router; 