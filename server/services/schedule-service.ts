import { db } from '../index.js';
import { 
  schedules, 
  users, 
  classes, 
  subjects,
  CreateSchedule 
} from '@/shared/schema.js';
import { eq, and, desc, asc, or } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

export interface ScheduleData {
  teacherId: string;
  classId: string;
  subjectId: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  startTime: string; // formato HH:MM
  endTime: string; // formato HH:MM
  room?: string;
  notes?: string;
}

export interface ScheduleConflict {
  type: 'teacher' | 'class' | 'room';
  conflictingSchedule: any;
  message: string;
}

export interface ScheduleStats {
  totalSchedules: number;
  schedulesByDay: Record<string, number>;
  schedulesByTeacher: Record<string, number>;
  schedulesByClass: Record<string, number>;
}

export class ScheduleService {
  
  /**
   * Crear un nuevo horario
   */
  async createSchedule(data: ScheduleData): Promise<any> {
    try {
      // Verificar conflictos antes de crear
      const conflicts = await this.checkConflicts(data);
      if (conflicts.length > 0) {
        throw new Error(`Conflictes detectats: ${conflicts.map(c => c.message).join(', ')}`);
      }

      const [schedule] = await db
        .insert(schedules)
        .values({
          teacherId: data.teacherId,
          classId: data.classId,
          subjectId: data.subjectId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          room: data.room,
          notes: data.notes
        })
        .returning();

      logger.info(`✅ Horari creat: ${data.teacherId} - ${data.classId} - ${data.startTime}-${data.endTime}`);
      return schedule;
    } catch (error) {
      logger.error('❌ Error creant horari:', error);
      throw error;
    }
  }

  /**
   * Verificar conflictos de horario
   */
  async checkConflicts(data: ScheduleData): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    try {
      // Verificar conflicto de profesor (mismo día, horario solapado)
      const teacherConflicts = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.teacherId, data.teacherId),
            eq(schedules.dayOfWeek, data.dayOfWeek),
            or(
              and(
                schedules.startTime <= data.startTime,
                schedules.endTime > data.startTime
              ),
              and(
                schedules.startTime < data.endTime,
                schedules.endTime >= data.endTime
              ),
              and(
                schedules.startTime >= data.startTime,
                schedules.endTime <= data.endTime
              )
            )
          )
        );

      if (teacherConflicts.length > 0) {
        conflicts.push({
          type: 'teacher',
          conflictingSchedule: teacherConflicts[0],
          message: `El professor ja té una classe programada en aquest horari`
        });
      }

      // Verificar conflicto de clase (mismo día, horario solapado)
      const classConflicts = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.classId, data.classId),
            eq(schedules.dayOfWeek, data.dayOfWeek),
            or(
              and(
                schedules.startTime <= data.startTime,
                schedules.endTime > data.startTime
              ),
              and(
                schedules.startTime < data.endTime,
                schedules.endTime >= data.endTime
              ),
              and(
                schedules.startTime >= data.startTime,
                schedules.endTime <= data.endTime
              )
            )
          )
        );

      if (classConflicts.length > 0) {
        conflicts.push({
          type: 'class',
          conflictingSchedule: classConflicts[0],
          message: `La classe ja té una activitat programada en aquest horari`
        });
      }

      // Verificar conflicto de aula (si se especifica)
      if (data.room) {
        const roomConflicts = await db
          .select()
          .from(schedules)
          .where(
            and(
              eq(schedules.room, data.room),
              eq(schedules.dayOfWeek, data.dayOfWeek),
              or(
                and(
                  schedules.startTime <= data.startTime,
                  schedules.endTime > data.startTime
                ),
                and(
                  schedules.startTime < data.endTime,
                  schedules.endTime >= data.endTime
                ),
                and(
                  schedules.startTime >= data.startTime,
                  schedules.endTime <= data.endTime
                )
              )
            )
          );

        if (roomConflicts.length > 0) {
          conflicts.push({
            type: 'room',
            conflictingSchedule: roomConflicts[0],
            message: `L'aula ${data.room} ja està ocupada en aquest horari`
          });
        }
      }

      return conflicts;
    } catch (error) {
      logger.error('❌ Error verificant conflictes:', error);
      throw error;
    }
  }

  /**
   * Obtener horarios de un profesor
   */
  async getTeacherSchedule(teacherId: string, filters?: {
    dayOfWeek?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          schedule: schedules,
          className: classes.name,
          subjectName: subjects.name
        })
        .from(schedules)
        .innerJoin(classes, eq(schedules.classId, classes.id))
        .innerJoin(subjects, eq(schedules.subjectId, subjects.id))
        .where(eq(schedules.teacherId, teacherId))
        .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));

      if (filters?.dayOfWeek !== undefined) {
        query = query.where(eq(schedules.dayOfWeek, filters.dayOfWeek));
      }

      const result = await query;
      logger.info(`✅ Horaris obtinguts per professor ${teacherId}: ${result.length}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint horaris de professor:', error);
      throw error;
    }
  }

  /**
   * Obtener horarios de una clase
   */
  async getClassSchedule(classId: string, filters?: {
    dayOfWeek?: number;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          schedule: schedules,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          subjectName: subjects.name
        })
        .from(schedules)
        .innerJoin(users, eq(schedules.teacherId, users.id))
        .innerJoin(subjects, eq(schedules.subjectId, subjects.id))
        .where(eq(schedules.classId, classId))
        .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));

      if (filters?.dayOfWeek !== undefined) {
        query = query.where(eq(schedules.dayOfWeek, filters.dayOfWeek));
      }

      const result = await query;
      logger.info(`✅ Horaris obtinguts per classe ${classId}: ${result.length}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint horaris de classe:', error);
      throw error;
    }
  }

  /**
   * Obtener horarios de un instituto
   */
  async getInstituteSchedule(instituteId: string, filters?: {
    dayOfWeek?: number;
    teacherId?: string;
    classId?: string;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          schedule: schedules,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          className: classes.name,
          subjectName: subjects.name
        })
        .from(schedules)
        .innerJoin(users, eq(schedules.teacherId, users.id))
        .innerJoin(classes, eq(schedules.classId, classes.id))
        .innerJoin(subjects, eq(schedules.subjectId, subjects.id))
        .where(eq(classes.instituteId, instituteId))
        .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));

      if (filters?.dayOfWeek !== undefined) {
        query = query.where(eq(schedules.dayOfWeek, filters.dayOfWeek));
      }

      if (filters?.teacherId) {
        query = query.where(eq(schedules.teacherId, filters.teacherId));
      }

      if (filters?.classId) {
        query = query.where(eq(schedules.classId, filters.classId));
      }

      const result = await query;
      logger.info(`✅ Horaris obtinguts per institut ${instituteId}: ${result.length}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint horaris d\'institut:', error);
      throw error;
    }
  }

  /**
   * Actualizar un horario
   */
  async updateSchedule(id: string, data: Partial<ScheduleData>): Promise<any> {
    try {
      // Si se están cambiando horarios, verificar conflictos
      if (data.dayOfWeek || data.startTime || data.endTime || data.teacherId || data.classId || data.room) {
        const currentSchedule = await db
          .select()
          .from(schedules)
          .where(eq(schedules.id, id))
          .limit(1);

        if (!currentSchedule.length) {
          throw new Error('Horari no trobat');
        }

        const updatedData = {
          ...currentSchedule[0],
          ...data
        };

        const conflicts = await this.checkConflicts(updatedData);
        if (conflicts.length > 0) {
          throw new Error(`Conflictes detectats: ${conflicts.map(c => c.message).join(', ')}`);
        }
      }

      const [schedule] = await db
        .update(schedules)
        .set(data)
        .where(eq(schedules.id, id))
        .returning();

      logger.info(`✅ Horari actualitzat: ${id}`);
      return schedule;
    } catch (error) {
      logger.error('❌ Error actualitzant horari:', error);
      throw error;
    }
  }

  /**
   * Eliminar un horario
   */
  async deleteSchedule(id: string): Promise<void> {
    try {
      await db.delete(schedules).where(eq(schedules.id, id));
      logger.info(`✅ Horari eliminat: ${id}`);
    } catch (error) {
      logger.error('❌ Error eliminant horari:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de horarios
   */
  async getScheduleStats(instituteId: string): Promise<ScheduleStats> {
    try {
      const instituteSchedules = await this.getInstituteSchedule(instituteId);

      const stats: ScheduleStats = {
        totalSchedules: instituteSchedules.length,
        schedulesByDay: {},
        schedulesByTeacher: {},
        schedulesByClass: {}
      };

      // Agrupar por día
      instituteSchedules.forEach(schedule => {
        const dayName = this.getDayName(schedule.schedule.dayOfWeek);
        stats.schedulesByDay[dayName] = (stats.schedulesByDay[dayName] || 0) + 1;
      });

      // Agrupar por profesor
      instituteSchedules.forEach(schedule => {
        const teacherName = `${schedule.teacherName} ${schedule.teacherLastName}`;
        stats.schedulesByTeacher[teacherName] = (stats.schedulesByTeacher[teacherName] || 0) + 1;
      });

      // Agrupar por clase
      instituteSchedules.forEach(schedule => {
        stats.schedulesByClass[schedule.className] = (stats.schedulesByClass[schedule.className] || 0) + 1;
      });

      logger.info(`✅ Estadístiques d'horaris obtingudes per institut ${instituteId}`);
      return stats;
    } catch (error) {
      logger.error('❌ Error obtenint estadístiques d\'horaris:', error);
      throw error;
    }
  }

  /**
   * Obtener nombre del día
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    return days[dayOfWeek] || 'Desconegut';
  }

  /**
   * Verificar disponibilidad de profesor
   */
  async checkTeacherAvailability(teacherId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<boolean> {
    try {
      const conflicts = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.teacherId, teacherId),
            eq(schedules.dayOfWeek, dayOfWeek),
            or(
              and(
                schedules.startTime <= startTime,
                schedules.endTime > startTime
              ),
              and(
                schedules.startTime < endTime,
                schedules.endTime >= endTime
              ),
              and(
                schedules.startTime >= startTime,
                schedules.endTime <= endTime
              )
            )
          )
        );

      return conflicts.length === 0;
    } catch (error) {
      logger.error('❌ Error verificant disponibilitat de professor:', error);
      throw error;
    }
  }

  /**
   * Obtener horarios por aula
   */
  async getRoomSchedule(room: string, instituteId: string, filters?: {
    dayOfWeek?: number;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          schedule: schedules,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          className: classes.name,
          subjectName: subjects.name
        })
        .from(schedules)
        .innerJoin(users, eq(schedules.teacherId, users.id))
        .innerJoin(classes, eq(schedules.classId, classes.id))
        .innerJoin(subjects, eq(schedules.subjectId, subjects.id))
        .where(
          and(
            eq(schedules.room, room),
            eq(classes.instituteId, instituteId)
          )
        )
        .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));

      if (filters?.dayOfWeek !== undefined) {
        query = query.where(eq(schedules.dayOfWeek, filters.dayOfWeek));
      }

      const result = await query;
      logger.info(`✅ Horaris obtinguts per aula ${room}: ${result.length}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint horaris d\'aula:', error);
      throw error;
    }
  }
}

export const scheduleService = new ScheduleService(); 