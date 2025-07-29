import { Router } from 'express';
import { z } from 'zod';
import { communicationService } from '../services/communication.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const notificationSchema = z.object({
  userId: z.number().positive(),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(['info', 'warning', 'error', 'success', 'alert']),
  category: z.string().min(1).max(100),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.object({
    actionUrl: z.string().url().optional(),
    actionText: z.string().optional(),
    icon: z.string().optional(),
    sound: z.boolean().optional(),
    vibration: z.boolean().optional(),
    badge: z.number().optional(),
  }).optional(),
});

const messageSchema = z.object({
  senderId: z.number().positive(),
  receiverId: z.number().positive(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file', 'audio', 'video']).optional(),
  metadata: z.object({
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    thumbnail: z.string().optional(),
    duration: z.number().optional(),
  }).optional(),
});

const conversationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['direct', 'group', 'channel']).optional(),
  description: z.string().optional(),
  metadata: z.object({
    avatar: z.string().optional(),
    settings: z.object({
      notifications: z.boolean().optional(),
      muteUntil: z.string().optional(),
      theme: z.string().optional(),
    }).optional(),
  }).optional(),
});

const conversationMessageSchema = z.object({
  conversationId: z.number().positive(),
  senderId: z.number().positive(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file', 'audio', 'video', 'system']).optional(),
  replyToId: z.number().positive().optional(),
  metadata: z.object({
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    thumbnail: z.string().optional(),
    duration: z.number().optional(),
    mentions: z.array(z.number()).optional(),
    reactions: z.record(z.string(), z.array(z.number())).optional(),
  }).optional(),
});

const surveySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['academic', 'feedback', 'evaluation', 'general']),
  status: z.enum(['draft', 'active', 'paused', 'closed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isAnonymous: z.boolean().optional(),
  allowMultipleResponses: z.boolean().optional(),
  targetAudience: z.object({
    roles: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    userIds: z.array(z.number()).optional(),
    allUsers: z.boolean().optional(),
  }).optional(),
  settings: z.object({
    showProgress: z.boolean().optional(),
    randomizeQuestions: z.boolean().optional(),
    timeLimit: z.number().optional(),
    requireLogin: z.boolean().optional(),
  }).optional(),
  createdBy: z.number().positive(),
});

const surveyQuestionSchema = z.object({
  surveyId: z.number().positive(),
  question: z.string().min(1),
  type: z.enum(['text', 'textarea', 'radio', 'checkbox', 'select', 'rating', 'date']),
  isRequired: z.boolean().optional(),
  order: z.number().positive(),
  options: z.object({
    choices: z.array(z.string()).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    step: z.number().optional(),
    placeholder: z.string().optional(),
    validation: z.object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
    }).optional(),
  }).optional(),
});

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(['general', 'academic', 'event', 'emergency', 'maintenance']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isPinned: z.boolean().optional(),
  targetAudience: z.object({
    roles: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    userIds: z.array(z.number()).optional(),
    allUsers: z.boolean().optional(),
  }).optional(),
  createdBy: z.number().positive(),
  metadata: z.object({
    imageUrl: z.string().url().optional(),
    attachments: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    allowComments: z.boolean().optional(),
  }).optional(),
});

// ===== RUTAS DE NOTIFICACIONES =====

/**
 * POST /notifications
 * Crear una nueva notificación
 */
router.post('/notifications', async (req, res) => {
  try {
    const validatedData = notificationSchema.parse(req.body);
    const notification = await communicationService.createNotification(validatedData);
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating notification:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

/**
 * POST /notifications/bulk
 * Crear notificaciones masivas
 */
router.post('/notifications/bulk', async (req, res) => {
  try {
    const { userIds, notificationData } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be a non-empty array'
      });
    }
    
    const validatedData = notificationSchema.omit({ userId: true }).parse(notificationData);
    const notifications = await communicationService.createBulkNotifications(userIds, validatedData);
    
    res.status(201).json({
      success: true,
      data: notifications,
      message: `Bulk notifications created successfully for ${notifications.length} users`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating bulk notifications:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating bulk notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bulk notifications'
    });
  }
});

/**
 * GET /notifications/user/:userId
 * Obtener notificaciones de un usuario
 */
router.get('/notifications/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { status, type, category, isRead, limit, offset } = req.query;
    
    const filters = {
      status: status as string,
      type: type as string,
      category: category as string,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await communicationService.getUserNotifications(userId, filters);
    
    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user notifications'
    });
  }
});

/**
 * PUT /notifications/:id/read
 * Marcar notificación como leída
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const notification = await communicationService.markNotificationAsRead(id);
    
    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * PUT /notifications/user/:userId/read-all
 * Marcar todas las notificaciones de un usuario como leídas
 */
router.put('/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    await communicationService.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// ===== RUTAS DE MENSAJES =====

/**
 * POST /messages
 * Enviar un mensaje
 */
router.post('/messages', async (req, res) => {
  try {
    const validatedData = messageSchema.parse(req.body);
    const message = await communicationService.sendMessage(validatedData);
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error sending message:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * GET /messages/conversation/:userId1/:userId2
 * Obtener conversación entre dos usuarios
 */
router.get('/messages/conversation/:userId1/:userId2', async (req, res) => {
  try {
    const userId1 = parseInt(req.params.userId1);
    const userId2 = parseInt(req.params.userId2);
    const { limit, offset } = req.query;
    
    const filters = {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await communicationService.getConversation(userId1, userId2, filters);
    
    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation'
    });
  }
});

/**
 * PUT /messages/:id/read
 * Marcar mensaje como leído
 */
router.put('/messages/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const message = await communicationService.markMessageAsRead(id);
    
    res.json({
      success: true,
      data: message,
      message: 'Message marked as read'
    });
  } catch (error) {
    logger.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

// ===== RUTAS DE CONVERSACIONES =====

/**
 * POST /conversations
 * Crear una nueva conversación
 */
router.post('/conversations', async (req, res) => {
  try {
    const validatedData = conversationSchema.parse(req.body);
    const conversation = await communicationService.createConversation(validatedData);
    
    res.status(201).json({
      success: true,
      data: conversation,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating conversation:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

/**
 * POST /conversations/:conversationId/messages
 * Enviar mensaje a conversación
 */
router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const validatedData = conversationMessageSchema.parse({
      ...req.body,
      conversationId
    });
    
    const message = await communicationService.sendConversationMessage(validatedData);
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Conversation message sent successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error sending conversation message:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error sending conversation message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send conversation message'
    });
  }
});

/**
 * GET /conversations/:conversationId/messages
 * Obtener mensajes de una conversación
 */
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { limit, offset } = req.query;
    
    const filters = {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await communicationService.getConversationMessages(conversationId, filters);
    
    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting conversation messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation messages'
    });
  }
});

// ===== RUTAS DE ENCUESTAS =====

/**
 * POST /surveys
 * Crear una nueva encuesta
 */
router.post('/surveys', async (req, res) => {
  try {
    const validatedData = surveySchema.parse(req.body);
    const survey = await communicationService.createSurvey(validatedData);
    
    res.status(201).json({
      success: true,
      data: survey,
      message: 'Survey created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating survey:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating survey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create survey'
    });
  }
});

/**
 * POST /surveys/:surveyId/questions
 * Agregar pregunta a encuesta
 */
router.post('/surveys/:surveyId/questions', async (req, res) => {
  try {
    const surveyId = parseInt(req.params.surveyId);
    const validatedData = surveyQuestionSchema.parse({
      ...req.body,
      surveyId
    });
    
    const question = await communicationService.addSurveyQuestion(validatedData);
    
    res.status(201).json({
      success: true,
      data: question,
      message: 'Survey question added successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error adding survey question:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error adding survey question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add survey question'
    });
  }
});

/**
 * GET /surveys/active
 * Obtener encuestas activas
 */
router.get('/surveys/active', async (req, res) => {
  try {
    const surveys = await communicationService.getActiveSurveys();
    
    res.json({
      success: true,
      data: surveys,
      message: 'Active surveys retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting active surveys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active surveys'
    });
  }
});

// ===== RUTAS DE ANUNCIOS =====

/**
 * POST /announcements
 * Crear un nuevo anuncio
 */
router.post('/announcements', async (req, res) => {
  try {
    const validatedData = announcementSchema.parse(req.body);
    const announcement = await communicationService.createAnnouncement(validatedData);
    
    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error creating announcement:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement'
    });
  }
});

/**
 * GET /announcements/active
 * Obtener anuncios activos
 */
router.get('/announcements/active', async (req, res) => {
  try {
    const { type, priority, limit, offset } = req.query;
    
    const filters = {
      type: type as string,
      priority: priority as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const result = await communicationService.getActiveAnnouncements(filters);
    
    res.json({
      success: true,
      data: result.announcements,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < result.total
      }
    });
  } catch (error) {
    logger.error('Error getting active announcements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active announcements'
    });
  }
});

// ===== RUTAS DE ESTADÍSTICAS =====

/**
 * GET /stats
 * Obtener estadísticas de comunicación
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await communicationService.getCommunicationStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Communication statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting communication stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get communication statistics'
    });
  }
});

export default router;