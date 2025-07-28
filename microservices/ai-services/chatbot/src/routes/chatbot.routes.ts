import { Router } from 'express';
import { z } from 'zod';
import { ChatbotService } from '../services/chatbot.service.js';
import { logger, logChatbotError, logChatMessage, logChatSession } from '../utils/logger.js';

const router = Router();
const chatbotService = new ChatbotService();

// Schemas de validación
const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  context: z.object({
    courseId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    language: z.string().optional(),
    educationalLevel: z.enum(['primary', 'secondary', 'university', 'adult']).optional(),
    learningObjectives: z.array(z.string()).optional(),
    userPreferences: z.record(z.any()).optional(),
  }).optional(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(['image', 'document', 'audio', 'video']),
    url: z.string().url(),
    filename: z.string(),
    size: z.number(),
    mimeType: z.string(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4000).optional(),
    responseFormat: z.enum(['text', 'markdown', 'html']).optional(),
    includeContext: z.boolean().optional(),
    includeSuggestions: z.boolean().optional(),
    includeFollowUp: z.boolean().optional(),
    includeInsights: z.boolean().optional(),
    language: z.string().optional(),
    tone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
    educationalLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

const createSessionSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(100),
  context: z.object({
    courseId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    language: z.string().optional(),
    educationalLevel: z.enum(['primary', 'secondary', 'university', 'adult']).optional(),
    learningObjectives: z.array(z.string()).optional(),
    userPreferences: z.record(z.any()).optional(),
  }).optional(),
});

const personalitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  role: z.enum(['tutor', 'mentor', 'assistant', 'expert']),
  subject: z.string().optional(),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']),
  expertise: z.array(z.string()),
  language: z.string(),
  educationalLevel: z.enum(['primary', 'secondary', 'university', 'adult']),
  systemPrompt: z.string().min(1).max(1000),
  metadata: z.record(z.any()).optional(),
});

const feedbackSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
  category: z.enum(['helpful', 'unhelpful', 'confusing', 'technical', 'other']),
  metadata: z.record(z.any()).optional(),
});

// Rutas de chat
router.post('/chat', async (req, res) => {
  try {
    const validatedData = chatRequestSchema.parse(req.body);
    
    const response = await chatbotService.processMessage(validatedData);

    logChatMessage(
      validatedData.sessionId,
      validatedData.userId,
      'user',
      validatedData.message.length,
      response.processingTime
    );

    res.status(200).json({
      success: true,
      data: response,
      message: 'Message processed successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/chat', body: req.body });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de sesiones
router.post('/sessions', async (req, res) => {
  try {
    const validatedData = createSessionSchema.parse(req.body);
    
    const session = chatbotService.createSession(
      validatedData.userId,
      validatedData.title,
      validatedData.context
    );

    logChatSession('created', session.id, session.userId, {
      title: session.title,
      context: session.context,
    });

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/sessions', body: req.body });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = chatbotService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: session,
      message: 'Session retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: `/sessions/${req.params.sessionId}` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.put('/sessions/:sessionId/close', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = chatbotService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    chatbotService.closeSession(sessionId);

    logChatSession('closed', sessionId, session.userId, {
      messageCount: session.messageCount,
    });

    res.status(200).json({
      success: true,
      message: 'Session closed successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: `/sessions/${req.params.sessionId}/close` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de mensajes
router.get('/sessions/:sessionId/messages', (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    const session = chatbotService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    const messages = chatbotService.getSessionMessages(sessionId, limit);

    res.status(200).json({
      success: true,
      data: messages,
      message: 'Messages retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: `/sessions/${req.params.sessionId}/messages` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de personalidades
router.get('/personalities', (req, res) => {
  try {
    const personalities = chatbotService.getAllPersonalities();
    
    res.status(200).json({
      success: true,
      data: personalities,
      message: 'Personalities retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/personalities' });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.get('/personalities/:personalityId', (req, res) => {
  try {
    const { personalityId } = req.params;
    
    const personality = chatbotService.getPersonality(personalityId);
    
    if (!personality) {
      return res.status(404).json({
        success: false,
        error: 'Personality not found',
        message: 'The requested personality does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: personality,
      message: 'Personality retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: `/personalities/${req.params.personalityId}` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.post('/personalities', async (req, res) => {
  try {
    const validatedData = personalitySchema.parse(req.body);
    
    chatbotService.createPersonality(validatedData);

    logger.info('Personality created', {
      personalityId: validatedData.id,
      name: validatedData.name,
      role: validatedData.role,
    });

    res.status(201).json({
      success: true,
      data: validatedData,
      message: 'Personality created successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/personalities', body: req.body });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de flujos de conversación
router.get('/flows', (req, res) => {
  try {
    const flows = chatbotService.getAllFlows();
    
    res.status(200).json({
      success: true,
      data: flows,
      message: 'Flows retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/flows' });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.get('/flows/:flowId', (req, res) => {
  try {
    const { flowId } = req.params;
    
    const flow = chatbotService.getFlow(flowId);
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'Flow not found',
        message: 'The requested flow does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: flow,
      message: 'Flow retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: `/flows/${req.params.flowId}` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de feedback
router.post('/feedback', async (req, res) => {
  try {
    const validatedData = feedbackSchema.parse(req.body);
    
    chatbotService.submitFeedback(validatedData);

    logger.info('Feedback submitted', {
      sessionId: validatedData.sessionId,
      userId: validatedData.userId,
      rating: validatedData.rating,
      category: validatedData.category,
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/feedback', body: req.body });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de análisis
router.get('/sessions/:sessionId/analytics', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const analytics = chatbotService.getAnalytics(sessionId);
    
    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Analytics not found',
        message: 'Analytics for the requested session do not exist',
      });
    }

    logger.info('Analytics retrieved', {
      sessionId,
      userId: analytics.userId,
      messageCount: analytics.messageCount,
      topics: analytics.topics,
    });

    res.status(200).json({
      success: true,
      data: analytics,
      message: 'Analytics retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: `/sessions/${req.params.sessionId}/analytics` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de información del servicio
router.get('/metrics', (req, res) => {
  try {
    const metrics = chatbotService.getMetrics();
    
    res.status(200).json({
      success: true,
      data: metrics,
      message: 'Service metrics retrieved successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/metrics' });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.get('/health', (req, res) => {
  try {
    const health = chatbotService.getHealth();
    
    res.status(200).json({
      success: true,
      data: health,
      message: 'Health check completed successfully',
    });
  } catch (error) {
    logChatbotError(error, { endpoint: '/health' });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Chatbot Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router; 