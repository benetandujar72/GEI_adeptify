import { Router } from 'express';
import { z } from 'zod';
import { ContentGenerationService } from '../services/content-generation.service.js';
import { logger } from '../utils/logger.js';

const router = Router();
const contentService = new ContentGenerationService();

// Schemas de validación
const contentGenerationSchema = z.object({
  type: z.enum(['lesson', 'quiz', 'assignment', 'summary', 'explanation', 'custom']),
  subject: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade is required'),
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.string().min(2, 'Language is required'),
  format: z.enum(['text', 'markdown', 'html', 'pdf', 'json']),
  length: z.enum(['short', 'medium', 'long']),
  style: z.enum(['formal', 'casual', 'academic', 'conversational']),
  includeExamples: z.boolean(),
  includeExercises: z.boolean(),
  includeImages: z.boolean(),
  customPrompt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const quizGenerationSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  grade: z.string().min(1, 'Grade is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionTypes: z.array(z.enum(['multiple-choice', 'true-false', 'short-answer', 'essay'])),
  numberOfQuestions: z.number().min(1).max(50),
  language: z.string().min(2, 'Language is required'),
  includeExplanations: z.boolean(),
  timeLimit: z.number().optional(),
  customPrompt: z.string().optional(),
});

const assignmentGenerationSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  grade: z.string().min(1, 'Grade is required'),
  type: z.enum(['homework', 'project', 'research', 'presentation', 'lab']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.enum(['short', 'medium', 'long']),
  groupSize: z.number().optional(),
  includeRubric: z.boolean(),
  includeResources: z.boolean(),
  language: z.string().min(2, 'Language is required'),
  customPrompt: z.string().optional(),
});

const summaryGenerationSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters'),
  type: z.enum(['text', 'document', 'url']),
  format: z.enum(['bullet-points', 'paragraph', 'key-points']),
  length: z.enum(['short', 'medium', 'long']),
  language: z.string().min(2, 'Language is required'),
  includeKeyPoints: z.boolean(),
  includeQuestions: z.boolean(),
  customPrompt: z.string().optional(),
});

const explanationGenerationSchema = z.object({
  concept: z.string().min(1, 'Concept is required'),
  subject: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade is required'),
  style: z.enum(['simple', 'detailed', 'step-by-step', 'visual']),
  includeExamples: z.boolean(),
  includeAnalogies: z.boolean(),
  includeVisualAids: z.boolean(),
  language: z.string().min(2, 'Language is required'),
  customPrompt: z.string().optional(),
});

const translationSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  sourceLanguage: z.string().min(2, 'Source language is required'),
  targetLanguage: z.string().min(2, 'Target language is required'),
  preserveFormatting: z.boolean(),
  includeGlossary: z.boolean(),
  customInstructions: z.string().optional(),
});

const adaptationSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  targetAudience: z.string().min(1, 'Target audience is required'),
  adaptationType: z.enum(['simplify', 'expand', 'localize', 'personalize']),
  parameters: z.record(z.any()),
  preserveOriginal: z.boolean(),
  customInstructions: z.string().optional(),
});

const qualityCheckSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  content: z.string().min(1, 'Content is required'),
});

// Rutas de generación de contenido

/**
 * @route POST /content/generate
 * @desc Generar contenido educativo
 */
router.post('/generate', async (req, res) => {
  try {
    const validatedData = contentGenerationSchema.parse(req.body);
    
    logger.info('Content generation request received', {
      type: validatedData.type,
      subject: validatedData.subject,
      topic: validatedData.topic,
    });

    const result = await contentService.generateContent(validatedData);
    
    logger.info('Content generation completed successfully', {
      id: result.id,
      type: validatedData.type,
      subject: validatedData.subject,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Content generated successfully',
    });
  } catch (error) {
    logger.error('Content generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/quiz
 * @desc Generar quiz educativo
 */
router.post('/quiz', async (req, res) => {
  try {
    const validatedData = quizGenerationSchema.parse(req.body);
    
    logger.info('Quiz generation request received', {
      subject: validatedData.subject,
      topic: validatedData.topic,
      numberOfQuestions: validatedData.numberOfQuestions,
    });

    const result = await contentService.generateQuiz(validatedData);
    
    logger.info('Quiz generation completed successfully', {
      id: result.id,
      subject: validatedData.subject,
      topic: validatedData.topic,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Quiz generated successfully',
    });
  } catch (error) {
    logger.error('Quiz generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate quiz',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/assignment
 * @desc Generar tarea/assignment
 */
router.post('/assignment', async (req, res) => {
  try {
    const validatedData = assignmentGenerationSchema.parse(req.body);
    
    logger.info('Assignment generation request received', {
      type: validatedData.type,
      subject: validatedData.subject,
      topic: validatedData.topic,
    });

    const result = await contentService.generateAssignment(validatedData);
    
    logger.info('Assignment generation completed successfully', {
      id: result.id,
      type: validatedData.type,
      subject: validatedData.subject,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Assignment generated successfully',
    });
  } catch (error) {
    logger.error('Assignment generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/summary
 * @desc Generar resumen
 */
router.post('/summary', async (req, res) => {
  try {
    const validatedData = summaryGenerationSchema.parse(req.body);
    
    logger.info('Summary generation request received', {
      type: validatedData.type,
      format: validatedData.format,
      contentLength: validatedData.content.length,
    });

    const result = await contentService.generateSummary(validatedData);
    
    logger.info('Summary generation completed successfully', {
      id: result.id,
      type: validatedData.type,
      format: validatedData.format,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Summary generated successfully',
    });
  } catch (error) {
    logger.error('Summary generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/explanation
 * @desc Generar explicación
 */
router.post('/explanation', async (req, res) => {
  try {
    const validatedData = explanationGenerationSchema.parse(req.body);
    
    logger.info('Explanation generation request received', {
      concept: validatedData.concept,
      subject: validatedData.subject,
      style: validatedData.style,
    });

    const result = await contentService.generateExplanation(validatedData);
    
    logger.info('Explanation generation completed successfully', {
      id: result.id,
      concept: validatedData.concept,
      subject: validatedData.subject,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Explanation generated successfully',
    });
  } catch (error) {
    logger.error('Explanation generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate explanation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/translate
 * @desc Traducir contenido
 */
router.post('/translate', async (req, res) => {
  try {
    const validatedData = translationSchema.parse(req.body);
    
    logger.info('Content translation request received', {
      sourceLanguage: validatedData.sourceLanguage,
      targetLanguage: validatedData.targetLanguage,
      contentLength: validatedData.content.length,
    });

    const result = await contentService.translateContent(validatedData);
    
    logger.info('Content translation completed successfully', {
      id: result.id,
      sourceLanguage: validatedData.sourceLanguage,
      targetLanguage: validatedData.targetLanguage,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Content translated successfully',
    });
  } catch (error) {
    logger.error('Content translation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to translate content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/adapt
 * @desc Adaptar contenido
 */
router.post('/adapt', async (req, res) => {
  try {
    const validatedData = adaptationSchema.parse(req.body);
    
    logger.info('Content adaptation request received', {
      adaptationType: validatedData.adaptationType,
      targetAudience: validatedData.targetAudience,
      contentLength: validatedData.content.length,
    });

    const result = await contentService.adaptContent(validatedData);
    
    logger.info('Content adaptation completed successfully', {
      id: result.id,
      adaptationType: validatedData.adaptationType,
      targetAudience: validatedData.targetAudience,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Content adapted successfully',
    });
  } catch (error) {
    logger.error('Content adaptation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to adapt content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /content/quality-check
 * @desc Verificar calidad del contenido
 */
router.post('/quality-check', async (req, res) => {
  try {
    const validatedData = qualityCheckSchema.parse(req.body);
    
    logger.info('Content quality check request received', {
      contentId: validatedData.contentId,
      contentLength: validatedData.content.length,
    });

    const result = await contentService.checkContentQuality(
      validatedData.contentId,
      validatedData.content
    );
    
    logger.info('Content quality check completed successfully', {
      contentId: validatedData.contentId,
      overallScore: result.overallScore,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Content quality check completed',
    });
  } catch (error) {
    logger.error('Content quality check failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to check content quality',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /content/metrics
 * @desc Obtener métricas del servicio
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = contentService.getMetrics();
    
    logger.info('Metrics request received');

    res.status(200).json({
      success: true,
      data: metrics,
      message: 'Metrics retrieved successfully',
    });
  } catch (error) {
    logger.error('Failed to get metrics:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /content/health
 * @desc Health check del servicio
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Content Generation Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * @route GET /content
 * @desc Documentación de la API
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Content Generation Service API',
    version: '1.0.0',
    endpoints: {
      'POST /generate': 'Generate educational content',
      'POST /quiz': 'Generate educational quiz',
      'POST /assignment': 'Generate educational assignment',
      'POST /summary': 'Generate content summary',
      'POST /explanation': 'Generate concept explanation',
      'POST /translate': 'Translate content',
      'POST /adapt': 'Adapt content for different audiences',
      'POST /quality-check': 'Check content quality',
      'GET /metrics': 'Get service metrics',
      'GET /health': 'Health check',
    },
    examples: {
      contentGeneration: {
        type: 'lesson',
        subject: 'Mathematics',
        grade: '10',
        topic: 'Quadratic Equations',
        difficulty: 'intermediate',
        language: 'es',
        format: 'markdown',
        length: 'medium',
        style: 'academic',
        includeExamples: true,
        includeExercises: true,
        includeImages: false,
      },
      quizGeneration: {
        subject: 'Science',
        topic: 'Photosynthesis',
        grade: '8',
        difficulty: 'medium',
        questionTypes: ['multiple-choice', 'true-false'],
        numberOfQuestions: 10,
        language: 'es',
        includeExplanations: true,
      },
    },
  });
});

export default router; 