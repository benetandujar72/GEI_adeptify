import OpenAI from 'openai';
import { db } from '../index.js';
import { logger } from '../utils/logger.js';
import { cacheService } from './cache-service.js';
import { z } from 'zod';

export interface PredictionData {
  studentId: string;
  subjectId: string;
  currentGrade: number;
  attendanceRate: number;
  studyTime: number;
  previousGrades: number[];
  behaviorScore: number;
  participationRate: number;
}

export interface PredictionResult {
  studentId: string;
  subjectId: string;
  predictedGrade: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface PatternData {
  type: 'attendance' | 'grades' | 'behavior' | 'participation';
  data: any[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface PatternResult {
  patternType: string;
  description: string;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  affectedStudents: string[];
  recommendations: string[];
}

export interface AlertData {
  type: 'academic' | 'behavioral' | 'attendance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedUsers: string[];
  data: any;
  timestamp: Date;
  resolved: boolean;
}

export interface AnalyticsConfig {
  openaiApiKey: string;
  predictionThreshold: number;
  alertThreshold: number;
  patternDetectionSensitivity: number;
  maxPredictionsPerBatch: number;
}

export class AIAnalyticsService {
  private openai: OpenAI;
  private config: AnalyticsConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      predictionThreshold: 0.7,
      alertThreshold: 0.8,
      patternDetectionSensitivity: 0.6,
      maxPredictionsPerBatch: 50
    };

    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey
    });
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.openaiApiKey) {
        throw new Error('OPENAI_API_KEY no está configurada');
      }

      // Verificar conexión con OpenAI
      await this.openai.models.list();
      this.isInitialized = true;
      logger.info('✅ Servicio de análisis predictivo IA inicializado');
    } catch (error) {
      logger.error('❌ Error al inicializar análisis predictivo IA:', error);
      throw error;
    }
  }

  async predictStudentPerformance(data: PredictionData): Promise<PredictionResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de análisis no está inicializado');
      }

      const prompt = this.buildPredictionPrompt(data);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis educativo predictivo. Analiza los datos del estudiante y proporciona predicciones precisas sobre su rendimiento académico. Responde en formato JSON con la siguiente estructura:
            {
              "predictedGrade": number (0-10),
              "confidence": number (0-1),
              "riskLevel": "low" | "medium" | "high",
              "factors": [string],
              "recommendations": [string],
              "trend": "improving" | "stable" | "declining"
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(resultText);

      return {
        studentId: data.studentId,
        subjectId: data.subjectId,
        predictedGrade: result.predictedGrade || 5.0,
        confidence: result.confidence || 0.5,
        riskLevel: result.riskLevel || 'medium',
        factors: result.factors || [],
        recommendations: result.recommendations || [],
        trend: result.trend || 'stable'
      };

    } catch (error) {
      logger.error('Error en predictStudentPerformance:', error);
      throw error;
    }
  }

  async predictBatchPerformance(dataArray: PredictionData[]): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    
    // Procesar en lotes para evitar sobrecarga
    const batches = this.chunkArray(dataArray, this.config.maxPredictionsPerBatch);
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(data => this.predictStudentPerformance(data))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async detectPatterns(patternData: PatternData): Promise<PatternResult[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de análisis no está inicializado');
      }

      const prompt = this.buildPatternDetectionPrompt(patternData);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en detección de patrones educativos. Analiza los datos y identifica patrones significativos. Responde en formato JSON con la siguiente estructura:
            [
              {
                "patternType": string,
                "description": string,
                "confidence": number (0-1),
                "impact": "positive" | "negative" | "neutral",
                "affectedStudents": [string],
                "recommendations": [string]
              }
            ]`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.4
      });

      const resultText = response.choices[0]?.message?.content || '[]';
      const patterns = JSON.parse(resultText);

      return patterns.map((pattern: any) => ({
        patternType: pattern.patternType || 'unknown',
        description: pattern.description || '',
        confidence: pattern.confidence || 0.5,
        impact: pattern.impact || 'neutral',
        affectedStudents: pattern.affectedStudents || [],
        recommendations: pattern.recommendations || []
      }));

    } catch (error) {
      logger.error('Error en detectPatterns:', error);
      throw error;
    }
  }

  async generateEarlyWarnings(): Promise<AlertData[]> {
    try {
      // Obtener datos recientes de la base de datos
      const recentData = await this.getRecentAcademicData();
      
      const alerts: AlertData[] = [];

      // Analizar tendencias de asistencia
      const attendanceAlerts = await this.analyzeAttendanceTrends(recentData);
      alerts.push(...attendanceAlerts);

      // Analizar tendencias de calificaciones
      const gradeAlerts = await this.analyzeGradeTrends(recentData);
      alerts.push(...gradeAlerts);

      // Analizar comportamiento
      const behaviorAlerts = await this.analyzeBehaviorTrends(recentData);
      alerts.push(...behaviorAlerts);

      // Filtrar alertas por umbral de confianza
      return alerts.filter(alert => 
        this.getAlertSeverityScore(alert.severity) >= this.config.alertThreshold
      );

    } catch (error) {
      logger.error('Error en generateEarlyWarnings:', error);
      throw error;
    }
  }

  async generatePersonalizedRecommendations(studentId: string): Promise<{
    academic: string[];
    behavioral: string[];
    attendance: string[];
    general: string[];
  }> {
    try {
      const studentData = await this.getStudentData(studentId);
      
      const prompt = this.buildRecommendationPrompt(studentData);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un consejero educativo experto. Basándote en los datos del estudiante, genera recomendaciones personalizadas y específicas. Responde en formato JSON:
            {
              "academic": [string],
              "behavioral": [string],
              "attendance": [string],
              "general": [string]
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.5
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      return JSON.parse(resultText);

    } catch (error) {
      logger.error('Error en generatePersonalizedRecommendations:', error);
      throw error;
    }
  }

  async getAnalyticsInsights(timeRange: { start: Date; end: Date }): Promise<{
    overallTrends: any[];
    keyMetrics: Record<string, number>;
    topPerformers: string[];
    studentsAtRisk: string[];
    recommendations: string[];
  }> {
    try {
      const data = await this.getAnalyticsData(timeRange);
      
      const prompt = this.buildInsightsPrompt(data);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un analista educativo experto. Analiza los datos y proporciona insights valiosos. Responde en formato JSON:
            {
              "overallTrends": [object],
              "keyMetrics": object,
              "topPerformers": [string],
              "studentsAtRisk": [string],
              "recommendations": [string]
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.4
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      return JSON.parse(resultText);

    } catch (error) {
      logger.error('Error en getAnalyticsInsights:', error);
      throw error;
    }
  }

  private buildPredictionPrompt(data: PredictionData): string {
    return `
    Datos del estudiante para predicción:
    - ID: ${data.studentId}
    - Asignatura: ${data.subjectId}
    - Calificación actual: ${data.currentGrade}/10
    - Tasa de asistencia: ${data.attendanceRate}%
    - Tiempo de estudio: ${data.studyTime} horas/semana
    - Calificaciones anteriores: [${data.previousGrades.join(', ')}]
    - Puntuación de comportamiento: ${data.behaviorScore}/10
    - Tasa de participación: ${data.participationRate}%

    Analiza estos datos y predice el rendimiento futuro del estudiante.
    `;
  }

  private buildPatternDetectionPrompt(data: PatternData): string {
    return `
    Datos para detección de patrones:
    - Tipo: ${data.type}
    - Rango de tiempo: ${data.timeRange.start.toISOString()} a ${data.timeRange.end.toISOString()}
    - Datos: ${JSON.stringify(data.data, null, 2)}

    Identifica patrones significativos en estos datos.
    `;
  }

  private buildRecommendationPrompt(studentData: any): string {
    return `
    Datos del estudiante para recomendaciones:
    ${JSON.stringify(studentData, null, 2)}

    Genera recomendaciones personalizadas basadas en estos datos.
    `;
  }

  private buildInsightsPrompt(data: any): string {
    return `
    Datos de análisis para insights:
    ${JSON.stringify(data, null, 2)}

    Proporciona insights valiosos y recomendaciones basadas en estos datos.
    `;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getAlertSeverityScore(severity: string): number {
    const scores = {
      'low': 0.3,
      'medium': 0.6,
      'high': 0.8,
      'critical': 1.0
    };
    return scores[severity as keyof typeof scores] || 0.5;
  }

  private async getRecentAcademicData(): Promise<any[]> {
    // En una implementación real, obtendrías esto de la base de datos
    // Por ahora, retornamos datos de ejemplo
    return [
      {
        studentId: 'student1',
        subjectId: 'math',
        grade: 7.5,
        attendance: 85,
        behavior: 8.0,
        participation: 75,
        timestamp: new Date()
      }
    ];
  }

  private async getStudentData(studentId: string): Promise<any> {
    // En una implementación real, obtendrías esto de la base de datos
    return {
      studentId,
      grades: [7.5, 8.0, 6.5, 7.0],
      attendance: [90, 85, 80, 95],
      behavior: [8.0, 7.5, 8.5, 7.0],
      participation: [80, 75, 85, 90]
    };
  }

  private async getAnalyticsData(timeRange: { start: Date; end: Date }): Promise<any> {
    // En una implementación real, obtendrías esto de la base de datos
    return {
      timeRange,
      totalStudents: 150,
      averageGrade: 7.2,
      averageAttendance: 88,
      averageBehavior: 7.8,
      gradeDistribution: {
        '9-10': 15,
        '7-8': 45,
        '5-6': 60,
        '0-4': 30
      }
    };
  }

  private async analyzeAttendanceTrends(data: any[]): Promise<AlertData[]> {
    const alerts: AlertData[] = [];
    
    // Lógica de análisis de asistencia
    const lowAttendanceStudents = data.filter(d => d.attendance < 80);
    
    for (const student of lowAttendanceStudents) {
      alerts.push({
        type: 'attendance',
        severity: 'medium',
        title: 'Baja asistencia detectada',
        description: `El estudiante ${student.studentId} tiene una tasa de asistencia del ${student.attendance}%`,
        affectedUsers: [student.studentId],
        data: student,
        timestamp: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  private async analyzeGradeTrends(data: any[]): Promise<AlertData[]> {
    const alerts: AlertData[] = [];
    
    // Lógica de análisis de calificaciones
    const lowGradeStudents = data.filter(d => d.grade < 5);
    
    for (const student of lowGradeStudents) {
      alerts.push({
        type: 'academic',
        severity: 'high',
        title: 'Calificación baja detectada',
        description: `El estudiante ${student.studentId} tiene una calificación de ${student.grade}/10`,
        affectedUsers: [student.studentId],
        data: student,
        timestamp: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  private async analyzeBehaviorTrends(data: any[]): Promise<AlertData[]> {
    const alerts: AlertData[] = [];
    
    // Lógica de análisis de comportamiento
    const lowBehaviorStudents = data.filter(d => d.behavior < 6);
    
    for (const student of lowBehaviorStudents) {
      alerts.push({
        type: 'behavioral',
        severity: 'medium',
        title: 'Problema de comportamiento detectado',
        description: `El estudiante ${student.studentId} tiene una puntuación de comportamiento de ${student.behavior}/10`,
        affectedUsers: [student.studentId],
        data: student,
        timestamp: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  async getPredictionAccuracy(): Promise<{
    overallAccuracy: number;
    accuracyBySubject: Record<string, number>;
    accuracyByGrade: Record<string, number>;
    recentPredictions: number;
  }> {
    // En una implementación real, calcularías la precisión real
    // Por ahora, retornamos datos de ejemplo
    return {
      overallAccuracy: 0.85,
      accuracyBySubject: {
        'math': 0.88,
        'science': 0.82,
        'language': 0.85
      },
      accuracyByGrade: {
        '9-10': 0.90,
        '7-8': 0.85,
        '5-6': 0.80,
        '0-4': 0.75
      },
      recentPredictions: 150
    };
  }
}

export const aiAnalyticsService = new AIAnalyticsService(); 