import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';
import RedisService from './redis.service.js';
import { v4 as uuidv4 } from 'uuid';
import * as Matrix from 'ml-matrix';
import * as regression from 'ml-regression';
import * as RandomForest from 'ml-random-forest';
import * as kmeans from 'ml-kmeans';
import * as PCA from 'ml-pca';

export interface StudentData {
  id: string;
  features: {
    age: number;
    grade: number;
    studyTime: number;
    attendance: number;
    previousScores: number[];
    learningStyle: string;
    subjectPreferences: string[];
    engagementLevel: number;
    completionRate: number;
    timeSpent: number;
  };
  performance: {
    currentScore: number;
    improvement: number;
    predictedScore: number;
    confidence: number;
  };
  metadata: {
    lastUpdated: number;
    dataPoints: number;
    accuracy: number;
  };
}

export interface LearningPath {
  id: string;
  studentId: string;
  subjects: string[];
  recommendedOrder: string[];
  difficultyProgression: number[];
  estimatedDuration: number;
  successProbability: number;
  confidence: number;
  metadata: {
    createdAt: number;
    lastUpdated: number;
    algorithm: string;
    version: string;
  };
}

export interface ContentRecommendation {
  id: string;
  studentId: string;
  contentId: string;
  contentType: string;
  subject: string;
  topic: string;
  difficulty: number;
  relevance: number;
  engagement: number;
  estimatedCompletionTime: number;
  successProbability: number;
  confidence: number;
  metadata: {
    algorithm: string;
    features: string[];
    score: number;
  };
}

export interface PredictionRequest {
  studentId: string;
  data: Partial<StudentData['features']>;
  predictionType: 'performance' | 'engagement' | 'completion' | 'difficulty';
  timeframe: 'short' | 'medium' | 'long';
  confidence: number;
}

export interface PredictionResponse {
  id: string;
  studentId: string;
  predictionType: string;
  value: number;
  confidence: number;
  timeframe: string;
  factors: string[];
  recommendations: string[];
  metadata: {
    algorithm: string;
    modelVersion: string;
    accuracy: number;
    timestamp: number;
  };
}

export interface ModelConfig {
  algorithm: string;
  parameters: Record<string, any>;
  trainingDataSize: number;
  accuracy: number;
  lastTrained: number;
  version: string;
}

export class PredictiveAnalyticsService {
  private static instance: PredictiveAnalyticsService;
  private redis: RedisService;
  private models: Map<string, any> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private studentData: Map<string, StudentData> = new Map();

  private constructor() {
    this.redis = new RedisService();
    this.initializeModels();
  }

  public static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  private initializeModels(): void {
    // Configurar modelos de regresión
    this.modelConfigs.set('performance_regression', {
      algorithm: 'linear_regression',
      parameters: { order: 1 },
      trainingDataSize: 0,
      accuracy: 0,
      lastTrained: 0,
      version: '1.0.0'
    });

    this.modelConfigs.set('engagement_classification', {
      algorithm: 'random_forest',
      parameters: { nEstimators: 100, maxDepth: 10 },
      trainingDataSize: 0,
      accuracy: 0,
      lastTrained: 0,
      version: '1.0.0'
    });

    this.modelConfigs.set('completion_prediction', {
      algorithm: 'logistic_regression',
      parameters: { iterations: 1000, learningRate: 0.01 },
      trainingDataSize: 0,
      accuracy: 0,
      lastTrained: 0,
      version: '1.0.0'
    });

    logger.info('Modelos de análisis predictivo inicializados');
  }

  public async predictPerformance(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();
    const predictionId = uuidv4();
    
    try {
      logger.info('Iniciando predicción de rendimiento', {
        predictionId,
        studentId: request.studentId,
        predictionType: request.predictionType,
        timeframe: request.timeframe
      });

      // Obtener datos del estudiante
      const studentData = await this.getStudentData(request.studentId);
      if (!studentData) {
        throw new Error(`Student data not found: ${request.studentId}`);
      }

      // Preparar características
      const features = this.extractFeatures(studentData, request.data);
      
      // Realizar predicción
      const prediction = await this.runPrediction(request.predictionType, features, request.timeframe);
      
      // Generar recomendaciones
      const recommendations = await this.generateRecommendations(request.studentId, prediction, request.predictionType);
      
      // Crear respuesta
      const response: PredictionResponse = {
        id: predictionId,
        studentId: request.studentId,
        predictionType: request.predictionType,
        value: prediction.value,
        confidence: prediction.confidence,
        timeframe: request.timeframe,
        factors: prediction.factors,
        recommendations,
        metadata: {
          algorithm: prediction.algorithm,
          modelVersion: prediction.modelVersion,
          accuracy: prediction.accuracy,
          timestamp: Date.now()
        }
      };

      // Cachear predicción
      await this.cachePrediction(request.studentId, response);

      // Registrar métricas
      const duration = Date.now() - startTime;
      metrics.recordPrediction(request.predictionType, 'success', duration);

      logger.info('Predicción de rendimiento completada', {
        predictionId,
        studentId: request.studentId,
        value: prediction.value,
        confidence: prediction.confidence,
        duration
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordPrediction(request.predictionType, 'error', duration);
      logger.error('Error en predicción de rendimiento', {
        predictionId,
        studentId: request.studentId,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      throw error;
    }
  }

  public async generateLearningPath(studentId: string, subjects: string[]): Promise<LearningPath> {
    const startTime = Date.now();
    const pathId = uuidv4();
    
    try {
      logger.info('Generando ruta de aprendizaje', {
        pathId,
        studentId,
        subjects
      });

      // Obtener datos del estudiante
      const studentData = await this.getStudentData(studentId);
      if (!studentData) {
        throw new Error(`Student data not found: ${studentId}`);
      }

      // Analizar preferencias y rendimiento por materia
      const subjectAnalysis = await this.analyzeSubjectPerformance(studentId, subjects);
      
      // Generar orden recomendado
      const recommendedOrder = this.generateRecommendedOrder(subjects, subjectAnalysis);
      
      // Calcular progresión de dificultad
      const difficultyProgression = this.calculateDifficultyProgression(recommendedOrder, studentData);
      
      // Estimar duración
      const estimatedDuration = this.estimatePathDuration(recommendedOrder, studentData);
      
      // Calcular probabilidad de éxito
      const successProbability = this.calculateSuccessProbability(studentData, recommendedOrder);

      const learningPath: LearningPath = {
        id: pathId,
        studentId,
        subjects,
        recommendedOrder,
        difficultyProgression,
        estimatedDuration,
        successProbability,
        confidence: 0.85,
        metadata: {
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          algorithm: 'adaptive_learning_path',
          version: '1.0.0'
        }
      };

      // Guardar ruta de aprendizaje
      await this.saveLearningPath(learningPath);

      // Registrar métricas
      const duration = Date.now() - startTime;
      metrics.recordLearningPathGeneration('success', duration);

      logger.info('Ruta de aprendizaje generada', {
        pathId,
        studentId,
        subjects: recommendedOrder,
        estimatedDuration,
        successProbability
      });

      return learningPath;

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordLearningPathGeneration('error', duration);
      logger.error('Error generando ruta de aprendizaje', {
        pathId,
        studentId,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      throw error;
    }
  }

  public async recommendContent(studentId: string, limit: number = 10): Promise<ContentRecommendation[]> {
    const startTime = Date.now();
    
    try {
      logger.info('Generando recomendaciones de contenido', {
        studentId,
        limit
      });

      // Obtener datos del estudiante
      const studentData = await this.getStudentData(studentId);
      if (!studentData) {
        throw new Error(`Student data not found: ${studentId}`);
      }

      // Obtener contenido disponible
      const availableContent = await this.getAvailableContent();
      
      // Calcular puntuaciones de recomendación
      const recommendations: ContentRecommendation[] = [];
      
      for (const content of availableContent) {
        const relevance = this.calculateContentRelevance(studentData, content);
        const engagement = this.predictEngagement(studentData, content);
        const completionTime = this.estimateCompletionTime(studentData, content);
        const successProbability = this.predictContentSuccess(studentData, content);
        
        const recommendation: ContentRecommendation = {
          id: uuidv4(),
          studentId,
          contentId: content.id,
          contentType: content.type,
          subject: content.subject,
          topic: content.topic,
          difficulty: content.difficulty,
          relevance,
          engagement,
          estimatedCompletionTime: completionTime,
          successProbability,
          confidence: 0.8,
          metadata: {
            algorithm: 'collaborative_filtering',
            features: ['learning_style', 'performance_history', 'preferences'],
            score: relevance * engagement * successProbability
          }
        };
        
        recommendations.push(recommendation);
      }

      // Ordenar por puntuación y limitar resultados
      const sortedRecommendations = recommendations
        .sort((a, b) => b.metadata.score - a.metadata.score)
        .slice(0, limit);

      // Cachear recomendaciones
      await this.cacheRecommendations(studentId, sortedRecommendations);

      // Registrar métricas
      const duration = Date.now() - startTime;
      metrics.recordContentRecommendation('success', duration);

      logger.info('Recomendaciones de contenido generadas', {
        studentId,
        recommendationsCount: sortedRecommendations.length,
        duration
      });

      return sortedRecommendations;

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordContentRecommendation('error', duration);
      logger.error('Error generando recomendaciones de contenido', {
        studentId,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      throw error;
    }
  }

  public async updateStudentData(studentId: string, data: Partial<StudentData['features']>): Promise<void> {
    try {
      let studentData = await this.getStudentData(studentId);
      
      if (!studentData) {
        // Crear nuevo estudiante
        studentData = {
          id: studentId,
          features: {
            age: 0,
            grade: 0,
            studyTime: 0,
            attendance: 0,
            previousScores: [],
            learningStyle: 'visual',
            subjectPreferences: [],
            engagementLevel: 0,
            completionRate: 0,
            timeSpent: 0,
            ...data
          },
          performance: {
            currentScore: 0,
            improvement: 0,
            predictedScore: 0,
            confidence: 0
          },
          metadata: {
            lastUpdated: Date.now(),
            dataPoints: 1,
            accuracy: 0
          }
        };
      } else {
        // Actualizar datos existentes
        studentData.features = { ...studentData.features, ...data };
        studentData.metadata.lastUpdated = Date.now();
        studentData.metadata.dataPoints++;
      }

      // Guardar datos actualizados
      await this.saveStudentData(studentData);
      
      // Reentrenar modelos si es necesario
      await this.checkAndRetrainModels();

      logger.info('Datos del estudiante actualizados', {
        studentId,
        dataPoints: studentData.metadata.dataPoints
      });

    } catch (error) {
      logger.error('Error actualizando datos del estudiante', {
        studentId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async runPrediction(
    predictionType: string, 
    features: number[], 
    timeframe: string
  ): Promise<{
    value: number;
    confidence: number;
    factors: string[];
    algorithm: string;
    modelVersion: string;
    accuracy: number;
  }> {
    // Simular predicción basada en el tipo
    let value = 0;
    let confidence = 0.8;
    let factors: string[] = [];
    let algorithm = 'linear_regression';
    let modelVersion = '1.0.0';
    let accuracy = 0.85;

    switch (predictionType) {
      case 'performance':
        value = this.predictPerformanceScore(features);
        factors = ['study_time', 'attendance', 'previous_scores', 'engagement'];
        break;
      case 'engagement':
        value = this.predictEngagementLevel(features);
        factors = ['learning_style', 'subject_preferences', 'completion_rate'];
        break;
      case 'completion':
        value = this.predictCompletionRate(features);
        factors = ['time_spent', 'difficulty_level', 'motivation'];
        break;
      case 'difficulty':
        value = this.predictOptimalDifficulty(features);
        factors = ['current_performance', 'learning_curve', 'challenge_preference'];
        break;
      default:
        throw new Error(`Unknown prediction type: ${predictionType}`);
    }

    // Ajustar confianza basada en la calidad de los datos
    confidence = Math.min(confidence, 0.95);
    confidence = Math.max(confidence, 0.5);

    return {
      value,
      confidence,
      factors,
      algorithm,
      modelVersion,
      accuracy
    };
  }

  private predictPerformanceScore(features: number[]): number {
    // Simular modelo de regresión lineal
    const weights = [0.3, 0.2, 0.25, 0.15, 0.1]; // Pesos para diferentes características
    let score = 0;
    
    for (let i = 0; i < Math.min(features.length, weights.length); i++) {
      score += features[i] * weights[i];
    }
    
    // Normalizar a escala 0-100
    return Math.min(Math.max(score * 100, 0), 100);
  }

  private predictEngagementLevel(features: number[]): number {
    // Simular modelo de clasificación
    const engagement = features.reduce((sum, feature) => sum + feature, 0) / features.length;
    return Math.min(Math.max(engagement, 0), 1);
  }

  private predictCompletionRate(features: number[]): number {
    // Simular modelo de regresión logística
    const completion = features.reduce((sum, feature) => sum + feature, 0) / features.length;
    return Math.min(Math.max(completion, 0), 1);
  }

  private predictOptimalDifficulty(features: number[]): number {
    // Simular modelo de regresión
    const difficulty = features.reduce((sum, feature) => sum + feature, 0) / features.length;
    return Math.min(Math.max(difficulty * 10, 1), 10); // Escala 1-10
  }

  private extractFeatures(studentData: StudentData, additionalData: Partial<StudentData['features']>): number[] {
    const features = studentData.features;
    const merged = { ...features, ...additionalData };
    
    return [
      merged.age / 100, // Normalizar edad
      merged.grade / 12, // Normalizar grado
      merged.studyTime / 24, // Normalizar tiempo de estudio
      merged.attendance / 100, // Normalizar asistencia
      merged.previousScores.length > 0 ? merged.previousScores.reduce((a, b) => a + b, 0) / merged.previousScores.length / 100 : 0,
      merged.engagementLevel,
      merged.completionRate,
      merged.timeSpent / 1000, // Normalizar tiempo
      merged.subjectPreferences.length / 10, // Normalizar preferencias
      merged.learningStyle === 'visual' ? 1 : merged.learningStyle === 'auditory' ? 0.5 : 0.25
    ];
  }

  private async generateRecommendations(
    studentId: string, 
    prediction: any, 
    predictionType: string
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    switch (predictionType) {
      case 'performance':
        if (prediction.value < 70) {
          recommendations.push('Increase study time by 30 minutes daily');
          recommendations.push('Focus on areas with lowest previous scores');
          recommendations.push('Consider additional tutoring sessions');
        } else if (prediction.value > 90) {
          recommendations.push('Challenge yourself with advanced topics');
          recommendations.push('Help peers with difficult concepts');
          recommendations.push('Explore related subjects for enrichment');
        }
        break;
      case 'engagement':
        if (prediction.value < 0.5) {
          recommendations.push('Try different learning styles and formats');
          recommendations.push('Set specific, achievable learning goals');
          recommendations.push('Take more interactive content');
        }
        break;
      case 'completion':
        if (prediction.value < 0.7) {
          recommendations.push('Break content into smaller, manageable chunks');
          recommendations.push('Set regular study schedules');
          recommendations.push('Use progress tracking tools');
        }
        break;
      case 'difficulty':
        if (prediction.value < 5) {
          recommendations.push('Start with foundational concepts');
          recommendations.push('Build confidence with easier content first');
          recommendations.push('Seek additional support when needed');
        } else if (prediction.value > 8) {
          recommendations.push('Challenge yourself with complex problems');
          recommendations.push('Explore advanced applications');
          recommendations.push('Consider mentoring others');
        }
        break;
    }
    
    return recommendations;
  }

  private async analyzeSubjectPerformance(studentId: string, subjects: string[]): Promise<Record<string, any>> {
    const analysis: Record<string, any> = {};
    
    for (const subject of subjects) {
      // Simular análisis de rendimiento por materia
      analysis[subject] = {
        performance: Math.random() * 100,
        engagement: Math.random(),
        difficulty: Math.random() * 10,
        timeSpent: Math.random() * 100,
        improvement: Math.random() * 20 - 10
      };
    }
    
    return analysis;
  }

  private generateRecommendedOrder(subjects: string[], analysis: Record<string, any>): string[] {
    // Ordenar materias por rendimiento y mejora
    return subjects.sort((a, b) => {
      const scoreA = analysis[a].performance + analysis[a].improvement;
      const scoreB = analysis[b].performance + analysis[b].improvement;
      return scoreB - scoreA;
    });
  }

  private calculateDifficultyProgression(subjects: string[], studentData: StudentData): number[] {
    const baseDifficulty = studentData.features.engagementLevel * 5;
    return subjects.map((_, index) => baseDifficulty + index * 0.5);
  }

  private estimatePathDuration(subjects: string[], studentData: StudentData): number {
    const baseTimePerSubject = 20; // horas
    const learningSpeed = studentData.features.completionRate;
    return subjects.length * baseTimePerSubject / learningSpeed;
  }

  private calculateSuccessProbability(studentData: StudentData, subjects: string[]): number {
    const baseProbability = studentData.features.completionRate;
    const engagementFactor = studentData.features.engagementLevel;
    const performanceFactor = studentData.performance.currentScore / 100;
    
    return Math.min(baseProbability * engagementFactor * performanceFactor, 1);
  }

  private calculateContentRelevance(studentData: StudentData, content: any): number {
    const subjectMatch = studentData.features.subjectPreferences.includes(content.subject) ? 1 : 0.5;
    const difficultyMatch = Math.max(0, 1 - Math.abs(content.difficulty - studentData.features.engagementLevel * 5) / 10);
    const styleMatch = content.type === studentData.features.learningStyle ? 1 : 0.7;
    
    return (subjectMatch + difficultyMatch + styleMatch) / 3;
  }

  private predictEngagement(studentData: StudentData, content: any): number {
    const relevance = this.calculateContentRelevance(studentData, content);
    const difficulty = Math.max(0, 1 - Math.abs(content.difficulty - studentData.features.engagementLevel * 5) / 10);
    
    return (relevance + difficulty) / 2;
  }

  private estimateCompletionTime(studentData: StudentData, content: any): number {
    const baseTime = content.estimatedTime || 30; // minutos
    const speedFactor = studentData.features.completionRate;
    const difficultyFactor = content.difficulty / 10;
    
    return baseTime * difficultyFactor / speedFactor;
  }

  private predictContentSuccess(studentData: StudentData, content: any): number {
    const performance = studentData.performance.currentScore / 100;
    const difficulty = Math.max(0, 1 - content.difficulty / 10);
    const engagement = this.predictEngagement(studentData, content);
    
    return (performance + difficulty + engagement) / 3;
  }

  private async getAvailableContent(): Promise<any[]> {
    // Simular contenido disponible
    return [
      { id: '1', type: 'lesson', subject: 'math', topic: 'algebra', difficulty: 5, estimatedTime: 45 },
      { id: '2', type: 'quiz', subject: 'science', topic: 'chemistry', difficulty: 7, estimatedTime: 30 },
      { id: '3', type: 'exercise', subject: 'history', topic: 'world_war_ii', difficulty: 4, estimatedTime: 60 },
      { id: '4', type: 'video', subject: 'literature', topic: 'poetry', difficulty: 3, estimatedTime: 20 },
      { id: '5', type: 'interactive', subject: 'physics', topic: 'mechanics', difficulty: 8, estimatedTime: 90 }
    ];
  }

  private async getStudentData(studentId: string): Promise<StudentData | null> {
    const cacheKey = `student:${studentId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async saveStudentData(studentData: StudentData): Promise<void> {
    const cacheKey = `student:${studentData.id}`;
    await this.redis.set(cacheKey, JSON.stringify(studentData), 86400); // 24 horas
  }

  private async saveLearningPath(learningPath: LearningPath): Promise<void> {
    const cacheKey = `learning_path:${learningPath.id}`;
    await this.redis.set(cacheKey, JSON.stringify(learningPath), 86400);
  }

  private async cachePrediction(studentId: string, prediction: PredictionResponse): Promise<void> {
    const cacheKey = `prediction:${studentId}:${prediction.predictionType}`;
    await this.redis.set(cacheKey, JSON.stringify(prediction), 3600); // 1 hora
  }

  private async cacheRecommendations(studentId: string, recommendations: ContentRecommendation[]): Promise<void> {
    const cacheKey = `recommendations:${studentId}`;
    await this.redis.set(cacheKey, JSON.stringify(recommendations), 1800); // 30 minutos
  }

  private async checkAndRetrainModels(): Promise<void> {
    // Verificar si es necesario reentrenar modelos
    const now = Date.now();
    const retrainInterval = 7 * 24 * 60 * 60 * 1000; // 7 días
    
    for (const [modelName, config] of this.modelConfigs.entries()) {
      if (now - config.lastTrained > retrainInterval) {
        await this.retrainModel(modelName);
      }
    }
  }

  private async retrainModel(modelName: string): Promise<void> {
    logger.info('Reentrenando modelo', { modelName });
    
    // Simular reentrenamiento
    const config = this.modelConfigs.get(modelName);
    if (config) {
      config.lastTrained = Date.now();
      config.accuracy = Math.min(config.accuracy + 0.01, 0.95);
      this.modelConfigs.set(modelName, config);
    }
  }

  public async getAnalyticsStats(): Promise<Record<string, any>> {
    const stats = {
      activeStudents: this.studentData.size,
      totalModels: this.modelConfigs.size,
      cacheKeys: await this.redis.keys('student:*').then(keys => keys.length),
      predictions: await this.redis.keys('prediction:*').then(keys => keys.length),
      learningPaths: await this.redis.keys('learning_path:*').then(keys => keys.length),
      recommendations: await this.redis.keys('recommendations:*').then(keys => keys.length)
    };

    return stats;
  }

  public async clearOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const keys = await this.redis.keys('*');
    const now = Date.now();
    let deletedCount = 0;
    
    for (const key of keys) {
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.metadata?.lastUpdated && now - data.metadata.lastUpdated > maxAge) {
          await this.redis.del(key);
          deletedCount++;
        }
      }
    }
    
    logger.info('Datos antiguos limpiados', { deletedCount });
  }
}

export default PredictiveAnalyticsService;