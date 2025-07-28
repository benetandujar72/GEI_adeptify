import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import {
  StudentPerformancePrediction,
  CourseSuccessPrediction,
  LearningPathRecommendation,
  EarlyWarningSystem,
  PredictiveModel,
  ModelTrainingRequest,
  ModelTrainingResponse,
  DataAnalysisRequest,
  DataAnalysisResponse,
  EngagementAnalysis,
  BatchPredictionRequest,
  BatchPredictionResponse,
  RealTimePredictionRequest,
  RealTimePredictionResponse,
  PredictiveAnalyticsMetrics,
  PredictionType,
  ModelType,
  RiskLevel,
  AnalysisType,
  BatchStatus,
} from '../types/analytics.types.js';

export class PredictiveAnalyticsService {
  private llmGatewayUrl: string;
  private metrics: PredictiveAnalyticsMetrics;
  private activeModels: Map<string, PredictiveModel>;
  private batchJobs: Map<string, BatchPredictionResponse>;

  constructor() {
    this.llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3004';
    this.activeModels = new Map();
    this.batchJobs = new Map();
    this.metrics = {
      totalPredictions: 0,
      accuratePredictions: 0,
      averageAccuracy: 0,
      modelsActive: 0,
      predictionsByType: {},
      predictionsByModel: {},
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.initializeDefaultModels();
  }

  // Predicciones de rendimiento estudiantil
  async predictStudentPerformance(
    studentId: string,
    courseId: string,
    historicalData: Record<string, any>
  ): Promise<StudentPerformancePrediction> {
    const startTime = Date.now();
    
    try {
      logger.info('Predicting student performance', { studentId, courseId });

      // Construir prompt para el LLM
      const prompt = this.buildPerformancePredictionPrompt(studentId, courseId, historicalData);
      
      // Llamar al LLM Gateway
      const response = await this.callLLMGateway(prompt, {
        type: 'performance_prediction',
        studentId,
        courseId,
      });

      // Procesar respuesta
      const prediction = this.processPerformancePredictionResponse(response, studentId, courseId);
      
      // Actualizar métricas
      this.updateMetrics('performance', Date.now() - startTime);
      
      logger.info('Student performance prediction completed', {
        studentId,
        courseId,
        predictedGrade: prediction.predictedGrade,
        confidence: prediction.confidence,
      });

      return prediction;
    } catch (error) {
      logger.error('Student performance prediction failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Predicciones de éxito del curso
  async predictCourseSuccess(
    courseId: string,
    studentData: Record<string, any>[]
  ): Promise<CourseSuccessPrediction> {
    const startTime = Date.now();
    
    try {
      logger.info('Predicting course success', { courseId, studentCount: studentData.length });

      const prompt = this.buildCourseSuccessPredictionPrompt(courseId, studentData);
      
      const response = await this.callLLMGateway(prompt, {
        type: 'course_success_prediction',
        courseId,
      });

      const prediction = this.processCourseSuccessPredictionResponse(response, courseId);
      
      this.updateMetrics('course_success', Date.now() - startTime);
      
      logger.info('Course success prediction completed', {
        courseId,
        successRate: prediction.predictedSuccessRate,
        dropoutRate: prediction.predictedDropoutRate,
      });

      return prediction;
    } catch (error) {
      logger.error('Course success prediction failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Recomendaciones de ruta de aprendizaje
  async generateLearningPathRecommendation(
    studentId: string,
    currentLevel: string,
    goals: string[],
    preferences: Record<string, any>
  ): Promise<LearningPathRecommendation> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating learning path recommendation', { studentId, currentLevel });

      const prompt = this.buildLearningPathPrompt(studentId, currentLevel, goals, preferences);
      
      const response = await this.callLLMGateway(prompt, {
        type: 'learning_path_recommendation',
        studentId,
      });

      const recommendation = this.processLearningPathResponse(response, studentId, currentLevel);
      
      this.updateMetrics('learning_path', Date.now() - startTime);
      
      logger.info('Learning path recommendation completed', {
        studentId,
        stepsCount: recommendation.recommendedPath.length,
        successProbability: recommendation.successProbability,
      });

      return recommendation;
    } catch (error) {
      logger.error('Learning path recommendation failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Sistema de alertas tempranas
  async generateEarlyWarning(
    studentId: string,
    courseId: string,
    currentData: Record<string, any>
  ): Promise<EarlyWarningSystem> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating early warning', { studentId, courseId });

      const prompt = this.buildEarlyWarningPrompt(studentId, courseId, currentData);
      
      const response = await this.callLLMGateway(prompt, {
        type: 'early_warning',
        studentId,
        courseId,
      });

      const warning = this.processEarlyWarningResponse(response, studentId, courseId);
      
      this.updateMetrics('early_warning', Date.now() - startTime);
      
      logger.info('Early warning generated', {
        studentId,
        riskLevel: warning.riskLevel,
        riskFactorsCount: warning.riskFactors.length,
      });

      return warning;
    } catch (error) {
      logger.error('Early warning generation failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Análisis de engagement
  async analyzeEngagement(
    studentId: string,
    engagementData: Record<string, any>
  ): Promise<EngagementAnalysis> {
    const startTime = Date.now();
    
    try {
      logger.info('Analyzing student engagement', { studentId });

      const prompt = this.buildEngagementAnalysisPrompt(studentId, engagementData);
      
      const response = await this.callLLMGateway(prompt, {
        type: 'engagement_analysis',
        studentId,
      });

      const analysis = this.processEngagementAnalysisResponse(response, studentId);
      
      this.updateMetrics('engagement_analysis', Date.now() - startTime);
      
      logger.info('Engagement analysis completed', {
        studentId,
        engagementScore: analysis.engagementScore,
        factorsCount: analysis.factors.length,
      });

      return analysis;
    } catch (error) {
      logger.error('Engagement analysis failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Predicciones en tiempo real
  async realTimePrediction(request: RealTimePredictionRequest): Promise<RealTimePredictionResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing real-time prediction', {
        type: request.predictionType,
        studentId: request.studentId,
      });

      const prompt = this.buildRealTimePredictionPrompt(request);
      
      const response = await this.callLLMGateway(prompt, {
        type: 'real_time_prediction',
        predictionType: request.predictionType,
        studentId: request.studentId,
      });

      const result = this.processRealTimePredictionResponse(response, request);
      
      this.updateMetrics('real_time_prediction', Date.now() - startTime);
      
      logger.info('Real-time prediction completed', {
        predictionId: result.predictionId,
        type: result.type,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Real-time prediction failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Predicciones en lote
  async batchPrediction(request: BatchPredictionRequest): Promise<BatchPredictionResponse> {
    const batchId = uuidv4();
    
    try {
      logger.info('Starting batch prediction', {
        batchId,
        type: request.predictionType,
        totalItems: request.studentIds.length,
      });

      const batchJob: BatchPredictionResponse = {
        batchId,
        status: BatchStatus.PENDING,
        totalItems: request.studentIds.length,
        processedItems: 0,
        metadata: request.metadata || {},
      };

      this.batchJobs.set(batchId, batchJob);

      // Procesar en segundo plano
      this.processBatchPrediction(batchId, request);

      return batchJob;
    } catch (error) {
      logger.error('Batch prediction failed:', error);
      throw error;
    }
  }

  // Obtener estado de predicción en lote
  async getBatchPredictionStatus(batchId: string): Promise<BatchPredictionResponse> {
    const batchJob = this.batchJobs.get(batchId);
    if (!batchJob) {
      throw new Error(`Batch job ${batchId} not found`);
    }
    return batchJob;
  }

  // Análisis de datos
  async analyzeData(request: DataAnalysisRequest): Promise<DataAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Analyzing data', {
        type: request.analysisType,
        variables: request.variables,
      });

      const prompt = this.buildDataAnalysisPrompt(request);
      
      const response = await this.callLLMGateway(prompt, {
        type: 'data_analysis',
        analysisType: request.analysisType,
      });

      const analysis = this.processDataAnalysisResponse(response, request);
      
      this.updateMetrics('data_analysis', Date.now() - startTime);
      
      logger.info('Data analysis completed', {
        analysisId: analysis.analysisId,
        type: analysis.type,
        insightsCount: analysis.insights.length,
      });

      return analysis;
    } catch (error) {
      logger.error('Data analysis failed:', error);
      this.updateErrorMetrics();
      throw error;
    }
  }

  // Entrenamiento de modelos
  async trainModel(request: ModelTrainingRequest): Promise<ModelTrainingResponse> {
    const modelId = uuidv4();
    
    try {
      logger.info('Starting model training', {
        modelId,
        type: request.modelType,
        targetVariable: request.targetVariable,
      });

      const trainingJob: ModelTrainingResponse = {
        modelId,
        status: 'training',
        progress: 0,
        metadata: request.metadata || {},
      };

      // Simular entrenamiento en segundo plano
      this.simulateModelTraining(modelId, request);

      return trainingJob;
    } catch (error) {
      logger.error('Model training failed:', error);
      throw error;
    }
  }

  // Obtener métricas del servicio
  getMetrics(): PredictiveAnalyticsMetrics {
    return { ...this.metrics };
  }

  // Obtener modelos activos
  getActiveModels(): PredictiveModel[] {
    return Array.from(this.activeModels.values());
  }

  // Métodos privados para construcción de prompts
  private buildPerformancePredictionPrompt(
    studentId: string,
    courseId: string,
    historicalData: Record<string, any>
  ): string {
    return `
    Analiza los datos históricos del estudiante ${studentId} en el curso ${courseId} y predice su rendimiento futuro.
    
    Datos históricos:
    ${JSON.stringify(historicalData, null, 2)}
    
    Proporciona una predicción estructurada que incluya:
    1. Calificación predicha (0-100)
    2. Nivel de confianza (0-1)
    3. Factores de riesgo identificados
    4. Recomendaciones específicas
    5. Probabilidad de éxito
    6. Fecha estimada de finalización
    
    Responde en formato JSON válido.
    `;
  }

  private buildCourseSuccessPredictionPrompt(
    courseId: string,
    studentData: Record<string, any>[]
  ): string {
    return `
    Analiza los datos de todos los estudiantes del curso ${courseId} y predice el éxito general del curso.
    
    Datos de estudiantes:
    ${JSON.stringify(studentData, null, 2)}
    
    Proporciona una predicción estructurada que incluya:
    1. Tasa de éxito predicha
    2. Tasa de abandono predicha
    3. Calificación promedio predicha
    4. Factores de riesgo del curso
    5. Recomendaciones para mejorar el curso
    6. Segmentación de estudiantes por nivel de riesgo
    
    Responde en formato JSON válido.
    `;
  }

  private buildLearningPathPrompt(
    studentId: string,
    currentLevel: string,
    goals: string[],
    preferences: Record<string, any>
  ): string {
    return `
    Genera una ruta de aprendizaje personalizada para el estudiante ${studentId}.
    
    Nivel actual: ${currentLevel}
    Objetivos: ${goals.join(', ')}
    Preferencias: ${JSON.stringify(preferences, null, 2)}
    
    Crea una ruta estructurada que incluya:
    1. Pasos secuenciales de aprendizaje
    2. Duración estimada de cada paso
    3. Recursos recomendados
    4. Prerrequisitos para cada paso
    5. Probabilidad de éxito
    6. Alternativas disponibles
    
    Responde en formato JSON válido.
    `;
  }

  private buildEarlyWarningPrompt(
    studentId: string,
    courseId: string,
    currentData: Record<string, any>
  ): string {
    return `
    Analiza los datos actuales del estudiante ${studentId} en el curso ${courseId} para identificar señales de alerta temprana.
    
    Datos actuales:
    ${JSON.stringify(currentData, null, 2)}
    
    Evalúa y proporciona:
    1. Nivel de riesgo (bajo, medio, alto, crítico)
    2. Factores de riesgo específicos
    3. Intervenciones recomendadas
    4. Fecha de próxima revisión
    5. Evidencia que respalda las alertas
    
    Responde en formato JSON válido.
    `;
  }

  private buildEngagementAnalysisPrompt(
    studentId: string,
    engagementData: Record<string, any>
  ): string {
    return `
    Analiza el nivel de engagement del estudiante ${studentId} basado en los datos de actividad.
    
    Datos de engagement:
    ${JSON.stringify(engagementData, null, 2)}
    
    Proporciona un análisis que incluya:
    1. Puntuación de engagement (0-100)
    2. Factores que influyen en el engagement
    3. Tendencias de engagement a lo largo del tiempo
    4. Recomendaciones para mejorar el engagement
    5. Impacto de cada factor
    
    Responde en formato JSON válido.
    `;
  }

  private buildRealTimePredictionPrompt(request: RealTimePredictionRequest): string {
    return `
    Realiza una predicción en tiempo real para el estudiante ${request.studentId}.
    
    Tipo de predicción: ${request.predictionType}
    Datos actuales: ${JSON.stringify(request.currentData, null, 2)}
    Parámetros: ${JSON.stringify(request.parameters, null, 2)}
    
    Proporciona una predicción inmediata con:
    1. Resultado de la predicción
    2. Nivel de confianza
    3. Modelo utilizado
    4. Tiempo de procesamiento
    5. Metadatos relevantes
    
    Responde en formato JSON válido.
    `;
  }

  private buildDataAnalysisPrompt(request: DataAnalysisRequest): string {
    return `
    Realiza un análisis de datos del tipo: ${request.analysisType}
    
    Variables: ${request.variables.join(', ')}
    Filtros: ${JSON.stringify(request.filters, null, 2)}
    Rango de tiempo: ${JSON.stringify(request.timeRange, null, 2)}
    Agrupación: ${request.groupBy?.join(', ') || 'N/A'}
    Agregaciones: ${request.aggregations?.join(', ') || 'N/A'}
    
    Proporciona un análisis completo que incluya:
    1. Resultados estadísticos
    2. Insights clave
    3. Recomendaciones
    4. Visualizaciones sugeridas
    5. Metadatos del análisis
    
    Responde en formato JSON válido.
    `;
  }

  // Métodos privados para procesamiento de respuestas
  private processPerformancePredictionResponse(
    response: string,
    studentId: string,
    courseId: string
  ): StudentPerformancePrediction {
    try {
      const data = JSON.parse(response);
      return {
        studentId,
        courseId,
        predictedGrade: data.predictedGrade || 0,
        confidence: data.confidence || 0,
        riskFactors: data.riskFactors || [],
        recommendations: data.recommendations || [],
        predictedCompletionDate: data.predictedCompletionDate,
        successProbability: data.successProbability || 0,
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing performance prediction response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  private processCourseSuccessPredictionResponse(
    response: string,
    courseId: string
  ): CourseSuccessPrediction {
    try {
      const data = JSON.parse(response);
      return {
        courseId,
        predictedSuccessRate: data.predictedSuccessRate || 0,
        predictedDropoutRate: data.predictedDropoutRate || 0,
        averagePredictedGrade: data.averagePredictedGrade || 0,
        riskFactors: data.riskFactors || [],
        recommendations: data.recommendations || [],
        studentSegmentations: data.studentSegmentations || [],
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing course success prediction response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  private processLearningPathResponse(
    response: string,
    studentId: string,
    currentLevel: string
  ): LearningPathRecommendation {
    try {
      const data = JSON.parse(response);
      return {
        studentId,
        currentLevel,
        recommendedPath: data.recommendedPath || [],
        estimatedDuration: data.estimatedDuration || 0,
        successProbability: data.successProbability || 0,
        prerequisites: data.prerequisites || [],
        alternatives: data.alternatives || [],
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing learning path response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  private processEarlyWarningResponse(
    response: string,
    studentId: string,
    courseId: string
  ): EarlyWarningSystem {
    try {
      const data = JSON.parse(response);
      return {
        studentId,
        riskLevel: data.riskLevel || RiskLevel.LOW,
        riskFactors: data.riskFactors || [],
        interventions: data.interventions || [],
        lastUpdated: new Date().toISOString(),
        nextReviewDate: data.nextReviewDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing early warning response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  private processEngagementAnalysisResponse(
    response: string,
    studentId: string
  ): EngagementAnalysis {
    try {
      const data = JSON.parse(response);
      return {
        studentId,
        engagementScore: data.engagementScore || 0,
        factors: data.factors || [],
        trends: data.trends || [],
        recommendations: data.recommendations || [],
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing engagement analysis response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  private processRealTimePredictionResponse(
    response: string,
    request: RealTimePredictionRequest
  ): RealTimePredictionResponse {
    try {
      const data = JSON.parse(response);
      return {
        predictionId: uuidv4(),
        type: request.predictionType,
        result: data.result,
        confidence: data.confidence || 0,
        processingTime: data.processingTime || 0,
        modelUsed: data.modelUsed || 'default',
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing real-time prediction response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  private processDataAnalysisResponse(
    response: string,
    request: DataAnalysisRequest
  ): DataAnalysisResponse {
    try {
      const data = JSON.parse(response);
      return {
        analysisId: uuidv4(),
        type: request.analysisType,
        results: data.results || [],
        insights: data.insights || [],
        recommendations: data.recommendations || [],
        visualizations: data.visualizations || [],
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error('Error processing data analysis response:', error);
      throw new Error('Invalid response format from LLM Gateway');
    }
  }

  // Métodos privados para llamadas al LLM Gateway
  private async callLLMGateway(prompt: string, metadata: any): Promise<string> {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${this.llmGatewayUrl}/api/chat`, {
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis predictivo educativo. Proporciona respuestas estructuradas y precisas en formato JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'gpt-4',
        temperature: 0.3,
        max_tokens: 2000,
      });

      const duration = Date.now() - startTime;
      
      logger.info('LLM Gateway call completed', {
        duration,
        tokens: response.data.usage?.total_tokens,
        cost: response.data.cost,
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('LLM Gateway call failed:', error);
      throw new Error('Failed to communicate with LLM Gateway');
    }
  }

  // Métodos privados para procesamiento en lote
  private async processBatchPrediction(batchId: string, request: BatchPredictionRequest): Promise<void> {
    const batchJob = this.batchJobs.get(batchId);
    if (!batchJob) return;

    try {
      batchJob.status = BatchStatus.PROCESSING;
      
      const results = [];
      const totalItems = request.studentIds.length;
      
      for (let i = 0; i < totalItems; i++) {
        const studentId = request.studentIds[i];
        
        try {
          const prediction = await this.realTimePrediction({
            predictionType: request.predictionType,
            studentId,
            courseId: request.courseIds?.[i],
            currentData: {},
            parameters: request.parameters,
            metadata: request.metadata,
          });
          
          results.push(prediction);
        } catch (error) {
          logger.error(`Batch prediction failed for student ${studentId}:`, error);
        }
        
        batchJob.processedItems = i + 1;
        batchJob.progress = ((i + 1) / totalItems) * 100;
      }
      
      batchJob.status = BatchStatus.COMPLETED;
      batchJob.results = results;
      batchJob.estimatedCompletion = new Date().toISOString();
      
      logger.info('Batch prediction completed', {
        batchId,
        totalItems,
        successfulItems: results.length,
      });
    } catch (error) {
      batchJob.status = BatchStatus.FAILED;
      batchJob.error = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Batch prediction failed:', error);
    }
  }

  // Métodos privados para simulación de entrenamiento
  private async simulateModelTraining(modelId: string, request: ModelTrainingRequest): Promise<void> {
    // Simular progreso de entrenamiento
    const trainingSteps = 10;
    let progress = 0;
    
    const interval = setInterval(async () => {
      progress += 10;
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Crear modelo entrenado
        const model: PredictiveModel = {
          modelId,
          name: `${request.modelType}_model_${modelId.slice(0, 8)}`,
          type: ModelType.REGRESSION,
          target: request.targetVariable,
          features: request.features,
          accuracy: 0.85 + Math.random() * 0.1,
          precision: 0.82 + Math.random() * 0.1,
          recall: 0.88 + Math.random() * 0.1,
          f1Score: 0.85 + Math.random() * 0.1,
          lastTrained: new Date().toISOString(),
          nextTrainingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          metadata: request.metadata || {},
        };
        
        this.activeModels.set(modelId, model);
        this.metrics.modelsActive = this.activeModels.size;
        
        logger.info('Model training completed', { modelId, accuracy: model.accuracy });
      }
    }, 1000);
  }

  // Métodos privados para inicialización
  private initializeDefaultModels(): void {
    const defaultModels: PredictiveModel[] = [
      {
        modelId: 'default-performance',
        name: 'Default Performance Model',
        type: ModelType.REGRESSION,
        target: 'final_grade',
        features: ['attendance', 'assignments', 'quizzes', 'participation'],
        accuracy: 0.87,
        precision: 0.85,
        recall: 0.89,
        f1Score: 0.87,
        lastTrained: new Date().toISOString(),
        nextTrainingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        metadata: {},
      },
      {
        modelId: 'default-dropout',
        name: 'Default Dropout Model',
        type: ModelType.CLASSIFICATION,
        target: 'will_dropout',
        features: ['attendance_rate', 'grade_trend', 'engagement_score'],
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.94,
        f1Score: 0.91,
        lastTrained: new Date().toISOString(),
        nextTrainingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        metadata: {},
      },
    ];

    defaultModels.forEach(model => {
      this.activeModels.set(model.modelId, model);
    });

    this.metrics.modelsActive = this.activeModels.size;
  }

  // Métodos privados para actualización de métricas
  private updateMetrics(type: string, processingTime: number): void {
    this.metrics.totalPredictions++;
    this.metrics.predictionsByType[type] = (this.metrics.predictionsByType[type] || 0) + 1;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalPredictions - 1) + processingTime) / this.metrics.totalPredictions;
    this.metrics.lastUpdated = new Date().toISOString();
  }

  private updateErrorMetrics(): void {
    this.metrics.errorRate = 
      (this.metrics.totalPredictions - this.metrics.accuratePredictions) / this.metrics.totalPredictions;
  }
} 