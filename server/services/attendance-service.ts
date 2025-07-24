import { db } from '../index.js';
import { 
  attendance, 
  users, 
  classes, 
  CreateAttendance 
} from '@/shared/schema.js';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

export interface AttendanceData {
  classId: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'justified';
  notes?: string;
}

export interface AttendanceStats {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  justified: number;
  attendanceRate: number;
}

export class AttendanceService {
  
  /**
   * Registrar asistencia individual
   */
  async recordAttendance(data: AttendanceData): Promise<any> {
    try {
      const [record] = await db
        .insert(attendance)
        .values({
          classId: data.classId,
          studentId: data.studentId,
          date: data.date,
          status: data.status,
          notes: data.notes
        })
        .returning();

      logger.info(`✅ Assistència registrada: ${data.studentId} - ${data.status} - ${data.date}`);
      return record;
    } catch (error) {
      logger.error('❌ Error registrant assistència:', error);
      throw error;
    }
  }

  /**
   * Registrar asistencia masiva para una clase
   */
  async recordBulkAttendance(classId: string, date: string, records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'justified';
    notes?: string;
  }>): Promise<any[]> {
    try {
      const attendanceData: CreateAttendance[] = records.map(record => ({
        classId,
        studentId: record.studentId,
        date,
        status: record.status,
        notes: record.notes
      }));

      const result = await db
        .insert(attendance)
        .values(attendanceData)
        .returning();

      logger.info(`✅ Assistència massiva registrada: ${result.length} registres per classe ${classId}`);
      return result;
    } catch (error) {
      logger.error('❌ Error registrant assistència massiva:', error);
      throw error;
    }
  }

  /**
   * Obtener asistencia de un estudiante
   */
  async getStudentAttendance(studentId: string, filters?: {
    startDate?: string;
    endDate?: string;
    classId?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          attendance: attendance,
          className: classes.name
        })
        .from(attendance)
        .innerJoin(classes, eq(attendance.classId, classes.id))
        .where(eq(attendance.studentId, studentId))
        .orderBy(desc(attendance.date));

      if (filters?.startDate) {
        query = query.where(gte(attendance.date, filters.startDate));
      }

      if (filters?.endDate) {
        query = query.where(lte(attendance.date, filters.endDate));
      }

      if (filters?.classId) {
        query = query.where(eq(attendance.classId, filters.classId));
      }

      if (filters?.status) {
        query = query.where(eq(attendance.status, filters.status));
      }

      const result = await query;
      logger.info(`✅ Assistència obtinguda per estudiant ${studentId}: ${result.length} registres`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint assistència d\'estudiant:', error);
      throw error;
    }
  }

  /**
   * Obtener asistencia de una clase en una fecha específica
   */
  async getClassAttendance(classId: string, date: string): Promise<any[]> {
    try {
      const result = await db
        .select({
          attendance: attendance,
          student: users.firstName,
          studentLastName: users.lastName,
          studentEmail: users.email
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.studentId, users.id))
        .where(
          and(
            eq(attendance.classId, classId),
            eq(attendance.date, date)
          )
        )
        .orderBy(asc(users.firstName));

      logger.info(`✅ Assistència obtinguda per classe ${classId} el ${date}: ${result.length} registres`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint assistència de classe:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de asistencia
   */
  async getAttendanceStats(classId: string, period?: {
    startDate: string;
    endDate: string;
  }): Promise<AttendanceStats> {
    try {
      let query = db
        .select({
          status: attendance.status,
          count: attendance.id
        })
        .from(attendance)
        .where(eq(attendance.classId, classId));

      if (period) {
        query = query.where(
          and(
            gte(attendance.date, period.startDate),
            lte(attendance.date, period.endDate)
          )
        );
      }

      const result = await query;
      
      const stats = {
        totalStudents: result.reduce((sum, record) => sum + record.count, 0),
        present: result.find(r => r.status === 'present')?.count || 0,
        absent: result.find(r => r.status === 'absent')?.count || 0,
        late: result.find(r => r.status === 'late')?.count || 0,
        justified: result.find(r => r.status === 'justified')?.count || 0,
        attendanceRate: 0
      };

      stats.attendanceRate = stats.totalStudents > 0 
        ? ((stats.present + stats.late) / stats.totalStudents) * 100 
        : 0;

      logger.info(`✅ Estadístiques d'assistència obtingudes per classe ${classId}`);
      return stats;
    } catch (error) {
      logger.error('❌ Error obtenint estadístiques d\'assistència:', error);
      throw error;
    }
  }

  /**
   * Actualizar registro de asistencia
   */
  async updateAttendance(id: string, data: Partial<AttendanceData>): Promise<any> {
    try {
      const [record] = await db
        .update(attendance)
        .set(data)
        .where(eq(attendance.id, id))
        .returning();

      logger.info(`✅ Assistència actualitzada: ${id}`);
      return record;
    } catch (error) {
      logger.error('❌ Error actualitzant assistència:', error);
      throw error;
    }
  }

  /**
   * Eliminar registro de asistencia
   */
  async deleteAttendance(id: string): Promise<void> {
    try {
      await db.delete(attendance).where(eq(attendance.id, id));
      logger.info(`✅ Assistència eliminada: ${id}`);
    } catch (error) {
      logger.error('❌ Error eliminant assistència:', error);
      throw error;
    }
  }

  /**
   * Obtener estudiantes de una clase
   */
  async getClassStudents(classId: string): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .innerJoin(studentClasses, eq(users.id, studentClasses.studentId))
        .where(eq(studentClasses.classId, classId))
        .orderBy(asc(users.firstName));

      logger.info(`✅ Estudiants obtinguts per classe ${classId}: ${result.length}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint estudiants de classe:', error);
      throw error;
    }
  }

  /**
   * Verificar si ya existe asistencia para una clase en una fecha
   */
  async checkExistingAttendance(classId: string, date: string): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.classId, classId),
            eq(attendance.date, date)
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      logger.error('❌ Error verificant assistència existent:', error);
      throw error;
    }
  }

  /**
   * Obtener reporte de asistencia
   */
  async getAttendanceReport(instituteId: string, filters?: {
    startDate?: string;
    endDate?: string;
    classId?: string;
    studentId?: string;
  }): Promise<any> {
    try {
      let query = db
        .select({
          attendance: attendance,
          className: classes.name,
          studentName: users.firstName,
          studentLastName: users.lastName
        })
        .from(attendance)
        .innerJoin(classes, eq(attendance.classId, classes.id))
        .innerJoin(users, eq(attendance.studentId, users.id))
        .where(eq(classes.instituteId, instituteId))
        .orderBy(desc(attendance.date));

      if (filters?.startDate) {
        query = query.where(gte(attendance.date, filters.startDate));
      }

      if (filters?.endDate) {
        query = query.where(lte(attendance.date, filters.endDate));
      }

      if (filters?.classId) {
        query = query.where(eq(attendance.classId, filters.classId));
      }

      if (filters?.studentId) {
        query = query.where(eq(attendance.studentId, filters.studentId));
      }

      const result = await query;

      // Procesar reporte
      const report = {
        totalRecords: result.length,
        byStatus: {
          present: result.filter(r => r.attendance.status === 'present').length,
          absent: result.filter(r => r.attendance.status === 'absent').length,
          late: result.filter(r => r.attendance.status === 'late').length,
          justified: result.filter(r => r.attendance.status === 'justified').length
        },
        byClass: {},
        byDate: {}
      };

      // Agrupar por clase
      result.forEach(record => {
        const className = record.className;
        if (!report.byClass[className]) {
          report.byClass[className] = {
            present: 0,
            absent: 0,
            late: 0,
            justified: 0
          };
        }
        report.byClass[className][record.attendance.status]++;
      });

      // Agrupar por fecha
      result.forEach(record => {
        const date = record.attendance.date;
        if (!report.byDate[date]) {
          report.byDate[date] = {
            present: 0,
            absent: 0,
            late: 0,
            justified: 0
          };
        }
        report.byDate[date][record.attendance.status]++;
      });

      logger.info(`✅ Report d'assistència generat per institut ${instituteId}`);
      return report;
    } catch (error) {
      logger.error('❌ Error generant report d\'assistència:', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService(); 