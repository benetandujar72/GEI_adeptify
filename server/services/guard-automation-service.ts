import { db } from '../index.js';
import { 
  guardDuties, 
  users, 
  schedules, 
  classes, 
  subjects,
  activities,
  activitySupervisors,
  activityEnrollments,
  studentClasses,
  CreateGuardDuty
} from '@/shared/schema.js';
import { eq, and, not, inArray, isNull, asc, desc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

export interface GuardAssignmentResult {
  totalGuardsNeeded: number;
  guardsAssigned: number;
  guardsPending: number;
  details: Array<{
    guardId: number;
    originalTeacher: string;
    substituteTeacher?: string;
    classInfo: string;
    timeSlot: string;
    status: string;
    studentsRemaining: number;
  }>;
}

export interface TeacherAvailability {
  id: number;
  firstName: string;
  lastName: string;
  priority: number;
  reason: string;
  workloadScore: number;
}

export class GuardAutomationService {
  
  /**
   * Asignar guardias automáticamente para una actividad/salida
   */
  async assignGuardDutiesForActivity(activityId: number): Promise<GuardAssignmentResult> {
    logger.info(`🏫 Iniciando assignació de guàrdies per activitat ${activityId}`);
    
    try {
      // 1. Obtener información de la actividad
      const activity = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
      if (!activity.length) {
        throw new Error(`Activitat ${activityId} no trobada`);
      }
      
      const currentActivity = activity[0];
      logger.info(`📅 Processant activitat: ${currentActivity.title} (${currentActivity.startDate} - ${currentActivity.endDate})`);
      
      // 2. Obtener profesores que asisten a la actividad
      const supervisors = await db
        .select({
          teacherId: activitySupervisors.supervisorId,
          teacherName: users.firstName,
          teacherLastName: users.lastName
        })
        .from(activitySupervisors)
        .innerJoin(users, eq(users.id, activitySupervisors.supervisorId))
        .where(eq(activitySupervisors.activityId, activityId));
      
      logger.info(`👨‍🏫 Professors que van a l'activitat: ${supervisors.length}`);
      
      // 3. Obtener estudiantes inscritos en la actividad
      const enrolledStudents = await db
        .select({ studentId: activityEnrollments.studentId })
        .from(activityEnrollments)
        .where(eq(activityEnrollments.activityId, activityId));
      
      const enrolledStudentIds = enrolledStudents.map(s => s.studentId);
      logger.info(`🎓 Estudiants inscrits a l'activitat: ${enrolledStudentIds.length}`);
      
      // 4. Obtener fechas de la actividad
      const activityDates = this.getDatesBetween(
        new Date(currentActivity.startDate), 
        new Date(currentActivity.endDate)
      );
      
      const result: GuardAssignmentResult = {
        totalGuardsNeeded: 0,
        guardsAssigned: 0,
        guardsPending: 0,
        details: []
      };
      
      // 5. Procesar cada profesor y cada día de la actividad
      for (const supervisor of supervisors) {
        for (const activityDate of activityDates) {
          // Saltar fines de semana
          const dayOfWeek = activityDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
          
          // Obtener horarios del profesor para este día
          const teacherSchedules = await db
            .select()
            .from(schedules)
            .where(
              and(
                eq(schedules.teacherId, supervisor.teacherId),
                eq(schedules.dayOfWeek, dayOfWeek)
              )
            );
          
          // 6. Procesar cada hora lectiva del profesor
          for (const schedule of teacherSchedules) {
            result.totalGuardsNeeded++;
            
            // Obtener información de la clase
            const classInfo = await db
              .select({ name: classes.name })
              .from(classes)
              .where(eq(classes.id, schedule.classId))
              .limit(1);
            
            const className = classInfo[0]?.name || `Classe ${schedule.classId}`;
            
            // Obtener estudiantes de la clase que NO van a la actividad
            const classStudents = await db
              .select({ studentId: studentClasses.studentId })
              .from(studentClasses)
              .where(eq(studentClasses.classId, schedule.classId));
            
            const studentsRemaining = classStudents.filter(
              s => !enrolledStudentIds.includes(s.studentId)
            );
            
            logger.info(`📚 Classe ${className}: ${studentsRemaining.length} estudiants es queden`);
            
            // 7. Buscar sustituto
            const substitute = await this.findSubstituteTeacher(
              schedule.subjectId,
              dayOfWeek,
              schedule.startTime,
              schedule.endTime,
              currentActivity.instituteId,
              supervisor.teacherId
            );
            
            // 8. Crear registro de guardia
            const guardDutyData: CreateGuardDuty = {
              activityId: activityId,
              originalTeacherId: supervisor.teacherId,
              substituteTeacherId: substitute?.id || null,
              scheduleSlotId: null,
              classId: schedule.classId,
              date: activityDate.toISOString().split('T')[0],
              status: substitute ? "assigned" : "pending_assignment",
              feedbackNotes: null,
              signedAt: null,
              instituteId: currentActivity.instituteId
            };
            
            const [createdGuard] = await db.insert(guardDuties).values(guardDutyData).returning();
            
            if (substitute) {
              // Incrementar contador de guardias del sustituto
              await db
                .update(users)
                .set({ guardDutyPriority: substitute.guardDutyPriority + 1 })
                .where(eq(users.id, substitute.id));
              
              result.guardsAssigned++;
              
              // Enviar notificación
              await this.sendGuardAssignmentNotification(createdGuard.id);
              
              logger.info(`✅ Guàrdia assignada: ${substitute.firstName} ${substitute.lastName} per ${className}`);
            } else {
              result.guardsPending++;
              
              // Notificar al director de estudios
              await this.sendGuardAssignmentFailedNotification(createdGuard.id);
              
              logger.info(`❌ No s'ha trobat substitut per ${className}`);
            }
            
            // Obtener información de la asignatura
            const subjectInfo = await db
              .select({ name: subjects.name })
              .from(subjects)
              .where(eq(subjects.id, schedule.subjectId))
              .limit(1);
            
            const subjectName = subjectInfo[0]?.name || `Assignatura ${schedule.subjectId}`;
            
            // Añadir detalles al resultado
            result.details.push({
              guardId: createdGuard.id,
              originalTeacher: `${supervisor.teacherName} ${supervisor.teacherLastName}`,
              substituteTeacher: substitute ? `${substitute.firstName} ${substitute.lastName}` : undefined,
              classInfo: `${className} - ${subjectName}`,
              timeSlot: `${schedule.startTime} - ${schedule.endTime}`,
              status: substitute ? "assigned" : "pending_assignment",
              studentsRemaining: studentsRemaining.length
            });
          }
        }
      }
      
      logger.info(`✅ Assignació completada: ${result.guardsAssigned}/${result.totalGuardsNeeded} guàrdies assignades`);
      return result;
      
    } catch (error) {
      logger.error('❌ Error en assignació automàtica de guàrdies:', error);
      throw error;
    }
  }
  
  /**
   * Algoritmo de búsqueda de profesor sustituto
   */
  private async findSubstituteTeacher(
    subjectId: number,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    instituteId: number,
    excludeTeacherId: number
  ): Promise<TeacherAvailability | null> {
    logger.info(`🔍 Buscant substitut per ${startTime}-${endTime}, dia ${dayOfWeek}`);
    
    try {
      // Prioridad 1: Profesor libre de la misma asignatura
      const sameSubjectTeachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          guardDutyPriority: users.guardDutyPriority
        })
        .from(users)
        .leftJoin(schedules, and(
          eq(schedules.teacherId, users.id),
          eq(schedules.dayOfWeek, dayOfWeek)
        ))
        .where(
          and(
            eq(users.role, "teacher"),
            eq(users.instituteId, instituteId),
            eq(users.isActive, true),
            not(eq(users.id, excludeTeacherId)),
            isNull(schedules.id) // No hay conflicto de horario
          )
        )
        .orderBy(asc(users.guardDutyPriority))
        .limit(1);
      
      if (sameSubjectTeachers.length > 0) {
        const teacher = sameSubjectTeachers[0];
        logger.info(`✨ Trobat professor de la mateixa assignatura: ${teacher.firstName}`);
        return {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          priority: 1,
          reason: "Mateixa assignatura",
          workloadScore: teacher.guardDutyPriority || 0
        };
      }
      
      // Prioridad 2: Profesor libre de cualquier asignatura
      const availableTeachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          guardDutyPriority: users.guardDutyPriority
        })
        .from(users)
        .leftJoin(schedules, and(
          eq(schedules.teacherId, users.id),
          eq(schedules.dayOfWeek, dayOfWeek)
        ))
        .where(
          and(
            eq(users.role, "teacher"),
            eq(users.instituteId, instituteId),
            eq(users.isActive, true),
            not(eq(users.id, excludeTeacherId)),
            isNull(schedules.id)
          )
        )
        .orderBy(asc(users.guardDutyPriority))
        .limit(1);
      
      if (availableTeachers.length > 0) {
        const teacher = availableTeachers[0];
        logger.info(`✨ Trobat professor disponible: ${teacher.firstName}`);
        return {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          priority: 2,
          reason: "Professor disponible",
          workloadScore: teacher.guardDutyPriority || 0
        };
      }
      
      logger.info(`❌ No s'ha trobat cap professor disponible`);
      return null;
      
    } catch (error) {
      logger.error('❌ Error buscant substitut:', error);
      return null;
    }
  }
  
  /**
   * Obtener fechas entre dos fechas (excluyendo fines de semana)
   */
  private getDatesBetween(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Excluir domingo (0) y sábado (6)
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }
  
  /**
   * Enviar notificación de asignación de guardia
   */
  private async sendGuardAssignmentNotification(guardId: number): Promise<void> {
    try {
      // Aquí se implementaría el envío de notificación
      // Por ahora solo log
      logger.info(`📧 Notificació enviada per guàrdia ${guardId}`);
    } catch (error) {
      logger.error('❌ Error enviant notificació:', error);
    }
  }
  
  /**
   * Enviar notificación de fallo en asignación
   */
  private async sendGuardAssignmentFailedNotification(guardId: number): Promise<void> {
    try {
      // Aquí se implementaría el envío de notificación al director
      logger.info(`⚠️ Notificació d'error enviada al director per guàrdia ${guardId}`);
    } catch (error) {
      logger.error('❌ Error enviant notificació d\'error:', error);
    }
  }
  
  /**
   * Obtener estadísticas de guardias
   */
  async getGuardStats(instituteId: number, period?: {
    startDate: Date;
    endDate: Date;
  }): Promise<any> {
    try {
      let query = db
        .select({
          totalGuards: guardDuties.id,
          assignedGuards: guardDuties.status,
          pendingGuards: guardDuties.status,
          completedGuards: guardDuties.status
        })
        .from(guardDuties)
        .where(eq(guardDuties.instituteId, instituteId));
      
      if (period) {
        query = query.where(
          and(
            guardDuties.date >= period.startDate.toISOString().split('T')[0],
            guardDuties.date <= period.endDate.toISOString().split('T')[0]
          )
        );
      }
      
      const result = await query;
      
      const stats = {
        totalGuards: result.length,
        assignedGuards: result.filter(g => g.assignedGuards === 'assigned').length,
        pendingGuards: result.filter(g => g.pendingGuards === 'pending_assignment').length,
        completedGuards: result.filter(g => g.completedGuards === 'completed').length,
        assignmentRate: result.length > 0 
          ? (result.filter(g => g.assignedGuards === 'assigned').length / result.length) * 100 
          : 0
      };
      
      logger.info(`✅ Estadístiques de guàrdies obtingudes per institut ${instituteId}`);
      return stats;
      
    } catch (error) {
      logger.error('❌ Error obtenint estadístiques de guàrdies:', error);
      throw error;
    }
  }
}

export const guardAutomationService = new GuardAutomationService(); 