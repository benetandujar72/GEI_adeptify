import { Router } from 'express';
import { z } from 'zod';
import { PredictiveAnalyticsService } from '../services/predictive-analytics.service.js';
import { logger, logAnalyticsError, logPrediction } from '../utils/logger.js';

const router = Router();
const analyticsService = new PredictiveAnalyticsService();

// Schemas de validación
const studentPerformanceSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  historicalData: z.record(z.any()),
});

const courseSuccessSchema = z.object({
  courseId: z.string().uuid(),
  studentData: z.array(z.record(z.any())),
});

const learningPathSchema = z.object({
  studentId: z.string().uuid(),
  currentLevel: z.string(),
  goals: z.array(z.string()),
  preferences: z.record(z.any()),
});

const earlyWarningSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  currentData: z.record(z.any()),
});

const engagementAnalysisSchema = z.object({
  studentId: z.string().uuid(),
  engagementData: z.record(z.any()),
});

const realTimePredictionSchema = z.object({
  predictionType: z.enum(['performance', 'dropout', 'engagement', 'completion']),
  studentId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  currentData: z.record(z.any()),
  parameters: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const batchPredictionSchema = z.object({
  predictionType: z.enum(['performance', 'dropout', 'engagement', 'completion']),
  studentIds: z.array(z.string().uuid()),
  courseIds: z.array(z.string().uuid()).optional(),
  parameters: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

const dataAnalysisSchema = z.object({
  analysisType: z.enum(['descriptive', 'correlation', 'trend', 'comparison']),
  variables: z.array(z.string()),
  filters: z.record(z.any()).optional(),
  timeRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  groupBy: z.array(z.string()).optional(),
  aggregations: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const modelTrainingSchema = z.object({
  modelType: z.enum(['performance', 'dropout', 'engagement', 'completion']),
  targetVariable: z.string(),
  features: z.array(z.string()),
  trainingData: z.object({
    startDate: z.string(),
    endDate: z.string(),
    filters: z.record(z.any()).optional(),
  }),
  hyperparameters: z.record(z.any()).optional(),
  validationSplit: z.number().min(0).max(1),
  crossValidation: z.boolean(),
  metadata: z.record(z.any()).optional(),
});

// Rutas de predicciones
router.post('/predict/student-performance', async (req, res) => {
  try {
    const validatedData = studentPerformanceSchema.parse(req.body);
    
    const prediction = await analyticsService.predictStudentPerformance(
      validatedData.studentId,
      validatedData.courseId,
      validatedData.historicalData
    );

    logPrediction('student_performance', validatedData.studentId, prediction, prediction.confidence);

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Student performance prediction generated successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/predict/student-performance', body: req.body });
    
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

router.post('/predict/course-success', async (req, res) => {
  try {
    const validatedData = courseSuccessSchema.parse(req.body);
    
    const prediction = await analyticsService.predictCourseSuccess(
      validatedData.courseId,
      validatedData.studentData
    );

    logPrediction('course_success', validatedData.courseId, prediction, 0.85);

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Course success prediction generated successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/predict/course-success', body: req.body });
    
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

// Rutas de recomendaciones
router.post('/recommendations/learning-path', async (req, res) => {
  try {
    const validatedData = learningPathSchema.parse(req.body);
    
    const recommendation = await analyticsService.generateLearningPathRecommendation(
      validatedData.studentId,
      validatedData.currentLevel,
      validatedData.goals,
      validatedData.preferences
    );

    logger.info('Learning path recommendation generated', {
      studentId: validatedData.studentId,
      stepsCount: recommendation.recommendedPath.length,
    });

    res.status(200).json({
      success: true,
      data: recommendation,
      message: 'Learning path recommendation generated successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/recommendations/learning-path', body: req.body });
    
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

// Rutas de alertas tempranas
router.post('/early-warning', async (req, res) => {
  try {
    const validatedData = earlyWarningSchema.parse(req.body);
    
    const warning = await analyticsService.generateEarlyWarning(
      validatedData.studentId,
      validatedData.courseId,
      validatedData.currentData
    );

    logger.info('Early warning generated', {
      studentId: validatedData.studentId,
      riskLevel: warning.riskLevel,
    });

    res.status(200).json({
      success: true,
      data: warning,
      message: 'Early warning generated successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/early-warning', body: req.body });
    
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

// Rutas de análisis de engagement
router.post('/analyze/engagement', async (req, res) => {
  try {
    const validatedData = engagementAnalysisSchema.parse(req.body);
    
    const analysis = await analyticsService.analyzeEngagement(
      validatedData.studentId,
      validatedData.engagementData
    );

    logger.info('Engagement analysis completed', {
      studentId: validatedData.studentId,
      engagementScore: analysis.engagementScore,
    });

    res.status(200).json({
      success: true,
      data: analysis,
      message: 'Engagement analysis completed successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/analyze/engagement', body: req.body });
    
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

// Rutas de predicciones en tiempo real
router.post('/predict/realtime', async (req, res) => {
  try {
    const validatedData = realTimePredictionSchema.parse(req.body);
    
    const prediction = await analyticsService.realTimePrediction(validatedData);

    logPrediction('realtime', validatedData.studentId, prediction, prediction.confidence);

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Real-time prediction generated successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/predict/realtime', body: req.body });
    
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

// Rutas de predicciones en lote
router.post('/predict/batch', async (req, res) => {
  try {
    const validatedData = batchPredictionSchema.parse(req.body);
    
    const batchJob = await analyticsService.batchPrediction(validatedData);

    logger.info('Batch prediction started', {
      batchId: batchJob.batchId,
      totalItems: batchJob.totalItems,
      type: validatedData.predictionType,
    });

    res.status(202).json({
      success: true,
      data: batchJob,
      message: 'Batch prediction started successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/predict/batch', body: req.body });
    
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

router.get('/predict/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batchStatus = await analyticsService.getBatchPredictionStatus(batchId);

    res.status(200).json({
      success: true,
      data: batchStatus,
      message: 'Batch prediction status retrieved successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: `/predict/batch/${req.params.batchId}` });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// Rutas de análisis de datos
router.post('/analyze/data', async (req, res) => {
  try {
    const validatedData = dataAnalysisSchema.parse(req.body);
    
    const analysis = await analyticsService.analyzeData(validatedData);

    logger.info('Data analysis completed', {
      analysisId: analysis.analysisId,
      type: analysis.type,
      insightsCount: analysis.insights.length,
    });

    res.status(200).json({
      success: true,
      data: analysis,
      message: 'Data analysis completed successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/analyze/data', body: req.body });
    
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

// Rutas de entrenamiento de modelos
router.post('/models/train', async (req, res) => {
  try {
    const validatedData = modelTrainingSchema.parse(req.body);
    
    const trainingJob = await analyticsService.trainModel(validatedData);

    logger.info('Model training started', {
      modelId: trainingJob.modelId,
      type: validatedData.modelType,
    });

    res.status(202).json({
      success: true,
      data: trainingJob,
      message: 'Model training started successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/models/train', body: req.body });
    
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

// Rutas de información del servicio
router.get('/metrics', (req, res) => {
  try {
    const metrics = analyticsService.getMetrics();
    
    res.status(200).json({
      success: true,
      data: metrics,
      message: 'Service metrics retrieved successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/metrics' });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

router.get('/models', (req, res) => {
  try {
    const models = analyticsService.getActiveModels();
    
    res.status(200).json({
      success: true,
      data: models,
      message: 'Active models retrieved successfully',
    });
  } catch (error) {
    logAnalyticsError(error, { endpoint: '/models' });
    
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
    service: 'Predictive Analytics Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router; 