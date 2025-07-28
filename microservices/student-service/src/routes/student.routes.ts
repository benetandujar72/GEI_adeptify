import { Router } from 'express';
import { z } from 'zod';
import { studentService } from '../services/student.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const createStudentSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  }).optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  academicYear: z.string().optional(),
  notes: z.string().optional(),
  avatar: z.string().optional(),
});

const updateStudentSchema = createStudentSchema.partial();

const createAcademicRecordSchema = z.object({
  studentId: z.number(),
  subject: z.string().min(1).max(100),
  grade: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).optional(),
  semester: z.string().optional(),
  academicYear: z.string().min(1).max(20),
  evaluationType: z.string().optional(),
  evaluationDate: z.string().optional(),
  teacherId: z.number().optional(),
  comments: z.string().optional(),
  isPassed: z.boolean().optional(),
});

const createAttendanceSchema = z.object({
  studentId: z.number(),
  date: z.string(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  subject: z.string().optional(),
  period: z.string().optional(),
  teacherId: z.number().optional(),
  reason: z.string().optional(),
  isExcused: z.boolean().optional(),
});

const createCompetencySchema = z.object({
  studentId: z.number(),
  competencyName: z.string().min(1).max(200),
  competencyCode: z.string().optional(),
  level: z.enum(['basic', 'intermediate', 'advanced']).optional(),
  score: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).optional(),
  evaluationDate: z.string().optional(),
  evaluatorId: z.number().optional(),
  comments: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  isAchieved: z.boolean().optional(),
  academicYear: z.string().min(1).max(20),
});

const createBehaviorSchema = z.object({
  studentId: z.number(),
  incidentDate: z.string(),
  incidentType: z.string().min(1).max(100),
  description: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  actionTaken: z.string().optional(),
  reportedBy: z.number().optional(),
  witnesses: z.array(z.string()).optional(),
  location: z.string().optional(),
  isResolved: z.boolean().optional(),
});

const createNoteSchema = z.object({
  studentId: z.number(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(['academic', 'behavioral', 'health', 'other']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  authorId: z.number(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const createDocumentSchema = z.object({
  studentId: z.number(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(500),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  category: z.enum(['academic', 'medical', 'legal', 'other']).optional(),
  uploadedBy: z.number(),
  isPublic: z.boolean().optional(),
});

// ===== RUTAS DE ESTUDIANTES =====

/**
 * POST /students
 * Crear un nuevo estudiante
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = createStudentSchema.parse(req.body);
    const student = await studentService.createStudent(validatedData);
    
    logger.info(`Student created: ${student.id}`);
    res.status(201).json({
      success: true,
      data: student,
      message: 'Estudiante creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating student:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students
 * Listar estudiantes con filtros
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      grade: req.query.grade as string,
      section: req.query.section as string,
      academicYear: req.query.academicYear as string,
      status: req.query.status as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await studentService.getStudents(filters);
    
    res.json({
      success: true,
      data: result.students,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    logger.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id
 * Obtener estudiante por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    logger.error('Error getting student by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/uuid/:uuid
 * Obtener estudiante por UUID
 */
router.get('/uuid/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const student = await studentService.getStudentByUuid(uuid);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    logger.error('Error getting student by UUID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /students/:id
 * Actualizar estudiante
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = updateStudentSchema.parse(req.body);
    const student = await studentService.updateStudent(id, validatedData);
    
    logger.info(`Student updated: ${id}`);
    res.json({
      success: true,
      data: student,
      message: 'Estudiante actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating student:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * DELETE /students/:id
 * Eliminar estudiante (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    await studentService.deleteStudent(id);
    
    logger.info(`Student deleted: ${id}`);
    res.json({
      success: true,
      message: 'Estudiante eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE REGISTROS ACADÉMICOS =====

/**
 * POST /students/:id/academic-records
 * Crear registro académico
 */
router.post('/:id/academic-records', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = createAcademicRecordSchema.parse({
      ...req.body,
      studentId
    });

    const record = await studentService.createAcademicRecord(validatedData);
    
    res.status(201).json({
      success: true,
      data: record,
      message: 'Registro académico creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating academic record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/academic-records
 * Obtener registros académicos
 */
router.get('/:id/academic-records', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const filters = {
      subject: req.query.subject as string,
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
    };

    const records = await studentService.getAcademicRecords(studentId, filters);
    
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    logger.error('Error getting academic records:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE ASISTENCIA =====

/**
 * POST /students/:id/attendance
 * Registrar asistencia
 */
router.post('/:id/attendance', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = createAttendanceSchema.parse({
      ...req.body,
      studentId
    });

    const attendance = await studentService.createAttendance(validatedData);
    
    res.status(201).json({
      success: true,
      data: attendance,
      message: 'Asistencia registrada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating attendance:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/attendance
 * Obtener asistencia
 */
router.get('/:id/attendance', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      status: req.query.status as string,
      subject: req.query.subject as string,
    };

    const attendance = await studentService.getAttendance(studentId, filters);
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    logger.error('Error getting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/attendance/stats
 * Obtener estadísticas de asistencia
 */
router.get('/:id/attendance/stats', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const academicYear = req.query.academicYear as string;
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Año académico requerido'
      });
    }

    const stats = await studentService.getAttendanceStats(studentId, academicYear);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting attendance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE COMPETENCIAS =====

/**
 * POST /students/:id/competencies
 * Crear competencia
 */
router.post('/:id/competencies', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = createCompetencySchema.parse({
      ...req.body,
      studentId
    });

    const competency = await studentService.createCompetency(validatedData);
    
    res.status(201).json({
      success: true,
      data: competency,
      message: 'Competencia creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating competency:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/competencies
 * Obtener competencias
 */
router.get('/:id/competencies', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const academicYear = req.query.academicYear as string;
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Año académico requerido'
      });
    }

    const competencies = await studentService.getCompetencies(studentId, academicYear);
    
    res.json({
      success: true,
      data: competencies
    });
  } catch (error) {
    logger.error('Error getting competencies:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE COMPORTAMIENTO =====

/**
 * POST /students/:id/behavior
 * Crear registro de comportamiento
 */
router.post('/:id/behavior', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = createBehaviorSchema.parse({
      ...req.body,
      studentId
    });

    const behavior = await studentService.createBehavior(validatedData);
    
    res.status(201).json({
      success: true,
      data: behavior,
      message: 'Registro de comportamiento creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating behavior record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/behavior
 * Obtener registros de comportamiento
 */
router.get('/:id/behavior', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      severity: req.query.severity as string,
      isResolved: req.query.isResolved === 'true' ? true : req.query.isResolved === 'false' ? false : undefined,
    };

    const behavior = await studentService.getBehavior(studentId, filters);
    
    res.json({
      success: true,
      data: behavior
    });
  } catch (error) {
    logger.error('Error getting behavior records:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE NOTAS =====

/**
 * POST /students/:id/notes
 * Crear nota
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = createNoteSchema.parse({
      ...req.body,
      studentId
    });

    const note = await studentService.createNote(validatedData);
    
    res.status(201).json({
      success: true,
      data: note,
      message: 'Nota creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating note:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/notes
 * Obtener notas
 */
router.get('/:id/notes', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const filters = {
      category: req.query.category as string,
      priority: req.query.priority as string,
      isPrivate: req.query.isPrivate === 'true' ? true : req.query.isPrivate === 'false' ? false : undefined,
    };

    const notes = await studentService.getNotes(studentId, filters);
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    logger.error('Error getting notes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE DOCUMENTOS =====

/**
 * POST /students/:id/documents
 * Crear documento
 */
router.post('/:id/documents', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const validatedData = createDocumentSchema.parse({
      ...req.body,
      studentId
    });

    const document = await studentService.createDocument(validatedData);
    
    res.status(201).json({
      success: true,
      data: document,
      message: 'Documento creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /students/:id/documents
 * Obtener documentos
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    const filters = {
      category: req.query.category as string,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
    };

    const documents = await studentService.getDocuments(studentId, filters);
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    logger.error('Error getting documents:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS DE ESTADÍSTICAS =====

/**
 * GET /students/:id/stats
 * Obtener estadísticas del estudiante
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const academicYear = req.query.academicYear as string;
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Año académico requerido'
      });
    }

    const stats = await studentService.getStudentStats(studentId, academicYear);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting student stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router; 