import { db } from '../index.js';
import { 
  notifications, 
  users, 
  classes,
  institutes,
  CreateNotification 
} from '@/shared/schema.js';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipientIds?: string[];
  classIds?: string[];
  instituteId: string;
  senderId: string;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export class CommunicationService {
  
  /**
   * Enviar notificación individual
   */
  async sendNotification(data: NotificationData): Promise<any> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          recipientIds: data.recipientIds || [],
          classIds: data.classIds || [],
          instituteId: data.instituteId,
          senderId: data.senderId,
          metadata: data.metadata || {},
          status: 'sent'
        })
        .returning();

      logger.info(`📧 Notificació enviada: ${data.title} a ${data.recipientIds?.length || 0} destinataris`);
      return notification;
    } catch (error) {
      logger.error('❌ Error enviant notificació:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación masiva a una clase
   */
  async sendClassNotification(classId: string, data: Omit<NotificationData, 'recipientIds'>): Promise<any> {
    try {
      // Obtener estudiantes de la clase
      const students = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(studentClasses, eq(users.id, studentClasses.studentId))
        .where(eq(studentClasses.classId, classId));

      const studentIds = students.map(s => s.id);

      const notificationData: NotificationData = {
        ...data,
        recipientIds: studentIds,
        classIds: [classId]
      };

      const notification = await this.sendNotification(notificationData);

      logger.info(`📧 Notificació de classe enviada: ${data.title} a ${studentIds.length} estudiants`);
      return notification;
    } catch (error) {
      logger.error('❌ Error enviant notificació de classe:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación a todo el instituto
   */
  async sendInstituteNotification(instituteId: string, data: Omit<NotificationData, 'recipientIds' | 'classIds'>): Promise<any> {
    try {
      // Obtener todos los usuarios del instituto
      const instituteUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.instituteId, instituteId));

      const userIds = instituteUsers.map(u => u.id);

      const notificationData: NotificationData = {
        ...data,
        recipientIds: userIds,
        instituteId
      };

      const notification = await this.sendNotification(notificationData);

      logger.info(`📧 Notificació d'institut enviada: ${data.title} a ${userIds.length} usuaris`);
      return notification;
    } catch (error) {
      logger.error('❌ Error enviant notificació d\'institut:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async getUserNotifications(userId: string, filters?: {
    unreadOnly?: boolean;
    type?: string;
    priority?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          notification: notifications,
          sender: users.firstName,
          senderLastName: users.lastName
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.senderId, users.id))
        .where(
          inArray(notifications.recipientIds, [userId])
        )
        .orderBy(desc(notifications.createdAt));

      if (filters?.unreadOnly) {
        query = query.where(eq(notifications.readAt, null));
      }

      if (filters?.type) {
        query = query.where(eq(notifications.type, filters.type));
      }

      if (filters?.priority) {
        query = query.where(eq(notifications.priority, filters.priority));
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const result = await query;
      logger.info(`✅ Notificacions obtingudes per usuari ${userId}: ${result.length}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obtenint notificacions d\'usuari:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    try {
      const [notification] = await db
        .update(notifications)
        .set({
          readAt: new Date(),
          readBy: [...(notifications.readBy || []), userId]
        })
        .where(eq(notifications.id, notificationId))
        .returning();

      logger.info(`✅ Notificació ${notificationId} marcada com llegida per ${userId}`);
      return notification;
    } catch (error) {
      logger.error('❌ Error marcant notificació com llegida:', error);
      throw error;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({
          readAt: new Date(),
          readBy: [...(notifications.readBy || []), userId]
        })
        .where(
          and(
            inArray(notifications.recipientIds, [userId]),
            eq(notifications.readAt, null)
          )
        );

      logger.info(`✅ Totes les notificacions marcades com llegides per ${userId}`);
    } catch (error) {
      logger.error('❌ Error marcant totes les notificacions com llegides:', error);
      throw error;
    }
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      // Verificar que el usuario es el destinatario o el remitente
      const notification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            inArray(notifications.recipientIds, [userId])
          )
        )
        .limit(1);

      if (!notification.length) {
        throw new Error('Notificació no trobada o sense permisos');
      }

      await db.delete(notifications).where(eq(notifications.id, notificationId));
      logger.info(`✅ Notificació ${notificationId} eliminada per ${userId}`);
    } catch (error) {
      logger.error('❌ Error eliminant notificació:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(inArray(notifications.recipientIds, [userId]));

      const stats: NotificationStats = {
        total: userNotifications.length,
        unread: userNotifications.filter(n => !n.readAt).length,
        read: userNotifications.filter(n => n.readAt).length,
        byType: {},
        byPriority: {}
      };

      // Agrupar por tipo
      userNotifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      });

      logger.info(`✅ Estadístiques de notificacions obtingudes per ${userId}`);
      return stats;
    } catch (error) {
      logger.error('❌ Error obtenint estadístiques de notificacions:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de guardia asignada
   */
  async sendGuardAssignmentNotification(guardId: number, substituteTeacherId: string): Promise<void> {
    try {
      const notificationData: NotificationData = {
        title: 'Nova guàrdia assignada',
        message: 'Se t\'ha assignat una nova guàrdia. Revisa els detalls i confirma la teva disponibilitat.',
        type: 'info',
        priority: 'medium',
        recipientIds: [substituteTeacherId],
        instituteId: '', // Se obtendrá del guard
        senderId: '', // Sistema
        metadata: {
          guardId,
          action: 'guard_assignment',
          requiresConfirmation: true
        }
      };

      await this.sendNotification(notificationData);
      logger.info(`📧 Notificació de guàrdia enviada a ${substituteTeacherId}`);
    } catch (error) {
      logger.error('❌ Error enviant notificació de guàrdia:', error);
    }
  }

  /**
   * Enviar notificación de asistencia requerida
   */
  async sendAttendanceReminderNotification(classId: string, teacherId: string): Promise<void> {
    try {
      const notificationData: NotificationData = {
        title: 'Recordatori d\'assistència',
        message: 'Recorda registrar l\'assistència de la teva classe avui.',
        type: 'warning',
        priority: 'medium',
        recipientIds: [teacherId],
        classIds: [classId],
        instituteId: '', // Se obtendrá del usuario
        senderId: '', // Sistema
        metadata: {
          classId,
          action: 'attendance_reminder',
          date: new Date().toISOString().split('T')[0]
        }
      };

      await this.sendNotification(notificationData);
      logger.info(`📧 Recordatori d'assistència enviat a ${teacherId}`);
    } catch (error) {
      logger.error('❌ Error enviant recordatori d\'assistència:', error);
    }
  }

  /**
   * Enviar notificación de evaluación pendiente
   */
  async sendEvaluationReminderNotification(teacherId: string, competencyType: string): Promise<void> {
    try {
      const notificationData: NotificationData = {
        title: 'Evaluació de competències pendent',
        message: `Tens una evaluació de competències ${competencyType} pendent de completar.`,
        type: 'warning',
        priority: 'medium',
        recipientIds: [teacherId],
        instituteId: '', // Se obtendrá del usuario
        senderId: '', // Sistema
        metadata: {
          competencyType,
          action: 'evaluation_reminder',
          requiresAction: true
        }
      };

      await this.sendNotification(notificationData);
      logger.info(`📧 Recordatori d'evaluació enviat a ${teacherId}`);
    } catch (error) {
      logger.error('❌ Error enviant recordatori d\'evaluació:', error);
    }
  }
}

export const communicationService = new CommunicationService(); 