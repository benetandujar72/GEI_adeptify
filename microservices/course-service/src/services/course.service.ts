import { db } from '../database';
import { courses, subjects, curriculum, schedules, grades, enrollments, courseResources, assignments, submissions } from '../schema';
import { eq, and, like, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { NewCourse, Course, NewSubject, Subject, NewCurriculum, Curriculum, NewSchedule, Schedule, NewGrade, Grade, NewEnrollment, Enrollment, NewCourseResource, CourseResource, NewAssignment, Assignment, NewSubmission, Submission } from '../schema';
import { logger } from '../utils/logger';

export class CourseService {
  // ===== GESTIÓN DE CURSOS =====
  
  /**
   * Crear un nuevo curso
   */
  async createCourse(courseData: NewCourse): Promise<Course> {
    try {
      const [newCourse] = await db.insert(courses).values(courseData).returning();
      logger.info(`Course created: ${newCourse.id} - ${newCourse.name}`);
      return newCourse;
    } catch (error) {
      logger.error('Error creating course:', error);
      throw new Error('Failed to create course');
    }
  }

  /**
   * Obtener curso por ID
   */
  async getCourseById(id: number): Promise<Course | null> {
    try {
      const [course] = await db.select().from(courses).where(eq(courses.id, id));
      return course || null;
    } catch (error) {
      logger.error('Error getting course by ID:', error);
      throw new Error('Failed to get course');
    }
  }

  /**
   * Obtener curso por código
   */
  async getCourseByCode(code: string): Promise<Course | null> {
    try {
      const [course] = await db.select().from(courses).where(eq(courses.code, code));
      return course || null;
    } catch (error) {
      logger.error('Error getting course by code:', error);
      throw new Error('Failed to get course');
    }
  }

  /**
   * Listar cursos con filtros
   */
  async getCourses(filters: {
    academicYear?: string;
    semester?: string;
    grade?: string;
    department?: string;
    teacherId?: number;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ courses: Course[]; total: number }> {
    try {
      const { academicYear, semester, grade, department, teacherId, isActive, search, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [];
      
      if (academicYear) whereConditions.push(eq(courses.academicYear, academicYear));
      if (semester) whereConditions.push(eq(courses.semester, semester));
      if (grade) whereConditions.push(eq(courses.grade, grade));
      if (department) whereConditions.push(eq(courses.department, department));
      if (teacherId) whereConditions.push(eq(courses.teacherId, teacherId));
      if (isActive !== undefined) whereConditions.push(eq(courses.isActive, isActive));
      
      if (search) {
        whereConditions.push(
          like(courses.name, `%${search}%`)
        );
        whereConditions.push(
          like(courses.code, `%${search}%`)
        );
        whereConditions.push(
          like(courses.description, `%${search}%`)
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const coursesList = await db
        .select()
        .from(courses)
        .where(whereClause)
        .orderBy(asc(courses.name))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(courses)
        .where(whereClause);

      return {
        courses: coursesList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting courses:', error);
      throw new Error('Failed to get courses');
    }
  }

  /**
   * Actualizar curso
   */
  async updateCourse(id: number, updateData: Partial<NewCourse>): Promise<Course> {
    try {
      const [updatedCourse] = await db
        .update(courses)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(courses.id, id))
        .returning();

      if (!updatedCourse) {
        throw new Error('Course not found');
      }

      logger.info(`Course updated: ${id}`);
      return updatedCourse;
    } catch (error) {
      logger.error('Error updating course:', error);
      throw new Error('Failed to update course');
    }
  }

  /**
   * Eliminar curso (soft delete)
   */
  async deleteCourse(id: number): Promise<void> {
    try {
      await db
        .update(courses)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(courses.id, id));

      logger.info(`Course deactivated: ${id}`);
    } catch (error) {
      logger.error('Error deleting course:', error);
      throw new Error('Failed to delete course');
    }
  }

  // ===== GESTIÓN DE MATERIAS =====

  /**
   * Crear una nueva materia
   */
  async createSubject(subjectData: NewSubject): Promise<Subject> {
    try {
      const [newSubject] = await db.insert(subjects).values(subjectData).returning();
      logger.info(`Subject created: ${newSubject.id} - ${newSubject.name}`);
      return newSubject;
    } catch (error) {
      logger.error('Error creating subject:', error);
      throw new Error('Failed to create subject');
    }
  }

  /**
   * Obtener materia por ID
   */
  async getSubjectById(id: number): Promise<Subject | null> {
    try {
      const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
      return subject || null;
    } catch (error) {
      logger.error('Error getting subject by ID:', error);
      throw new Error('Failed to get subject');
    }
  }

  /**
   * Listar materias con filtros
   */
  async getSubjects(filters: {
    academicYear?: string;
    grade?: string;
    department?: string;
    teacherId?: number;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ subjects: Subject[]; total: number }> {
    try {
      const { academicYear, grade, department, teacherId, isActive, search, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [];
      
      if (academicYear) whereConditions.push(eq(subjects.academicYear, academicYear));
      if (grade) whereConditions.push(eq(subjects.grade, grade));
      if (department) whereConditions.push(eq(subjects.department, department));
      if (teacherId) whereConditions.push(eq(subjects.teacherId, teacherId));
      if (isActive !== undefined) whereConditions.push(eq(subjects.isActive, isActive));
      
      if (search) {
        whereConditions.push(
          like(subjects.name, `%${search}%`)
        );
        whereConditions.push(
          like(subjects.code, `%${search}%`)
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const subjectsList = await db
        .select()
        .from(subjects)
        .where(whereClause)
        .orderBy(asc(subjects.name))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(subjects)
        .where(whereClause);

      return {
        subjects: subjectsList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting subjects:', error);
      throw new Error('Failed to get subjects');
    }
  }

  // ===== GESTIÓN DE HORARIOS =====

  /**
   * Crear horario
   */
  async createSchedule(scheduleData: NewSchedule): Promise<Schedule> {
    try {
      const [newSchedule] = await db.insert(schedules).values(scheduleData).returning();
      logger.info(`Schedule created: ${newSchedule.id}`);
      return newSchedule;
    } catch (error) {
      logger.error('Error creating schedule:', error);
      throw new Error('Failed to create schedule');
    }
  }

  /**
   * Obtener horarios con filtros
   */
  async getSchedules(filters: {
    courseId?: number;
    subjectId?: number;
    teacherId?: number;
    dayOfWeek?: string;
    academicYear?: string;
    semester?: string;
    isActive?: boolean;
  } = {}): Promise<Schedule[]> {
    try {
      const { courseId, subjectId, teacherId, dayOfWeek, academicYear, semester, isActive } = filters;
      
      let whereConditions = [];
      
      if (courseId) whereConditions.push(eq(schedules.courseId, courseId));
      if (subjectId) whereConditions.push(eq(schedules.subjectId, subjectId));
      if (teacherId) whereConditions.push(eq(schedules.teacherId, teacherId));
      if (dayOfWeek) whereConditions.push(eq(schedules.dayOfWeek, dayOfWeek));
      if (academicYear) whereConditions.push(eq(schedules.academicYear, academicYear));
      if (semester) whereConditions.push(eq(schedules.semester, semester));
      if (isActive !== undefined) whereConditions.push(eq(schedules.isActive, isActive));

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      return await db
        .select()
        .from(schedules)
        .where(whereClause)
        .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));
    } catch (error) {
      logger.error('Error getting schedules:', error);
      throw new Error('Failed to get schedules');
    }
  }

  // ===== GESTIÓN DE CALIFICACIONES =====

  /**
   * Crear calificación
   */
  async createGrade(gradeData: NewGrade): Promise<Grade> {
    try {
      const [newGrade] = await db.insert(grades).values(gradeData).returning();
      logger.info(`Grade created for student: ${gradeData.studentId}`);
      return newGrade;
    } catch (error) {
      logger.error('Error creating grade:', error);
      throw new Error('Failed to create grade');
    }
  }

  /**
   * Obtener calificaciones de un estudiante
   */
  async getStudentGrades(studentId: number, filters: {
    courseId?: number;
    subjectId?: number;
    academicYear?: string;
    semester?: string;
    evaluationType?: string;
  } = {}): Promise<Grade[]> {
    try {
      const { courseId, subjectId, academicYear, semester, evaluationType } = filters;
      
      let whereConditions = [eq(grades.studentId, studentId)];
      
      if (courseId) whereConditions.push(eq(grades.courseId, courseId));
      if (subjectId) whereConditions.push(eq(grades.subjectId, subjectId));
      if (academicYear) whereConditions.push(eq(grades.academicYear, academicYear));
      if (semester) whereConditions.push(eq(grades.semester, semester));
      if (evaluationType) whereConditions.push(eq(grades.evaluationType, evaluationType));

      return await db
        .select()
        .from(grades)
        .where(and(...whereConditions))
        .orderBy(desc(grades.evaluationDate));
    } catch (error) {
      logger.error('Error getting student grades:', error);
      throw new Error('Failed to get student grades');
    }
  }

  /**
   * Obtener calificaciones de un curso
   */
  async getCourseGrades(courseId: number, filters: {
    academicYear?: string;
    semester?: string;
    evaluationType?: string;
  } = {}): Promise<Grade[]> {
    try {
      const { academicYear, semester, evaluationType } = filters;
      
      let whereConditions = [eq(grades.courseId, courseId)];
      
      if (academicYear) whereConditions.push(eq(grades.academicYear, academicYear));
      if (semester) whereConditions.push(eq(grades.semester, semester));
      if (evaluationType) whereConditions.push(eq(grades.evaluationType, evaluationType));

      return await db
        .select()
        .from(grades)
        .where(and(...whereConditions))
        .orderBy(asc(grades.studentId), desc(grades.evaluationDate));
    } catch (error) {
      logger.error('Error getting course grades:', error);
      throw new Error('Failed to get course grades');
    }
  }

  // ===== GESTIÓN DE INSCRIPCIONES =====

  /**
   * Inscribir estudiante en curso
   */
  async enrollStudent(enrollmentData: NewEnrollment): Promise<Enrollment> {
    try {
      const [newEnrollment] = await db.insert(enrollments).values(enrollmentData).returning();
      logger.info(`Student enrolled: ${enrollmentData.studentId} in course: ${enrollmentData.courseId}`);
      return newEnrollment;
    } catch (error) {
      logger.error('Error enrolling student:', error);
      throw new Error('Failed to enroll student');
    }
  }

  /**
   * Obtener inscripciones de un estudiante
   */
  async getStudentEnrollments(studentId: number, filters: {
    academicYear?: string;
    semester?: string;
    status?: string;
  } = {}): Promise<Enrollment[]> {
    try {
      const { academicYear, semester, status } = filters;
      
      let whereConditions = [eq(enrollments.studentId, studentId)];
      
      if (academicYear) whereConditions.push(eq(enrollments.academicYear, academicYear));
      if (semester) whereConditions.push(eq(enrollments.semester, semester));
      if (status) whereConditions.push(eq(enrollments.status, status));

      return await db
        .select()
        .from(enrollments)
        .where(and(...whereConditions))
        .orderBy(desc(enrollments.enrollmentDate));
    } catch (error) {
      logger.error('Error getting student enrollments:', error);
      throw new Error('Failed to get student enrollments');
    }
  }

  /**
   * Obtener estudiantes inscritos en un curso
   */
  async getCourseEnrollments(courseId: number, filters: {
    academicYear?: string;
    semester?: string;
    status?: string;
  } = {}): Promise<Enrollment[]> {
    try {
      const { academicYear, semester, status } = filters;
      
      let whereConditions = [eq(enrollments.courseId, courseId)];
      
      if (academicYear) whereConditions.push(eq(enrollments.academicYear, academicYear));
      if (semester) whereConditions.push(eq(enrollments.semester, semester));
      if (status) whereConditions.push(eq(enrollments.status, status));

      return await db
        .select()
        .from(enrollments)
        .where(and(...whereConditions))
        .orderBy(asc(enrollments.studentId));
    } catch (error) {
      logger.error('Error getting course enrollments:', error);
      throw new Error('Failed to get course enrollments');
    }
  }

  // ===== GESTIÓN DE RECURSOS =====

  /**
   * Crear recurso del curso
   */
  async createCourseResource(resourceData: NewCourseResource): Promise<CourseResource> {
    try {
      const [newResource] = await db.insert(courseResources).values(resourceData).returning();
      logger.info(`Course resource created: ${newResource.id}`);
      return newResource;
    } catch (error) {
      logger.error('Error creating course resource:', error);
      throw new Error('Failed to create course resource');
    }
  }

  /**
   * Obtener recursos de un curso
   */
  async getCourseResources(courseId: number, filters: {
    category?: string;
    isPublic?: boolean;
  } = {}): Promise<CourseResource[]> {
    try {
      const { category, isPublic } = filters;
      
      let whereConditions = [eq(courseResources.courseId, courseId)];
      
      if (category) whereConditions.push(eq(courseResources.category, category));
      if (isPublic !== undefined) whereConditions.push(eq(courseResources.isPublic, isPublic));

      return await db
        .select()
        .from(courseResources)
        .where(and(...whereConditions))
        .orderBy(desc(courseResources.createdAt));
    } catch (error) {
      logger.error('Error getting course resources:', error);
      throw new Error('Failed to get course resources');
    }
  }

  // ===== GESTIÓN DE TAREAS =====

  /**
   * Crear tarea
   */
  async createAssignment(assignmentData: NewAssignment): Promise<Assignment> {
    try {
      const [newAssignment] = await db.insert(assignments).values(assignmentData).returning();
      logger.info(`Assignment created: ${newAssignment.id} - ${newAssignment.title}`);
      return newAssignment;
    } catch (error) {
      logger.error('Error creating assignment:', error);
      throw new Error('Failed to create assignment');
    }
  }

  /**
   * Obtener tareas de un curso
   */
  async getCourseAssignments(courseId: number, filters: {
    type?: string;
    isPublished?: boolean;
    isGraded?: boolean;
  } = {}): Promise<Assignment[]> {
    try {
      const { type, isPublished, isGraded } = filters;
      
      let whereConditions = [eq(assignments.courseId, courseId)];
      
      if (type) whereConditions.push(eq(assignments.type, type));
      if (isPublished !== undefined) whereConditions.push(eq(assignments.isPublished, isPublished));
      if (isGraded !== undefined) whereConditions.push(eq(assignments.isGraded, isGraded));

      return await db
        .select()
        .from(assignments)
        .where(and(...whereConditions))
        .orderBy(desc(assignments.createdAt));
    } catch (error) {
      logger.error('Error getting course assignments:', error);
      throw new Error('Failed to get course assignments');
    }
  }

  // ===== GESTIÓN DE ENTREGAS =====

  /**
   * Crear entrega de tarea
   */
  async createSubmission(submissionData: NewSubmission): Promise<Submission> {
    try {
      const [newSubmission] = await db.insert(submissions).values(submissionData).returning();
      logger.info(`Submission created: ${newSubmission.id} for assignment: ${submissionData.assignmentId}`);
      return newSubmission;
    } catch (error) {
      logger.error('Error creating submission:', error);
      throw new Error('Failed to create submission');
    }
  }

  /**
   * Obtener entregas de un estudiante
   */
  async getStudentSubmissions(studentId: number, filters: {
    assignmentId?: number;
    status?: string;
  } = {}): Promise<Submission[]> {
    try {
      const { assignmentId, status } = filters;
      
      let whereConditions = [eq(submissions.studentId, studentId)];
      
      if (assignmentId) whereConditions.push(eq(submissions.assignmentId, assignmentId));
      if (status) whereConditions.push(eq(submissions.status, status));

      return await db
        .select()
        .from(submissions)
        .where(and(...whereConditions))
        .orderBy(desc(submissions.submittedAt));
    } catch (error) {
      logger.error('Error getting student submissions:', error);
      throw new Error('Failed to get student submissions');
    }
  }

  /**
   * Obtener entregas de una tarea
   */
  async getAssignmentSubmissions(assignmentId: number, filters: {
    status?: string;
    isLate?: boolean;
  } = {}): Promise<Submission[]> {
    try {
      const { status, isLate } = filters;
      
      let whereConditions = [eq(submissions.assignmentId, assignmentId)];
      
      if (status) whereConditions.push(eq(submissions.status, status));
      if (isLate !== undefined) whereConditions.push(eq(submissions.isLate, isLate));

      return await db
        .select()
        .from(submissions)
        .where(and(...whereConditions))
        .orderBy(asc(submissions.studentId));
    } catch (error) {
      logger.error('Error getting assignment submissions:', error);
      throw new Error('Failed to get assignment submissions');
    }
  }

  // ===== ESTADÍSTICAS Y REPORTES =====

  /**
   * Obtener estadísticas de un curso
   */
  async getCourseStats(courseId: number, academicYear: string): Promise<{
    totalStudents: number;
    averageGrade: number;
    assignmentsCount: number;
    resourcesCount: number;
    attendanceRate: number;
  }> {
    try {
      // Obtener estudiantes inscritos
      const enrollments = await this.getCourseEnrollments(courseId, { academicYear });
      const totalStudents = enrollments.filter(e => e.status === 'enrolled').length;

      // Obtener calificaciones
      const grades = await this.getCourseGrades(courseId, { academicYear });
      const averageGrade = grades.length > 0 
        ? grades.reduce((sum, grade) => sum + (grade.score || 0), 0) / grades.length
        : 0;

      // Obtener tareas
      const assignments = await this.getCourseAssignments(courseId);
      const assignmentsCount = assignments.length;

      // Obtener recursos
      const resources = await this.getCourseResources(courseId);
      const resourcesCount = resources.length;

      return {
        totalStudents,
        averageGrade: Math.round(averageGrade * 100) / 100,
        assignmentsCount,
        resourcesCount,
        attendanceRate: 0, // Se calcularía con datos de asistencia
      };
    } catch (error) {
      logger.error('Error getting course stats:', error);
      throw new Error('Failed to get course statistics');
    }
  }

  /**
   * Obtener estadísticas de un estudiante en un curso
   */
  async getStudentCourseStats(studentId: number, courseId: number, academicYear: string): Promise<{
    grade: string;
    finalScore: number;
    assignmentsSubmitted: number;
    assignmentsTotal: number;
    attendanceRate: number;
  }> {
    try {
      // Obtener inscripción
      const enrollments = await this.getStudentEnrollments(studentId, { academicYear });
      const enrollment = enrollments.find(e => e.courseId === courseId);
      
      if (!enrollment) {
        throw new Error('Student not enrolled in this course');
      }

      // Obtener calificaciones
      const grades = await this.getStudentGrades(studentId, { courseId, academicYear });
      const finalScore = enrollment.finalScore || 0;
      const grade = enrollment.grade || 'N/A';

      // Obtener tareas
      const assignments = await this.getCourseAssignments(courseId);
      const submissions = await this.getStudentSubmissions(studentId);
      const courseSubmissions = submissions.filter(s => 
        assignments.some(a => a.id === s.assignmentId)
      );

      return {
        grade,
        finalScore,
        assignmentsSubmitted: courseSubmissions.length,
        assignmentsTotal: assignments.length,
        attendanceRate: 0, // Se calcularía con datos de asistencia
      };
    } catch (error) {
      logger.error('Error getting student course stats:', error);
      throw new Error('Failed to get student course statistics');
    }
  }
}

export const courseService = new CourseService(); 