import { db } from '../database';
import { 
  notifications, messages, conversations, conversationParticipants, conversationMessages,
  surveys, surveyQuestions, surveyResponses, surveyAnswers,
  announcements, announcementComments, notificationTemplates, userNotificationSettings, communicationLogs
} from '../schema';
import { eq, and, like, desc, asc, gte, lte, inArray, between, or, isNull, isNotNull } from 'drizzle-orm';
import { 
  NewNotification, Notification, NewMessage, Message, NewConversation, Conversation,
  NewConversationParticipant, ConversationParticipant, NewConversationMessage, ConversationMessage,
  NewSurvey, Survey, NewSurveyQuestion, SurveyQuestion, NewSurveyResponse, SurveyResponse,
  NewSurveyAnswer, SurveyAnswer, NewAnnouncement, Announcement, NewAnnouncementComment,
  AnnouncementComment, NewNotificationTemplate, NotificationTemplate, NewUserNotificationSetting,
  UserNotificationSetting, NewCommunicationLog, CommunicationLog
} from '../schema';
import { logger } from '../utils/logger';

export class CommunicationService {
  // ===== GESTIÓN DE NOTIFICACIONES =====
  
  /**
   * Crear una nueva notificación
   */
  async createNotification(notificationData: NewNotification): Promise<Notification> {
    try {
      const [newNotification] = await db.insert(notifications).values(notificationData).returning();
      logger.info(`Notification created: ${newNotification.id} for user ${notificationData.userId}`);
      return newNotification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Crear notificaciones masivas
   */
  async createBulkNotifications(
    userIds: number[],
    notificationData: Omit<NewNotification, 'userId'>
  ): Promise<Notification[]> {
    try {
      const notificationsToCreate = userIds.map(userId => ({
        ...notificationData,
        userId
      }));

      const newNotifications = await db.insert(notifications).values(notificationsToCreate).returning();
      logger.info(`Bulk notifications created: ${newNotifications.length} notifications`);
      return newNotifications;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw new Error('Failed to create bulk notifications');
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async getUserNotifications(
    userId: number,
    filters: {
      status?: string;
      type?: string;
      category?: string;
      isRead?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const { status, type, category, isRead, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [eq(notifications.userId, userId)];
      
      if (status) whereConditions.push(eq(notifications.status, status));
      if (type) whereConditions.push(eq(notifications.type, type));
      if (category) whereConditions.push(eq(notifications.category, category));
      if (isRead !== undefined) whereConditions.push(eq(notifications.isRead, isRead));

      const notificationsList = await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(notifications)
        .where(and(...whereConditions));

      return {
        notifications: notificationsList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw new Error('Failed to get user notifications');
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markNotificationAsRead(id: number): Promise<Notification> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          status: 'read',
          updatedAt: new Date() 
        })
        .where(eq(notifications.id, id))
        .returning();
      
      logger.info(`Notification marked as read: ${id}`);
      return updatedNotification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   */
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          status: 'read',
          updatedAt: new Date() 
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      logger.info(`All notifications marked as read for user: ${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  // ===== GESTIÓN DE MENSAJES =====
  
  /**
   * Enviar un mensaje
   */
  async sendMessage(messageData: NewMessage): Promise<Message> {
    try {
      const [newMessage] = await db.insert(messages).values(messageData).returning();
      logger.info(`Message sent: ${newMessage.id} from ${messageData.senderId} to ${messageData.receiverId}`);
      return newMessage;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Obtener conversación entre dos usuarios
   */
  async getConversation(
    userId1: number,
    userId2: number,
    filters: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ messages: Message[]; total: number }> {
    try {
      const { limit = 50, offset = 0 } = filters;
      
      const messagesList = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        );

      return {
        messages: messagesList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw new Error('Failed to get conversation');
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markMessageAsRead(id: number): Promise<Message> {
    try {
      const [updatedMessage] = await db
        .update(messages)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          status: 'read',
          updatedAt: new Date() 
        })
        .where(eq(messages.id, id))
        .returning();
      
      logger.info(`Message marked as read: ${id}`);
      return updatedMessage;
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  // ===== GESTIÓN DE CONVERSACIONES GRUPALES =====
  
  /**
   * Crear una nueva conversación
   */
  async createConversation(conversationData: NewConversation): Promise<Conversation> {
    try {
      const [newConversation] = await db.insert(conversations).values(conversationData).returning();
      logger.info(`Conversation created: ${newConversation.id} - ${newConversation.name}`);
      return newConversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Agregar participante a conversación
   */
  async addParticipant(participantData: NewConversationParticipant): Promise<ConversationParticipant> {
    try {
      const [newParticipant] = await db.insert(conversationParticipants).values(participantData).returning();
      logger.info(`Participant added: ${newParticipant.userId} to conversation ${participantData.conversationId}`);
      return newParticipant;
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw new Error('Failed to add participant');
    }
  }

  /**
   * Enviar mensaje a conversación
   */
  async sendConversationMessage(messageData: NewConversationMessage): Promise<ConversationMessage> {
    try {
      const [newMessage] = await db.insert(conversationMessages).values(messageData).returning();
      logger.info(`Conversation message sent: ${newMessage.id} in conversation ${messageData.conversationId}`);
      return newMessage;
    } catch (error) {
      logger.error('Error sending conversation message:', error);
      throw new Error('Failed to send conversation message');
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getConversationMessages(
    conversationId: number,
    filters: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ messages: ConversationMessage[]; total: number }> {
    try {
      const { limit = 50, offset = 0 } = filters;
      
      const messagesList = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId));

      return {
        messages: messagesList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting conversation messages:', error);
      throw new Error('Failed to get conversation messages');
    }
  }

  // ===== GESTIÓN DE ENCUESTAS =====
  
  /**
   * Crear una nueva encuesta
   */
  async createSurvey(surveyData: NewSurvey): Promise<Survey> {
    try {
      const [newSurvey] = await db.insert(surveys).values(surveyData).returning();
      logger.info(`Survey created: ${newSurvey.id} - ${newSurvey.title}`);
      return newSurvey;
    } catch (error) {
      logger.error('Error creating survey:', error);
      throw new Error('Failed to create survey');
    }
  }

  /**
   * Agregar pregunta a encuesta
   */
  async addSurveyQuestion(questionData: NewSurveyQuestion): Promise<SurveyQuestion> {
    try {
      const [newQuestion] = await db.insert(surveyQuestions).values(questionData).returning();
      logger.info(`Survey question added: ${newQuestion.id} to survey ${questionData.surveyId}`);
      return newQuestion;
    } catch (error) {
      logger.error('Error adding survey question:', error);
      throw new Error('Failed to add survey question');
    }
  }

  /**
   * Obtener encuestas activas
   */
  async getActiveSurveys(): Promise<Survey[]> {
    try {
      const now = new Date();
      return await db
        .select()
        .from(surveys)
        .where(
          and(
            eq(surveys.status, 'active'),
            or(
              isNull(surveys.startDate),
              lte(surveys.startDate, now)
            ),
            or(
              isNull(surveys.endDate),
              gte(surveys.endDate, now)
            )
          )
        )
        .orderBy(desc(surveys.createdAt));
    } catch (error) {
      logger.error('Error getting active surveys:', error);
      throw new Error('Failed to get active surveys');
    }
  }

  /**
   * Enviar respuesta de encuesta
   */
  async submitSurveyResponse(responseData: NewSurveyResponse): Promise<SurveyResponse> {
    try {
      const [newResponse] = await db.insert(surveyResponses).values(responseData).returning();
      logger.info(`Survey response submitted: ${newResponse.id} for survey ${responseData.surveyId}`);
      return newResponse;
    } catch (error) {
      logger.error('Error submitting survey response:', error);
      throw new Error('Failed to submit survey response');
    }
  }

  /**
   * Agregar respuesta individual
   */
  async addSurveyAnswer(answerData: NewSurveyAnswer): Promise<SurveyAnswer> {
    try {
      const [newAnswer] = await db.insert(surveyAnswers).values(answerData).returning();
      logger.info(`Survey answer added: ${newAnswer.id} for question ${answerData.questionId}`);
      return newAnswer;
    } catch (error) {
      logger.error('Error adding survey answer:', error);
      throw new Error('Failed to add survey answer');
    }
  }

  // ===== GESTIÓN DE ANUNCIOS =====
  
  /**
   * Crear un nuevo anuncio
   */
  async createAnnouncement(announcementData: NewAnnouncement): Promise<Announcement> {
    try {
      const [newAnnouncement] = await db.insert(announcements).values(announcementData).returning();
      logger.info(`Announcement created: ${newAnnouncement.id} - ${newAnnouncement.title}`);
      return newAnnouncement;
    } catch (error) {
      logger.error('Error creating announcement:', error);
      throw new Error('Failed to create announcement');
    }
  }

  /**
   * Obtener anuncios activos
   */
  async getActiveAnnouncements(
    filters: {
      type?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ announcements: Announcement[]; total: number }> {
    try {
      const { type, priority, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [eq(announcements.status, 'published')];
      
      if (type) whereConditions.push(eq(announcements.type, type));
      if (priority) whereConditions.push(eq(announcements.priority, priority));

      const announcementsList = await db
        .select()
        .from(announcements)
        .where(and(...whereConditions))
        .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(announcements)
        .where(and(...whereConditions));

      return {
        announcements: announcementsList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting active announcements:', error);
      throw new Error('Failed to get active announcements');
    }
  }

  /**
   * Agregar comentario a anuncio
   */
  async addAnnouncementComment(commentData: NewAnnouncementComment): Promise<AnnouncementComment> {
    try {
      const [newComment] = await db.insert(announcementComments).values(commentData).returning();
      logger.info(`Announcement comment added: ${newComment.id} to announcement ${commentData.announcementId}`);
      return newComment;
    } catch (error) {
      logger.error('Error adding announcement comment:', error);
      throw new Error('Failed to add announcement comment');
    }
  }

  // ===== GESTIÓN DE PLANTILLAS =====
  
  /**
   * Crear plantilla de notificación
   */
  async createNotificationTemplate(templateData: NewNotificationTemplate): Promise<NotificationTemplate> {
    try {
      const [newTemplate] = await db.insert(notificationTemplates).values(templateData).returning();
      logger.info(`Notification template created: ${newTemplate.id} - ${newTemplate.name}`);
      return newTemplate;
    } catch (error) {
      logger.error('Error creating notification template:', error);
      throw new Error('Failed to create notification template');
    }
  }

  /**
   * Obtener plantillas activas
   */
  async getActiveTemplates(type?: string): Promise<NotificationTemplate[]> {
    try {
      let whereConditions = [eq(notificationTemplates.isActive, true)];
      
      if (type) whereConditions.push(eq(notificationTemplates.type, type));

      return await db
        .select()
        .from(notificationTemplates)
        .where(and(...whereConditions))
        .orderBy(asc(notificationTemplates.name));
    } catch (error) {
      logger.error('Error getting active templates:', error);
      throw new Error('Failed to get active templates');
    }
  }

  // ===== CONFIGURACIÓN DE USUARIOS =====
  
  /**
   * Obtener configuración de notificaciones de usuario
   */
  async getUserNotificationSettings(userId: number): Promise<UserNotificationSetting[]> {
    try {
      return await db
        .select()
        .from(userNotificationSettings)
        .where(eq(userNotificationSettings.userId, userId))
        .orderBy(asc(userNotificationSettings.type), asc(userNotificationSettings.category));
    } catch (error) {
      logger.error('Error getting user notification settings:', error);
      throw new Error('Failed to get user notification settings');
    }
  }

  /**
   * Actualizar configuración de notificaciones
   */
  async updateUserNotificationSettings(
    userId: number,
    type: string,
    category: string,
    settings: Partial<NewUserNotificationSetting>
  ): Promise<UserNotificationSetting> {
    try {
      const [updatedSetting] = await db
        .update(userNotificationSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(
          and(
            eq(userNotificationSettings.userId, userId),
            eq(userNotificationSettings.type, type),
            eq(userNotificationSettings.category, category)
          )
        )
        .returning();
      
      logger.info(`User notification settings updated: ${userId} - ${type} - ${category}`);
      return updatedSetting;
    } catch (error) {
      logger.error('Error updating user notification settings:', error);
      throw new Error('Failed to update user notification settings');
    }
  }

  // ===== LOGGING =====
  
  /**
   * Registrar log de comunicación
   */
  async logCommunication(logData: NewCommunicationLog): Promise<CommunicationLog> {
    try {
      const [newLog] = await db.insert(communicationLogs).values(logData).returning();
      return newLog;
    } catch (error) {
      logger.error('Error logging communication:', error);
      throw new Error('Failed to log communication');
    }
  }

  // ===== ESTADÍSTICAS =====
  
  /**
   * Obtener estadísticas de comunicación
   */
  async getCommunicationStats(): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    totalMessages: number;
    unreadMessages: number;
    activeConversations: number;
    activeSurveys: number;
    activeAnnouncements: number;
  }> {
    try {
      const [
        { count: totalNotifications },
        { count: unreadNotifications },
        { count: totalMessages },
        { count: unreadMessages },
        { count: activeConversations },
        { count: activeSurveys },
        { count: activeAnnouncements }
      ] = await Promise.all([
        db.select({ count: db.fn.count() }).from(notifications),
        db.select({ count: db.fn.count() }).from(notifications).where(eq(notifications.isRead, false)),
        db.select({ count: db.fn.count() }).from(messages),
        db.select({ count: db.fn.count() }).from(messages).where(eq(messages.isRead, false)),
        db.select({ count: db.fn.count() }).from(conversations).where(eq(conversations.isActive, true)),
        db.select({ count: db.fn.count() }).from(surveys).where(eq(surveys.status, 'active')),
        db.select({ count: db.fn.count() }).from(announcements).where(eq(announcements.status, 'published'))
      ]);

      return {
        totalNotifications: Number(totalNotifications),
        unreadNotifications: Number(unreadNotifications),
        totalMessages: Number(totalMessages),
        unreadMessages: Number(unreadMessages),
        activeConversations: Number(activeConversations),
        activeSurveys: Number(activeSurveys),
        activeAnnouncements: Number(activeAnnouncements)
      };
    } catch (error) {
      logger.error('Error getting communication stats:', error);
      throw new Error('Failed to get communication stats');
    }
  }
}

export const communicationService = new CommunicationService();