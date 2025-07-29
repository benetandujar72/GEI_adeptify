import { Request, Response } from 'express';
import { 
  ContentGenerationRequest,
  AnalyticsRequest,
  PersonalizationRequest,
  TrainingRequest,
  PredictionRequest
} from '../types/ai';
import { contentGenerationService } from '../services/content-generation';
import { analyticsService } from '../services/analytics';
import { personalizationService } from '../services/personalization';
import { mlPipelineService } from '../services/ml-pipeline';
import { aiLogger, logRequest, logResponse } from '../utils/logger';

// ============================================================================
// AI CONTROLLER
// ============================================================================

export class AIController {
  // ============================================================================
  // CONTENT GENERATION ENDPOINTS
  // ============================================================================

  async generateContent(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'generate_content');
      
      const request: ContentGenerationRequest = req.body;
      
      const result = await contentGenerationService.generateContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'generate_content', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Content generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Content generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate content'
      });
    }
  }

  async generateLesson(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'generate_lesson');
      
      const request: ContentGenerationRequest = {
        ...req.body,
        type: 'lesson'
      };
      
      const result = await contentGenerationService.generateContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'generate_lesson', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lesson generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Lesson generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate lesson'
      });
    }
  }

  async generateQuiz(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'generate_quiz');
      
      const request: ContentGenerationRequest = {
        ...req.body,
        type: 'quiz'
      };
      
      const result = await contentGenerationService.generateContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'generate_quiz', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Quiz generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Quiz generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate quiz'
      });
    }
  }

  async generateExercise(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'generate_exercise');
      
      const request: ContentGenerationRequest = {
        ...req.body,
        type: 'exercise'
      };
      
      const result = await contentGenerationService.generateContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'generate_exercise', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Exercise generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Exercise generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate exercise'
      });
    }
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  async generateAnalytics(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'generate_analytics');
      
      const request: AnalyticsRequest = req.body;
      
      const result = await analyticsService.generateAnalytics(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'generate_analytics', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Analytics generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Analytics generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate analytics'
      });
    }
  }

  async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'get_performance_analytics');
      
      const request: AnalyticsRequest = {
        ...req.body,
        type: 'performance'
      };
      
      const result = await analyticsService.generateAnalytics(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'get_performance_analytics', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Performance analytics retrieved successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Performance analytics failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to retrieve performance analytics'
      });
    }
  }

  async getEngagementAnalytics(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'get_engagement_analytics');
      
      const request: AnalyticsRequest = {
        ...req.body,
        type: 'engagement'
      };
      
      const result = await analyticsService.generateAnalytics(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'get_engagement_analytics', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Engagement analytics retrieved successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Engagement analytics failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to retrieve engagement analytics'
      });
    }
  }

  async getPredictions(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'get_predictions');
      
      const request: AnalyticsRequest = {
        ...req.body,
        type: 'prediction'
      };
      
      const result = await analyticsService.generateAnalytics(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'get_predictions', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Predictions generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Predictions failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate predictions'
      });
    }
  }

  // ============================================================================
  // PERSONALIZATION ENDPOINTS
  // ============================================================================

  async personalizeContent(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'personalize_content');
      
      const request: PersonalizationRequest = req.body;
      
      const result = await personalizationService.personalizeContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'personalize_content', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Content personalized successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Content personalization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to personalize content'
      });
    }
  }

  async adaptDifficulty(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'adapt_difficulty');
      
      const request: PersonalizationRequest = {
        ...req.body,
        type: 'difficulty'
      };
      
      const result = await personalizationService.personalizeContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'adapt_difficulty', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Difficulty adapted successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Difficulty adaptation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to adapt difficulty'
      });
    }
  }

  async adaptPace(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'adapt_pace');
      
      const request: PersonalizationRequest = {
        ...req.body,
        type: 'pace'
      };
      
      const result = await personalizationService.personalizeContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'adapt_pace', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pace adapted successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Pace adaptation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to adapt pace'
      });
    }
  }

  async getRecommendations(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'get_recommendations');
      
      const request: PersonalizationRequest = {
        ...req.body,
        type: 'recommendation'
      };
      
      const result = await personalizationService.personalizeContent(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'get_recommendations', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Recommendations generated successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Recommendations failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to generate recommendations'
      });
    }
  }

  // ============================================================================
  // ML PIPELINE ENDPOINTS
  // ============================================================================

  async trainModel(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'train_model');
      
      const request: TrainingRequest = req.body;
      
      const result = await mlPipelineService.trainModel(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'train_model', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Model training started successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Model training failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to start model training'
      });
    }
  }

  async makePrediction(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'make_prediction');
      
      const request: PredictionRequest = req.body;
      
      const result = await mlPipelineService.makePrediction(request);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'make_prediction', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Prediction completed successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Prediction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to make prediction'
      });
    }
  }

  async evaluateModel(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'evaluate_model');
      
      const { modelId } = req.params;
      const { testData } = req.body;
      
      const result = await mlPipelineService.evaluateModel(modelId, testData);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'evaluate_model', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Model evaluation completed successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Model evaluation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to evaluate model'
      });
    }
  }

  async deployModel(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'deploy_model');
      
      const { modelId } = req.params;
      
      const result = await mlPipelineService.deployModel(modelId);
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'deploy_model', duration);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Model deployed successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Model deployment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to deploy model'
      });
    }
  }

  // ============================================================================
  // UTILITY ENDPOINTS
  // ============================================================================

  async getModelStatus(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'get_model_status');
      
      const { modelId } = req.params;
      
      // This would typically check the actual model status
      const status = {
        modelId,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        performance: {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88
        }
      };
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'get_model_status', duration);
      
      res.status(200).json({
        success: true,
        data: status,
        message: 'Model status retrieved successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Get model status failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to get model status'
      });
    }
  }

  async getAvailableModels(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logRequest(aiLogger, req, 'get_available_models');
      
      // This would typically fetch from a database or model registry
      const models = [
        {
          id: 'performance-prediction',
          name: 'Performance Prediction Model',
          type: 'regression',
          status: 'ready',
          accuracy: 0.87,
          lastUpdated: '2024-01-15T10:30:00Z'
        },
        {
          id: 'engagement-classification',
          name: 'Engagement Classification Model',
          type: 'classification',
          status: 'ready',
          accuracy: 0.92,
          lastUpdated: '2024-01-14T15:45:00Z'
        },
        {
          id: 'content-recommendation',
          name: 'Content Recommendation Model',
          type: 'recommendation',
          status: 'training',
          accuracy: null,
          lastUpdated: '2024-01-15T09:15:00Z'
        }
      ];
      
      const duration = Date.now() - startTime;
      logResponse(aiLogger, res, 'get_available_models', duration);
      
      res.status(200).json({
        success: true,
        data: models,
        message: 'Available models retrieved successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      aiLogger.error('Get available models failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to get available models'
      });
    }
  }
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const aiController = new AIController();