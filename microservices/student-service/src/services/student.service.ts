import { db } from '../database';
import { students, academicRecords, attendance, competencies, behavior, notes, documents } from '../schema';
import { eq, and, like, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { NewStudent, Student, NewAcademicRecord, AcademicRecord, NewAttendance, Attendance, NewCompetency, Competency, NewBehavior, Behavior, NewNote, Note, NewDocument, Document } from '../schema';
import { logger } from '../utils/logger';

export class StudentService {
  // ===== GESTIÓN DE ESTUDIANTES =====
  
  /**
   * Crear un nuevo estudiante
   */
  async createStudent(studentData: NewStudent): Promise<Student> {
    try {
      const [newStudent] = await db.insert(students).values(studentData).returning();
      logger.info(`Student created: ${newStudent.id} - ${newStudent.firstName} ${newStudent.lastName}`);
      return newStudent;
    } catch (error) {
      logger.error('Error creating student:', error);
      throw new Error('Failed to create student');
    }
  }

  /**
   * Obtener estudiante por ID
   */
  async getStudentById(id: number): Promise<Student | null> {
    try {
      const [student] = await db.select().from(students).where(eq(students.id, id));
      return student || null;
    } catch (error) {
      logger.error('Error getting student by ID:', error);
      throw new Error('Failed to get student');
    }
  }

  /**
   * Obtener estudiante por UUID
   */
  async getStudentByUuid(uuid: string): Promise<Student | null> {
    try {
      const [student] = await db.select().from(students).where(eq(students.uuid, uuid));
      return student || null;
    } catch (error) {
      logger.error('Error getting student by UUID:', error);
      throw new Error('Failed to get student');
    }
  }

  /**
   * Obtener estudiante por email
   */
  async getStudentByEmail(email: string): Promise<Student | null> {
    try {
      const [student] = await db.select().from(students).where(eq(students.email, email));
      return student || null;
    } catch (error) {
      logger.error('Error getting student by email:', error);
      throw new Error('Failed to get student');
    }
  }

  /**
   * Listar estudiantes con filtros
   */
  async getStudents(filters: {
    grade?: string;
    section?: string;
    academicYear?: string;
    status?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ students: Student[]; total: number }> {
    try {
      const { grade, section, academicYear, status, isActive, search, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [];
      
      if (grade) whereConditions.push(eq(students.grade, grade));
      if (section) whereConditions.push(eq(students.section, section));
      if (academicYear) whereConditions.push(eq(students.academicYear, academicYear));
      if (status) whereConditions.push(eq(students.status, status));
      if (isActive !== undefined) whereConditions.push(eq(students.isActive, isActive));
      
      if (search) {
        whereConditions.push(
          like(students.firstName, `%${search}%`)
        );
        whereConditions.push(
          like(students.lastName, `%${search}%`)
        );
        whereConditions.push(
          like(students.email, `%${search}%`)
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const studentsList = await db
        .select()
        .from(students)
        .where(whereClause)
        .orderBy(asc(students.lastName), asc(students.firstName))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(students)
        .where(whereClause);

      return {
        students: studentsList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting students:', error);
      throw new Error('Failed to get students');
    }
  }

  /**
   * Actualizar estudiante
   */
  async updateStudent(id: number, updateData: Partial<NewStudent>): Promise<Student> {
    try {
      const [updatedStudent] = await db
        .update(students)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(students.id, id))
        .returning();

      if (!updatedStudent) {
        throw new Error('Student not found');
      }

      logger.info(`Student updated: ${id}`);
      return updatedStudent;
    } catch (error) {
      logger.error('Error updating student:', error);
      throw new Error('Failed to update student');
    }
  }

  /**
   * Eliminar estudiante (soft delete)
   */
  async deleteStudent(id: number): Promise<void> {
    try {
      await db
        .update(students)
        .set({ isActive: false, status: 'inactive', updatedAt: new Date() })
        .where(eq(students.id, id));

      logger.info(`Student deactivated: ${id}`);
    } catch (error) {
      logger.error('Error deleting student:', error);
      throw new Error('Failed to delete student');
    }
  }

  // ===== REGISTROS ACADÉMICOS =====

  /**
   * Crear registro académico
   */
  async createAcademicRecord(recordData: NewAcademicRecord): Promise<AcademicRecord> {
    try {
      const [newRecord] = await db.insert(academicRecords).values(recordData).returning();
      logger.info(`Academic record created for student: ${recordData.studentId}`);
      return newRecord;
    } catch (error) {
      logger.error('Error creating academic record:', error);
      throw new Error('Failed to create academic record');
    }
  }

  /**
   * Obtener registros académicos de un estudiante
   */
  async getAcademicRecords(studentId: number, filters: {
    subject?: string;
    academicYear?: string;
    semester?: string;
  } = {}): Promise<AcademicRecord[]> {
    try {
      const { subject, academicYear, semester } = filters;
      
      let whereConditions = [eq(academicRecords.studentId, studentId)];
      
      if (subject) whereConditions.push(eq(academicRecords.subject, subject));
      if (academicYear) whereConditions.push(eq(academicRecords.academicYear, academicYear));
      if (semester) whereConditions.push(eq(academicRecords.semester, semester));

      return await db
        .select()
        .from(academicRecords)
        .where(and(...whereConditions))
        .orderBy(desc(academicRecords.evaluationDate));
    } catch (error) {
      logger.error('Error getting academic records:', error);
      throw new Error('Failed to get academic records');
    }
  }

  // ===== ASISTENCIA =====

  /**
   * Registrar asistencia
   */
  async createAttendance(attendanceData: NewAttendance): Promise<Attendance> {
    try {
      const [newAttendance] = await db.insert(attendance).values(attendanceData).returning();
      logger.info(`Attendance recorded for student: ${attendanceData.studentId}`);
      return newAttendance;
    } catch (error) {
      logger.error('Error creating attendance:', error);
      throw new Error('Failed to create attendance record');
    }
  }

  /**
   * Obtener asistencia de un estudiante
   */
  async getAttendance(studentId: number, filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    subject?: string;
  } = {}): Promise<Attendance[]> {
    try {
      const { startDate, endDate, status, subject } = filters;
      
      let whereConditions = [eq(attendance.studentId, studentId)];
      
      if (startDate) whereConditions.push(gte(attendance.date, startDate));
      if (endDate) whereConditions.push(lte(attendance.date, endDate));
      if (status) whereConditions.push(eq(attendance.status, status));
      if (subject) whereConditions.push(eq(attendance.subject, subject));

      return await db
        .select()
        .from(attendance)
        .where(and(...whereConditions))
        .orderBy(desc(attendance.date));
    } catch (error) {
      logger.error('Error getting attendance:', error);
      throw new Error('Failed to get attendance records');
    }
  }

  /**
   * Obtener estadísticas de asistencia
   */
  async getAttendanceStats(studentId: number, academicYear: string): Promise<{
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  }> {
    try {
      const records = await db
        .select()
        .from(attendance)
        .where(and(
          eq(attendance.studentId, studentId),
          gte(attendance.date, new Date(`${academicYear}-09-01`)),
          lte(attendance.date, new Date(`${parseInt(academicYear) + 1}-06-30`))
        ));

      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const excused = records.filter(r => r.status === 'excused').length;
      const percentage = total > 0 ? (present / total) * 100 : 0;

      return {
        total,
        present,
        absent,
        late,
        excused,
        percentage: Math.round(percentage * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting attendance stats:', error);
      throw new Error('Failed to get attendance statistics');
    }
  }

  // ===== COMPETENCIAS =====

  /**
   * Crear competencia
   */
  async createCompetency(competencyData: NewCompetency): Promise<Competency> {
    try {
      const [newCompetency] = await db.insert(competencies).values(competencyData).returning();
      logger.info(`Competency created for student: ${competencyData.studentId}`);
      return newCompetency;
    } catch (error) {
      logger.error('Error creating competency:', error);
      throw new Error('Failed to create competency');
    }
  }

  /**
   * Obtener competencias de un estudiante
   */
  async getCompetencies(studentId: number, academicYear: string): Promise<Competency[]> {
    try {
      return await db
        .select()
        .from(competencies)
        .where(and(
          eq(competencies.studentId, studentId),
          eq(competencies.academicYear, academicYear)
        ))
        .orderBy(asc(competencies.competencyName));
    } catch (error) {
      logger.error('Error getting competencies:', error);
      throw new Error('Failed to get competencies');
    }
  }

  // ===== COMPORTAMIENTO =====

  /**
   * Crear registro de comportamiento
   */
  async createBehavior(behaviorData: NewBehavior): Promise<Behavior> {
    try {
      const [newBehavior] = await db.insert(behavior).values(behaviorData).returning();
      logger.info(`Behavior record created for student: ${behaviorData.studentId}`);
      return newBehavior;
    } catch (error) {
      logger.error('Error creating behavior record:', error);
      throw new Error('Failed to create behavior record');
    }
  }

  /**
   * Obtener registros de comportamiento
   */
  async getBehavior(studentId: number, filters: {
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    isResolved?: boolean;
  } = {}): Promise<Behavior[]> {
    try {
      const { startDate, endDate, severity, isResolved } = filters;
      
      let whereConditions = [eq(behavior.studentId, studentId)];
      
      if (startDate) whereConditions.push(gte(behavior.incidentDate, startDate));
      if (endDate) whereConditions.push(lte(behavior.incidentDate, endDate));
      if (severity) whereConditions.push(eq(behavior.severity, severity));
      if (isResolved !== undefined) whereConditions.push(eq(behavior.isResolved, isResolved));

      return await db
        .select()
        .from(behavior)
        .where(and(...whereConditions))
        .orderBy(desc(behavior.incidentDate));
    } catch (error) {
      logger.error('Error getting behavior records:', error);
      throw new Error('Failed to get behavior records');
    }
  }

  // ===== NOTAS =====

  /**
   * Crear nota
   */
  async createNote(noteData: NewNote): Promise<Note> {
    try {
      const [newNote] = await db.insert(notes).values(noteData).returning();
      logger.info(`Note created for student: ${noteData.studentId}`);
      return newNote;
    } catch (error) {
      logger.error('Error creating note:', error);
      throw new Error('Failed to create note');
    }
  }

  /**
   * Obtener notas de un estudiante
   */
  async getNotes(studentId: number, filters: {
    category?: string;
    priority?: string;
    isPrivate?: boolean;
  } = {}): Promise<Note[]> {
    try {
      const { category, priority, isPrivate } = filters;
      
      let whereConditions = [eq(notes.studentId, studentId)];
      
      if (category) whereConditions.push(eq(notes.category, category));
      if (priority) whereConditions.push(eq(notes.priority, priority));
      if (isPrivate !== undefined) whereConditions.push(eq(notes.isPrivate, isPrivate));

      return await db
        .select()
        .from(notes)
        .where(and(...whereConditions))
        .orderBy(desc(notes.createdAt));
    } catch (error) {
      logger.error('Error getting notes:', error);
      throw new Error('Failed to get notes');
    }
  }

  // ===== DOCUMENTOS =====

  /**
   * Crear documento
   */
  async createDocument(documentData: NewDocument): Promise<Document> {
    try {
      const [newDocument] = await db.insert(documents).values(documentData).returning();
      logger.info(`Document created for student: ${documentData.studentId}`);
      return newDocument;
    } catch (error) {
      logger.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }

  /**
   * Obtener documentos de un estudiante
   */
  async getDocuments(studentId: number, filters: {
    category?: string;
    isPublic?: boolean;
  } = {}): Promise<Document[]> {
    try {
      const { category, isPublic } = filters;
      
      let whereConditions = [eq(documents.studentId, studentId)];
      
      if (category) whereConditions.push(eq(documents.category, category));
      if (isPublic !== undefined) whereConditions.push(eq(documents.isPublic, isPublic));

      return await db
        .select()
        .from(documents)
        .where(and(...whereConditions))
        .orderBy(desc(documents.createdAt));
    } catch (error) {
      logger.error('Error getting documents:', error);
      throw new Error('Failed to get documents');
    }
  }

  // ===== ESTADÍSTICAS Y REPORTES =====

  /**
   * Obtener estadísticas generales del estudiante
   */
  async getStudentStats(studentId: number, academicYear: string): Promise<{
    academic: {
      averageScore: number;
      totalSubjects: number;
      passedSubjects: number;
      failedSubjects: number;
    };
    attendance: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      percentage: number;
    };
    competencies: {
      total: number;
      achieved: number;
      inProgress: number;
      percentage: number;
    };
    behavior: {
      total: number;
      resolved: number;
      pending: number;
      critical: number;
    };
  }> {
    try {
      // Obtener datos académicos
      const academicRecords = await this.getAcademicRecords(studentId, { academicYear });
      const averageScore = academicRecords.length > 0 
        ? academicRecords.reduce((sum, record) => sum + (record.score || 0), 0) / academicRecords.length
        : 0;
      const passedSubjects = academicRecords.filter(r => r.isPassed).length;
      const failedSubjects = academicRecords.filter(r => r.isPassed === false).length;

      // Obtener datos de asistencia
      const attendanceStats = await this.getAttendanceStats(studentId, academicYear);

      // Obtener datos de competencias
      const competenciesList = await this.getCompetencies(studentId, academicYear);
      const achievedCompetencies = competenciesList.filter(c => c.isAchieved).length;
      const inProgressCompetencies = competenciesList.filter(c => !c.isAchieved).length;

      // Obtener datos de comportamiento
      const behaviorRecords = await this.getBehavior(studentId);
      const resolvedBehavior = behaviorRecords.filter(b => b.isResolved).length;
      const criticalBehavior = behaviorRecords.filter(b => b.severity === 'critical').length;

      return {
        academic: {
          averageScore: Math.round(averageScore * 100) / 100,
          totalSubjects: academicRecords.length,
          passedSubjects,
          failedSubjects,
        },
        attendance: attendanceStats,
        competencies: {
          total: competenciesList.length,
          achieved: achievedCompetencies,
          inProgress: inProgressCompetencies,
          percentage: competenciesList.length > 0 ? (achievedCompetencies / competenciesList.length) * 100 : 0,
        },
        behavior: {
          total: behaviorRecords.length,
          resolved: resolvedBehavior,
          pending: behaviorRecords.length - resolvedBehavior,
          critical: criticalBehavior,
        },
      };
    } catch (error) {
      logger.error('Error getting student stats:', error);
      throw new Error('Failed to get student statistics');
    }
  }
}

export const studentService = new StudentService(); 