import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { validateRequest } from '../middleware/validation';
import { 
  ContentGenerationRequestSchema,
  AnalyticsRequestSchema,
  PersonalizationRequestSchema,
  TrainingRequestSchema,
  PredictionRequestSchema
} from '../types/ai';

// ============================================================================
// AI ROUTES
// ============================================================================

const router = Router();

// ============================================================================
// CONTENT GENERATION ROUTES
// ============================================================================

/**
 * @route POST /api/ai/content
 * @desc Generate any type of educational content
 * @access Private
 */
router.post('/content', 
  validateRequest(ContentGenerationRequestSchema),
  aiController.generateContent.bind(aiController)
);

/**
 * @route POST /api/ai/content/lesson
 * @desc Generate educational lessons
 * @access Private
 */
router.post('/content/lesson',
  validateRequest(ContentGenerationRequestSchema),
  aiController.generateLesson.bind(aiController)
);

/**
 * @route POST /api/ai/content/quiz
 * @desc Generate educational quizzes
 * @access Private
 */
router.post('/content/quiz',
  validateRequest(ContentGenerationRequestSchema),
  aiController.generateQuiz.bind(aiController)
);

/**
 * @route POST /api/ai/content/exercise
 * @desc Generate educational exercises
 * @access Private
 */
router.post('/content/exercise',
  validateRequest(ContentGenerationRequestSchema),
  aiController.generateExercise.bind(aiController)
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * @route POST /api/ai/analytics
 * @desc Generate analytics for any type
 * @access Private
 */
router.post('/analytics',
  validateRequest(AnalyticsRequestSchema),
  aiController.generateAnalytics.bind(aiController)
);

/**
 * @route POST /api/ai/analytics/performance
 * @desc Get performance analytics
 * @access Private
 */
router.post('/analytics/performance',
  validateRequest(AnalyticsRequestSchema),
  aiController.getPerformanceAnalytics.bind(aiController)
);

/**
 * @route POST /api/ai/analytics/engagement
 * @desc Get engagement analytics
 * @access Private
 */
router.post('/analytics/engagement',
  validateRequest(AnalyticsRequestSchema),
  aiController.getEngagementAnalytics.bind(aiController)
);

/**
 * @route POST /api/ai/analytics/predictions
 * @desc Get predictive analytics
 * @access Private
 */
router.post('/analytics/predictions',
  validateRequest(AnalyticsRequestSchema),
  aiController.getPredictions.bind(aiController)
);

// ============================================================================
// PERSONALIZATION ROUTES
// ============================================================================

/**
 * @route POST /api/ai/personalization
 * @desc Personalize content for any type
 * @access Private
 */
router.post('/personalization',
  validateRequest(PersonalizationRequestSchema),
  aiController.personalizeContent.bind(aiController)
);

/**
 * @route POST /api/ai/personalization/difficulty
 * @desc Adapt content difficulty
 * @access Private
 */
router.post('/personalization/difficulty',
  validateRequest(PersonalizationRequestSchema),
  aiController.adaptDifficulty.bind(aiController)
);

/**
 * @route POST /api/ai/personalization/pace
 * @desc Adapt learning pace
 * @access Private
 */
router.post('/personalization/pace',
  validateRequest(PersonalizationRequestSchema),
  aiController.adaptPace.bind(aiController)
);

/**
 * @route POST /api/ai/personalization/recommendations
 * @desc Get personalized recommendations
 * @access Private
 */
router.post('/personalization/recommendations',
  validateRequest(PersonalizationRequestSchema),
  aiController.getRecommendations.bind(aiController)
);

// ============================================================================
// ML PIPELINE ROUTES
// ============================================================================

/**
 * @route POST /api/ai/pipeline/train
 * @desc Train a new ML model
 * @access Private
 */
router.post('/pipeline/train',
  validateRequest(TrainingRequestSchema),
  aiController.trainModel.bind(aiController)
);

/**
 * @route POST /api/ai/pipeline/predict
 * @desc Make predictions using a trained model
 * @access Private
 */
router.post('/pipeline/predict',
  validateRequest(PredictionRequestSchema),
  aiController.makePrediction.bind(aiController)
);

/**
 * @route POST /api/ai/pipeline/evaluate/:modelId
 * @desc Evaluate a trained model
 * @access Private
 */
router.post('/pipeline/evaluate/:modelId',
  aiController.evaluateModel.bind(aiController)
);

/**
 * @route POST /api/ai/pipeline/deploy/:modelId
 * @desc Deploy a trained model to production
 * @access Private
 */
router.post('/pipeline/deploy/:modelId',
  aiController.deployModel.bind(aiController)
);

/**
 * @route GET /api/ai/pipeline/models
 * @desc Get list of available models
 * @access Private
 */
router.get('/pipeline/models',
  aiController.getAvailableModels.bind(aiController)
);

/**
 * @route GET /api/ai/pipeline/status/:modelId
 * @desc Get status of a specific model
 * @access Private
 */
router.get('/pipeline/status/:modelId',
  aiController.getModelStatus.bind(aiController)
);

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

/**
 * @route GET /api/ai/health
 * @desc Health check for AI services
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Services are running',
    timestamp: new Date().toISOString(),
    services: {
      contentGeneration: 'active',
      analytics: 'active',
      personalization: 'active',
      mlPipeline: 'active'
    }
  });
});

/**
 * @route GET /api/ai/status
 * @desc Get detailed status of all AI services
 * @access Private
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Services status',
    timestamp: new Date().toISOString(),
    services: {
      contentGeneration: {
        status: 'active',
        endpoints: ['/content', '/content/lesson', '/content/quiz', '/content/exercise'],
        models: ['gpt-3.5-turbo', 'gpt-4']
      },
      analytics: {
        status: 'active',
        endpoints: ['/analytics', '/analytics/performance', '/analytics/engagement', '/analytics/predictions'],
        types: ['performance', 'engagement', 'progress', 'prediction', 'recommendation']
      },
      personalization: {
        status: 'active',
        endpoints: ['/personalization', '/personalization/difficulty', '/personalization/pace', '/personalization/recommendations'],
        types: ['content', 'difficulty', 'pace', 'style', 'recommendation']
      },
      mlPipeline: {
        status: 'active',
        endpoints: ['/pipeline/train', '/pipeline/predict', '/pipeline/evaluate', '/pipeline/deploy'],
        models: ['regression', 'classification', 'clustering', 'nlp', 'recommendation']
      }
    },
    metrics: {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeModels: 0
    }
  });
});

// ============================================================================
// DOCUMENTATION ROUTES
// ============================================================================

/**
 * @route GET /api/ai/docs
 * @desc Get API documentation
 * @access Public
 */
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Services API Documentation',
    version: '1.0.0',
    endpoints: {
      contentGeneration: {
        description: 'Generate educational content using AI',
        basePath: '/api/ai/content',
        endpoints: [
          {
            path: '/',
            method: 'POST',
            description: 'Generate any type of educational content',
            body: 'ContentGenerationRequest'
          },
          {
            path: '/lesson',
            method: 'POST',
            description: 'Generate educational lessons',
            body: 'ContentGenerationRequest'
          },
          {
            path: '/quiz',
            method: 'POST',
            description: 'Generate educational quizzes',
            body: 'ContentGenerationRequest'
          },
          {
            path: '/exercise',
            method: 'POST',
            description: 'Generate educational exercises',
            body: 'ContentGenerationRequest'
          }
        ]
      },
      analytics: {
        description: 'Generate analytics and insights',
        basePath: '/api/ai/analytics',
        endpoints: [
          {
            path: '/',
            method: 'POST',
            description: 'Generate analytics for any type',
            body: 'AnalyticsRequest'
          },
          {
            path: '/performance',
            method: 'POST',
            description: 'Get performance analytics',
            body: 'AnalyticsRequest'
          },
          {
            path: '/engagement',
            method: 'POST',
            description: 'Get engagement analytics',
            body: 'AnalyticsRequest'
          },
          {
            path: '/predictions',
            method: 'POST',
            description: 'Get predictive analytics',
            body: 'AnalyticsRequest'
          }
        ]
      },
      personalization: {
        description: 'Personalize content and learning experiences',
        basePath: '/api/ai/personalization',
        endpoints: [
          {
            path: '/',
            method: 'POST',
            description: 'Personalize content for any type',
            body: 'PersonalizationRequest'
          },
          {
            path: '/difficulty',
            method: 'POST',
            description: 'Adapt content difficulty',
            body: 'PersonalizationRequest'
          },
          {
            path: '/pace',
            method: 'POST',
            description: 'Adapt learning pace',
            body: 'PersonalizationRequest'
          },
          {
            path: '/recommendations',
            method: 'POST',
            description: 'Get personalized recommendations',
            body: 'PersonalizationRequest'
          }
        ]
      },
      mlPipeline: {
        description: 'Train, evaluate, and deploy ML models',
        basePath: '/api/ai/pipeline',
        endpoints: [
          {
            path: '/train',
            method: 'POST',
            description: 'Train a new ML model',
            body: 'TrainingRequest'
          },
          {
            path: '/predict',
            method: 'POST',
            description: 'Make predictions using a trained model',
            body: 'PredictionRequest'
          },
          {
            path: '/evaluate/:modelId',
            method: 'POST',
            description: 'Evaluate a trained model',
            body: '{ testData: any[] }'
          },
          {
            path: '/deploy/:modelId',
            method: 'POST',
            description: 'Deploy a trained model to production'
          },
          {
            path: '/models',
            method: 'GET',
            description: 'Get list of available models'
          },
          {
            path: '/status/:modelId',
            method: 'GET',
            description: 'Get status of a specific model'
          }
        ]
      }
    },
    schemas: {
      ContentGenerationRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['lesson', 'quiz', 'exercise', 'summary', 'explanation', 'transcript'] },
          topic: { type: 'string', minLength: 1, maxLength: 500 },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          language: { type: 'string', default: 'es' },
          length: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' },
          style: { type: 'string', enum: ['formal', 'casual', 'academic', 'conversational'], default: 'formal' },
          includeExamples: { type: 'boolean', default: true },
          includeExercises: { type: 'boolean', default: false },
          targetAudience: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          context: { type: 'string' }
        },
        required: ['type', 'topic', 'level']
      },
      AnalyticsRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['performance', 'engagement', 'progress', 'prediction', 'recommendation'] },
          userId: { type: 'string' },
          courseId: { type: 'string' },
          timeRange: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' }
            }
          },
          metrics: { type: 'array', items: { type: 'string' } },
          filters: { type: 'object' }
        },
        required: ['type']
      },
      PersonalizationRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['content', 'difficulty', 'pace', 'style', 'recommendation'] },
          userId: { type: 'string' },
          courseId: { type: 'string' },
          context: {
            type: 'object',
            properties: {
              currentLevel: { type: 'string' },
              learningStyle: { type: 'string' },
              preferences: { type: 'object' },
              history: { type: 'array' }
            }
          },
          content: { type: 'object' }
        },
        required: ['type', 'userId']
      },
      TrainingRequest: {
        type: 'object',
        properties: {
          modelId: { type: 'string' },
          dataset: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              format: { type: 'string' },
              features: { type: 'array', items: { type: 'string' } },
              target: { type: 'string' },
              split: {
                type: 'object',
                properties: {
                  train: { type: 'number' },
                  validation: { type: 'number' },
                  test: { type: 'number' }
                }
              }
            }
          },
          config: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['regression', 'classification', 'clustering', 'nlp', 'recommendation'] },
              name: { type: 'string' },
              version: { type: 'string' },
              parameters: { type: 'object' },
              features: { type: 'array', items: { type: 'string' } },
              target: { type: 'string' },
              hyperparameters: { type: 'object' }
            }
          },
          options: {
            type: 'object',
            properties: {
              epochs: { type: 'number' },
              batchSize: { type: 'number' },
              learningRate: { type: 'number' },
              earlyStopping: { type: 'boolean' },
              crossValidation: { type: 'boolean' }
            }
          }
        },
        required: ['modelId', 'dataset', 'config']
      },
      PredictionRequest: {
        type: 'object',
        properties: {
          modelId: { type: 'string' },
          data: { type: 'array' },
          options: {
            type: 'object',
            properties: {
              returnProbabilities: { type: 'boolean' },
              returnFeatures: { type: 'boolean' },
              threshold: { type: 'number' }
            }
          }
        },
        required: ['modelId', 'data']
      }
    }
  });
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;