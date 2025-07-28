import { Router } from 'express';
import { z } from 'zod';
import { CourseService } from '../services/course.service';
import { logger } from '../utils/logger';

const router = Router();
const courseService = new CourseService();

// ===== VALIDACIÓN SCHEMAS =====

const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  code: z.string().min(1, 'Course code is required'),
  description: z.string().optional(),
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.string().min(1, 'Semester is required'),
  grade: z.string().min(1, 'Grade is required'),
  department: z.string().min(1, 'Department is required'),
  teacherId: z.number().positive('Teacher ID must be positive'),
  credits: z.number().positive('Credits must be positive'),
  maxStudents: z.number().positive('Max students must be positive'),
  isActive: z.boolean().default(true),
});

const updateCourseSchema = createCourseSchema.partial();

const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().min(1, 'Subject code is required'),
  description: z.string().optional(),
  academicYear: z.string().min(1, 'Academic year is required'),
  grade: z.string().min(1, 'Grade is required'),
  department: z.string().min(1, 'Department is required'),
  teacherId: z.number().positive('Teacher ID must be positive'),
  credits: z.number().positive('Credits must be positive'),
  isActive: z.boolean().default(true),
});

const createScheduleSchema = z.object({
  courseId: z.number().positive('Course ID must be positive'),
  subjectId: z.number().positive('Subject ID must be positive'),
  teacherId: z.number().positive('Teacher ID must be positive'),
  dayOfWeek: z.string().min(1, 'Day of week is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  room: z.string().min(1, 'Room is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.string().min(1, 'Semester is required'),
  isActive: z.boolean().default(true),
});

const createGradeSchema = z.object({
  studentId: z.number().positive('Student ID must be positive'),
  courseId: z.number().positive('Course ID must be positive'),
  subjectId: z.number().positive('Subject ID must be positive'),
  evaluationType: z.string().min(1, 'Evaluation type is required'),
  score: z.number().min(0).max(100, 'Score must be between 0 and 100'),
  maxScore: z.number().positive('Max score must be positive'),
  weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.string().min(1, 'Semester is required'),
  comments: z.string().optional(),
});

const createEnrollmentSchema = z.object({
  studentId: z.number().positive('Student ID must be positive'),
  courseId: z.number().positive('Course ID must be positive'),
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.string().min(1, 'Semester is required'),
  enrollmentDate: z.string().optional(),
  status: z.enum(['active', 'inactive', 'completed', 'dropped']).default('active'),
  grade: z.string().optional(),
  finalScore: z.number().min(0).max(100).optional(),
});

const createCourseResourceSchema = z.object({
  courseId: z.number().positive('Course ID must be positive'),
  name: z.string().min(1, 'Resource name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Resource type is required'),
  url: z.string().url('Valid URL is required'),
  category: z.string().min(1, 'Category is required'),
  isPublic: z.boolean().default(false),
});

const createAssignmentSchema = z.object({
  courseId: z.number().positive('Course ID must be positive'),
  title: z.string().min(1, 'Assignment title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Assignment type is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  maxScore: z.number().positive('Max score must be positive'),
  weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
  isPublished: z.boolean().default(false),
  isGraded: z.boolean().default(false),
});

const createSubmissionSchema = z.object({
  studentId: z.number().positive('Student ID must be positive'),
  assignmentId: z.number().positive('Assignment ID must be positive'),
  content: z.string().min(1, 'Submission content is required'),
  attachments: z.array(z.string()).optional(),
  submittedAt: z.string().optional(),
  status: z.enum(['submitted', 'late', 'graded']).default('submitted'),
  score: z.number().min(0).optional(),
  feedback: z.string().optional(),
});

// ===== RUTAS DE CURSOS =====

/**
 * Crear un nuevo curso
 */
router.post('/courses', async (req, res) => {
  try {
    const validatedData = createCourseSchema.parse(req.body);
    const course = await courseService.createCourse(validatedData);
    logger.info(`Course created: ${course.id} - ${course.name}`);
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    });
  } catch (error) {
    logger.error('Error creating course:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create course'
    });
  }
});

/**
 * Obtener todos los cursos con filtros
 */
router.get('/courses', async (req, res) => {
  try {
    const filters = {
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
      grade: req.query.grade as string,
      department: req.query.department as string,
      teacherId: req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await courseService.getCourses(filters);
    res.json({
      success: true,
      data: result.courses,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    logger.error('Error getting courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get courses'
    });
  }
});

/**
 * Obtener curso por ID
 */
router.get('/courses/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const course = await courseService.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('Error getting course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course'
    });
  }
});

/**
 * Obtener curso por código
 */
router.get('/courses/code/:code', async (req, res) => {
  try {
    const course = await courseService.getCourseByCode(req.params.code);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('Error getting course by code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course'
    });
  }
});

/**
 * Actualizar curso
 */
router.put('/courses/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const validatedData = updateCourseSchema.parse(req.body);
    const course = await courseService.updateCourse(courseId, validatedData);
    
    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully'
    });
  } catch (error) {
    logger.error('Error updating course:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update course'
    });
  }
});

/**
 * Eliminar curso
 */
router.delete('/courses/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    await courseService.deleteCourse(courseId);
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course'
    });
  }
});

// ===== RUTAS DE MATERIAS =====

/**
 * Crear nueva materia
 */
router.post('/subjects', async (req, res) => {
  try {
    const validatedData = createSubjectSchema.parse(req.body);
    const subject = await courseService.createSubject(validatedData);
    logger.info(`Subject created: ${subject.id} - ${subject.name}`);
    res.status(201).json({
      success: true,
      data: subject,
      message: 'Subject created successfully'
    });
  } catch (error) {
    logger.error('Error creating subject:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create subject'
    });
  }
});

/**
 * Obtener materias con filtros
 */
router.get('/subjects', async (req, res) => {
  try {
    const filters = {
      academicYear: req.query.academicYear as string,
      grade: req.query.grade as string,
      department: req.query.department as string,
      teacherId: req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await courseService.getSubjects(filters);
    res.json({
      success: true,
      data: result.subjects,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    logger.error('Error getting subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subjects'
    });
  }
});

// ===== RUTAS DE HORARIOS =====

/**
 * Crear nuevo horario
 */
router.post('/schedules', async (req, res) => {
  try {
    const validatedData = createScheduleSchema.parse(req.body);
    const schedule = await courseService.createSchedule(validatedData);
    logger.info(`Schedule created: ${schedule.id}`);
    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Schedule created successfully'
    });
  } catch (error) {
    logger.error('Error creating schedule:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create schedule'
    });
  }
});

/**
 * Obtener horarios con filtros
 */
router.get('/schedules', async (req, res) => {
  try {
    const filters = {
      courseId: req.query.courseId ? parseInt(req.query.courseId as string) : undefined,
      subjectId: req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined,
      teacherId: req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined,
      dayOfWeek: req.query.dayOfWeek as string,
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
    };

    const schedules = await courseService.getSchedules(filters);
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    logger.error('Error getting schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedules'
    });
  }
});

// ===== RUTAS DE CALIFICACIONES =====

/**
 * Crear nueva calificación
 */
router.post('/grades', async (req, res) => {
  try {
    const validatedData = createGradeSchema.parse(req.body);
    const grade = await courseService.createGrade(validatedData);
    logger.info(`Grade created: ${grade.id}`);
    res.status(201).json({
      success: true,
      data: grade,
      message: 'Grade created successfully'
    });
  } catch (error) {
    logger.error('Error creating grade:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create grade'
    });
  }
});

/**
 * Obtener calificaciones de un estudiante
 */
router.get('/students/:studentId/grades', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }

    const filters = {
      courseId: req.query.courseId ? parseInt(req.query.courseId as string) : undefined,
      subjectId: req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined,
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
      evaluationType: req.query.evaluationType as string,
    };

    const grades = await courseService.getStudentGrades(studentId, filters);
    res.json({
      success: true,
      data: grades
    });
  } catch (error) {
    logger.error('Error getting student grades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student grades'
    });
  }
});

/**
 * Obtener calificaciones de un curso
 */
router.get('/courses/:courseId/grades', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const filters = {
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
      evaluationType: req.query.evaluationType as string,
    };

    const grades = await courseService.getCourseGrades(courseId, filters);
    res.json({
      success: true,
      data: grades
    });
  } catch (error) {
    logger.error('Error getting course grades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course grades'
    });
  }
});

// ===== RUTAS DE INSCRIPCIONES =====

/**
 * Inscribir estudiante en curso
 */
router.post('/enrollments', async (req, res) => {
  try {
    const validatedData = createEnrollmentSchema.parse(req.body);
    const enrollment = await courseService.enrollStudent(validatedData);
    logger.info(`Student enrolled: ${enrollment.studentId} in course ${enrollment.courseId}`);
    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Student enrolled successfully'
    });
  } catch (error) {
    logger.error('Error enrolling student:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to enroll student'
    });
  }
});

/**
 * Obtener inscripciones de un estudiante
 */
router.get('/students/:studentId/enrollments', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }

    const filters = {
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
      status: req.query.status as string,
    };

    const enrollments = await courseService.getStudentEnrollments(studentId, filters);
    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    logger.error('Error getting student enrollments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student enrollments'
    });
  }
});

/**
 * Obtener inscripciones de un curso
 */
router.get('/courses/:courseId/enrollments', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const filters = {
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string,
      status: req.query.status as string,
    };

    const enrollments = await courseService.getCourseEnrollments(courseId, filters);
    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    logger.error('Error getting course enrollments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course enrollments'
    });
  }
});

// ===== RUTAS DE RECURSOS =====

/**
 * Crear recurso de curso
 */
router.post('/courses/:courseId/resources', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const validatedData = createCourseResourceSchema.parse({
      ...req.body,
      courseId
    });
    const resource = await courseService.createCourseResource(validatedData);
    logger.info(`Course resource created: ${resource.id}`);
    res.status(201).json({
      success: true,
      data: resource,
      message: 'Course resource created successfully'
    });
  } catch (error) {
    logger.error('Error creating course resource:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create course resource'
    });
  }
});

/**
 * Obtener recursos de un curso
 */
router.get('/courses/:courseId/resources', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const filters = {
      category: req.query.category as string,
      isPublic: req.query.isPublic ? req.query.isPublic === 'true' : undefined,
    };

    const resources = await courseService.getCourseResources(courseId, filters);
    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error getting course resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course resources'
    });
  }
});

// ===== RUTAS DE TAREAS =====

/**
 * Crear tarea
 */
router.post('/courses/:courseId/assignments', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const validatedData = createAssignmentSchema.parse({
      ...req.body,
      courseId
    });
    const assignment = await courseService.createAssignment(validatedData);
    logger.info(`Assignment created: ${assignment.id}`);
    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Assignment created successfully'
    });
  } catch (error) {
    logger.error('Error creating assignment:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create assignment'
    });
  }
});

/**
 * Obtener tareas de un curso
 */
router.get('/courses/:courseId/assignments', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const filters = {
      type: req.query.type as string,
      isPublished: req.query.isPublished ? req.query.isPublished === 'true' : undefined,
      isGraded: req.query.isGraded ? req.query.isGraded === 'true' : undefined,
    };

    const assignments = await courseService.getCourseAssignments(courseId, filters);
    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    logger.error('Error getting course assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course assignments'
    });
  }
});

// ===== RUTAS DE ENTREGAS =====

/**
 * Crear entrega
 */
router.post('/submissions', async (req, res) => {
  try {
    const validatedData = createSubmissionSchema.parse(req.body);
    const submission = await courseService.createSubmission(validatedData);
    logger.info(`Submission created: ${submission.id}`);
    res.status(201).json({
      success: true,
      data: submission,
      message: 'Submission created successfully'
    });
  } catch (error) {
    logger.error('Error creating submission:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create submission'
    });
  }
});

/**
 * Obtener entregas de un estudiante
 */
router.get('/students/:studentId/submissions', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }

    const filters = {
      assignmentId: req.query.assignmentId ? parseInt(req.query.assignmentId as string) : undefined,
      status: req.query.status as string,
    };

    const submissions = await courseService.getStudentSubmissions(studentId, filters);
    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    logger.error('Error getting student submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student submissions'
    });
  }
});

/**
 * Obtener entregas de una tarea
 */
router.get('/assignments/:assignmentId/submissions', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    if (isNaN(assignmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignment ID'
      });
    }

    const filters = {
      status: req.query.status as string,
      isLate: req.query.isLate ? req.query.isLate === 'true' : undefined,
    };

    const submissions = await courseService.getAssignmentSubmissions(assignmentId, filters);
    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    logger.error('Error getting assignment submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assignment submissions'
    });
  }
});

// ===== RUTAS DE ESTADÍSTICAS =====

/**
 * Obtener estadísticas de un curso
 */
router.get('/courses/:courseId/stats', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const academicYear = req.query.academicYear as string;
    if (!academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Academic year is required'
      });
    }

    const stats = await courseService.getCourseStats(courseId, academicYear);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting course stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get course stats'
    });
  }
});

/**
 * Obtener estadísticas de un estudiante en un curso
 */
router.get('/students/:studentId/courses/:courseId/stats', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const courseId = parseInt(req.params.courseId);
    
    if (isNaN(studentId) || isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID or course ID'
      });
    }

    const academicYear = req.query.academicYear as string;
    if (!academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Academic year is required'
      });
    }

    const stats = await courseService.getStudentCourseStats(studentId, courseId, academicYear);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting student course stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student course stats'
    });
  }
});

// ===== HEALTH CHECK =====

/**
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Course Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router; 