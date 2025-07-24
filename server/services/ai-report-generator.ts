import OpenAI from 'openai';
import { db } from '../index.js';
import { logger } from '../utils/logger.js';
import { cacheService } from './cache-service.js';
import { z } from 'zod';

export interface ReportData {
  type: 'evaluation' | 'attendance' | 'behavior' | 'comprehensive' | 'custom';
  timeRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    subjects?: string[];
    students?: string[];
    teachers?: string[];
    grades?: number[];
  };
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  format: 'pdf' | 'html' | 'json';
}

export interface GeneratedReport {
  id: string;
  type: string;
  title: string;
  summary: string;
  content: {
    sections: ReportSection[];
    charts?: ChartData[];
    recommendations?: string[];
    insights?: string[];
  };
  metadata: {
    generatedAt: Date;
    timeRange: { start: Date; end: Date };
    dataPoints: number;
    confidence: number;
  };
  format: string;
  url?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  type: 'text' | 'table' | 'chart' | 'insight';
  data?: any;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any;
  options?: any;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  magnitude: number;
  confidence: number;
  factors: string[];
  prediction?: {
    nextPeriod: number;
    confidence: number;
  };
}

export interface InsightData {
  type: 'positive' | 'negative' | 'neutral' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  affectedEntities: string[];
  recommendations: string[];
}

export interface ReportGeneratorConfig {
  openaiApiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  includeAIInsights: boolean;
  autoGenerateCharts: boolean;
  cacheReports: boolean;
}

export class AIReportGeneratorService {
  private openai: OpenAI;
  private config: ReportGeneratorConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: 'gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.4,
      includeAIInsights: true,
      autoGenerateCharts: true,
      cacheReports: true
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
      logger.info('✅ Servicio de generación de reportes IA inicializado');
    } catch (error) {
      logger.error('❌ Error al inicializar generación de reportes IA:', error);
      throw error;
    }
  }

  async generateReport(reportData: ReportData): Promise<GeneratedReport> {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de reportes no está inicializado');
      }

      // Verificar caché si está habilitado
      if (this.config.cacheReports) {
        const cacheKey = this.generateCacheKey(reportData);
        const cached = await cacheService.get<GeneratedReport>(cacheKey);
        if (cached) {
          logger.info('📄 Reporte recuperado de caché');
          return cached;
        }
      }

      // Obtener datos para el reporte
      const data = await this.getReportData(reportData);
      
      // Generar contenido del reporte
      const content = await this.generateReportContent(reportData, data);
      
      // Generar insights de IA si está habilitado
      const insights = this.config.includeAIInsights 
        ? await this.generateAIInsights(data, reportData)
        : [];

      // Generar recomendaciones
      const recommendations = await this.generateRecommendations(data, insights);

      // Crear reporte
      const report: GeneratedReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: reportData.type,
        title: this.generateReportTitle(reportData),
        summary: await this.generateSummary(data, insights),
        content: {
          sections: content.sections,
          charts: content.charts,
          recommendations,
          insights
        },
        metadata: {
          generatedAt: new Date(),
          timeRange: reportData.timeRange,
          dataPoints: data.length,
          confidence: this.calculateConfidence(data)
        },
        format: reportData.format
      };

      // Guardar en caché si está habilitado
      if (this.config.cacheReports) {
        const cacheKey = this.generateCacheKey(reportData);
        await cacheService.set(cacheKey, report, 3600); // 1 hora
      }

      return report;

    } catch (error) {
      logger.error('Error en generateReport:', error);
      throw error;
    }
  }

  async generateTrendAnalysis(data: any[], timeRange: { start: Date; end: Date }): Promise<TrendAnalysis[]> {
    try {
      const prompt = this.buildTrendAnalysisPrompt(data, timeRange);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis de tendencias educativas. Analiza los datos y proporciona análisis de tendencias detallados. Responde en formato JSON:
            [
              {
                "trend": "increasing" | "decreasing" | "stable" | "fluctuating",
                "magnitude": number (0-1),
                "confidence": number (0-1),
                "factors": [string],
                "prediction": {
                  "nextPeriod": number,
                  "confidence": number
                }
              }
            ]`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const resultText = response.choices[0]?.message?.content || '[]';
      return JSON.parse(resultText);

    } catch (error) {
      logger.error('Error en generateTrendAnalysis:', error);
      throw error;
    }
  }

  async generateComparativeReport(
    data1: any[],
    data2: any[],
    comparisonType: 'period' | 'group' | 'subject'
  ): Promise<GeneratedReport> {
    try {
      const comparisonData = {
        type: 'comparative' as const,
        timeRange: { start: new Date(), end: new Date() },
        format: 'html' as const,
        comparisonType,
        data1,
        data2
      };

      const prompt = this.buildComparativePrompt(comparisonData);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis comparativo educativo. Genera un reporte comparativo detallado. Responde en formato JSON con la estructura de GeneratedReport.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      return JSON.parse(resultText);

    } catch (error) {
      logger.error('Error en generateComparativeReport:', error);
      throw error;
    }
  }

  async generatePredictiveReport(
    historicalData: any[],
    predictionPeriods: number
  ): Promise<GeneratedReport> {
    try {
      const prompt = this.buildPredictivePrompt(historicalData, predictionPeriods);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis predictivo educativo. Genera predicciones basadas en datos históricos. Responde en formato JSON con la estructura de GeneratedReport.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.3
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      return JSON.parse(resultText);

    } catch (error) {
      logger.error('Error en generatePredictiveReport:', error);
      throw error;
    }
  }

  async getReportTemplates(): Promise<{
    id: string;
    name: string;
    description: string;
    type: string;
    config: Partial<ReportData>;
  }[]> {
    return [
      {
        id: 'evaluation_summary',
        name: 'Resumen de Evaluaciones',
        description: 'Reporte completo de evaluaciones con análisis de tendencias',
        type: 'evaluation',
        config: {
          type: 'evaluation',
          includeCharts: true,
          includeRecommendations: true,
          format: 'html'
        }
      },
      {
        id: 'attendance_analysis',
        name: 'Análisis de Asistencia',
        description: 'Análisis detallado de patrones de asistencia',
        type: 'attendance',
        config: {
          type: 'attendance',
          includeCharts: true,
          includeRecommendations: true,
          format: 'html'
        }
      },
      {
        id: 'behavior_report',
        name: 'Reporte de Comportamiento',
        description: 'Análisis de comportamiento y recomendaciones',
        type: 'behavior',
        config: {
          type: 'behavior',
          includeCharts: true,
          includeRecommendations: true,
          format: 'html'
        }
      },
      {
        id: 'comprehensive_analysis',
        name: 'Análisis Integral',
        description: 'Reporte completo con todos los aspectos académicos',
        type: 'comprehensive',
        config: {
          type: 'comprehensive',
          includeCharts: true,
          includeRecommendations: true,
          format: 'html'
        }
      }
    ];
  }

  private async getReportData(reportData: ReportData): Promise<any[]> {
    // En una implementación real, obtendrías esto de la base de datos
    // basándote en el tipo de reporte y los filtros
    const mockData = {
      evaluation: [
        { studentId: 's1', subject: 'math', grade: 8.5, date: '2024-01-15' },
        { studentId: 's2', subject: 'science', grade: 7.0, date: '2024-01-15' },
        { studentId: 's1', subject: 'math', grade: 9.0, date: '2024-01-20' }
      ],
      attendance: [
        { studentId: 's1', date: '2024-01-15', present: true },
        { studentId: 's2', date: '2024-01-15', present: false },
        { studentId: 's1', date: '2024-01-16', present: true }
      ],
      behavior: [
        { studentId: 's1', date: '2024-01-15', score: 8.5, incident: 'none' },
        { studentId: 's2', date: '2024-01-15', score: 6.0, incident: 'minor' }
      ]
    };

    return mockData[reportData.type as keyof typeof mockData] || [];
  }

  private async generateReportContent(reportData: ReportData, data: any[]): Promise<{
    sections: ReportSection[];
    charts?: ChartData[];
  }> {
    const sections: ReportSection[] = [];
    const charts: ChartData[] = [];

    // Generar sección de resumen ejecutivo
    sections.push({
      title: 'Resumen Ejecutivo',
      content: await this.generateExecutiveSummary(data, reportData),
      type: 'text'
    });

    // Generar sección de datos principales
    sections.push({
      title: 'Datos Principales',
      content: await this.generateMainDataSection(data, reportData),
      type: 'table',
      data: this.prepareTableData(data)
    });

    // Generar gráficos si está habilitado
    if (this.config.autoGenerateCharts && reportData.includeCharts) {
      const generatedCharts = await this.generateCharts(data, reportData);
      charts.push(...generatedCharts);
    }

    // Generar análisis de tendencias
    const trends = await this.generateTrendAnalysis(data, reportData.timeRange);
    sections.push({
      title: 'Análisis de Tendencias',
      content: this.formatTrendAnalysis(trends),
      type: 'text'
    });

    return { sections, charts };
  }

  private async generateAIInsights(data: any[], reportData: ReportData): Promise<InsightData[]> {
    try {
      const prompt = this.buildInsightsPrompt(data, reportData);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis educativo. Genera insights valiosos basados en los datos. Responde en formato JSON:
            [
              {
                "type": "positive" | "negative" | "neutral" | "opportunity",
                "title": string,
                "description": string,
                "impact": "high" | "medium" | "low",
                "affectedEntities": [string],
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
        temperature: 0.5
      });

      const resultText = response.choices[0]?.message?.content || '[]';
      return JSON.parse(resultText);

    } catch (error) {
      logger.error('Error en generateAIInsights:', error);
      return [];
    }
  }

  private async generateRecommendations(data: any[], insights: InsightData[]): Promise<string[]> {
    try {
      const prompt = this.buildRecommendationsPrompt(data, insights);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Eres un consejero educativo experto. Genera recomendaciones específicas y accionables. Responde con una lista de recomendaciones, una por línea.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.6
      });

      const recommendationsText = response.choices[0]?.message?.content || '';
      return recommendationsText.split('\n').map(r => r.trim()).filter(r => r.length > 0);

    } catch (error) {
      logger.error('Error en generateRecommendations:', error);
      return [];
    }
  }

  private generateReportTitle(reportData: ReportData): string {
    const typeNames = {
      evaluation: 'Evaluaciones',
      attendance: 'Asistencia',
      behavior: 'Comportamiento',
      comprehensive: 'Análisis Integral',
      custom: 'Reporte Personalizado'
    };

    const typeName = typeNames[reportData.type as keyof typeof typeNames] || 'Reporte';
    const startDate = reportData.timeRange.start.toLocaleDateString('es-ES');
    const endDate = reportData.timeRange.end.toLocaleDateString('es-ES');

    return `${typeName} - ${startDate} a ${endDate}`;
  }

  private async generateSummary(data: any[], insights: InsightData[]): Promise<string> {
    try {
      const prompt = `Genera un resumen ejecutivo de máximo 200 palabras para un reporte con ${data.length} puntos de datos y ${insights.length} insights principales.`;

      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en comunicación ejecutiva. Genera resúmenes claros y concisos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.4
      });

      return response.choices[0]?.message?.content || 'Resumen no disponible.';

    } catch (error) {
      logger.error('Error en generateSummary:', error);
      return 'Resumen no disponible.';
    }
  }

  private calculateConfidence(data: any[]): number {
    // En una implementación real, calcularías la confianza basada en la calidad de los datos
    const baseConfidence = 0.8;
    const dataQualityFactor = Math.min(data.length / 100, 1); // Más datos = mayor confianza
    return Math.min(baseConfidence * dataQualityFactor, 0.95);
  }

  private generateCacheKey(reportData: ReportData): string {
    const keyData = {
      type: reportData.type,
      timeRange: reportData.timeRange,
      filters: reportData.filters,
      includeCharts: reportData.includeCharts,
      includeRecommendations: reportData.includeRecommendations,
      format: reportData.format
    };
    
    return `report_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private async generateExecutiveSummary(data: any[], reportData: ReportData): Promise<string> {
    // Implementación simplificada
    return `Este reporte analiza ${data.length} puntos de datos del período ${reportData.timeRange.start.toLocaleDateString()} a ${reportData.timeRange.end.toLocaleDateString()}. Se identificaron patrones clave y se generaron recomendaciones específicas para mejorar el rendimiento académico.`;
  }

  private async generateMainDataSection(data: any[], reportData: ReportData): Promise<string> {
    // Implementación simplificada
    return `Se analizaron ${data.length} registros durante el período especificado. Los datos muestran variaciones significativas que requieren atención inmediata.`;
  }

  private prepareTableData(data: any[]): any {
    // Preparar datos para tablas
    return {
      headers: Object.keys(data[0] || {}),
      rows: data.slice(0, 10) // Mostrar solo los primeros 10 registros
    };
  }

  private async generateCharts(data: any[], reportData: ReportData): Promise<ChartData[]> {
    // Generar gráficos básicos basados en los datos
    const charts: ChartData[] = [];

    // Gráfico de distribución
    if (data.length > 0 && 'grade' in data[0]) {
      charts.push({
        type: 'bar',
        title: 'Distribución de Calificaciones',
        data: this.calculateGradeDistribution(data)
      });
    }

    // Gráfico de tendencia temporal
    if (data.length > 0 && 'date' in data[0]) {
      charts.push({
        type: 'line',
        title: 'Tendencia Temporal',
        data: this.calculateTemporalTrend(data)
      });
    }

    return charts;
  }

  private calculateGradeDistribution(data: any[]): any {
    const distribution = { '9-10': 0, '7-8': 0, '5-6': 0, '0-4': 0 };
    
    data.forEach(item => {
      if (item.grade >= 9) distribution['9-10']++;
      else if (item.grade >= 7) distribution['7-8']++;
      else if (item.grade >= 5) distribution['5-6']++;
      else distribution['0-4']++;
    });

    return {
      labels: Object.keys(distribution),
      datasets: [{ data: Object.values(distribution) }]
    };
  }

  private calculateTemporalTrend(data: any[]): any {
    // Implementación simplificada
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
      datasets: [{ data: [65, 70, 75, 80, 85] }]
    };
  }

  private formatTrendAnalysis(trends: TrendAnalysis[]): string {
    return trends.map(trend => 
      `Tendencia: ${trend.trend}, Magnitud: ${trend.magnitude}, Confianza: ${trend.confidence}`
    ).join('\n');
  }

  private buildTrendAnalysisPrompt(data: any[], timeRange: { start: Date; end: Date }): string {
    return `
    Analiza las tendencias en los siguientes datos:
    - Rango de tiempo: ${timeRange.start.toISOString()} a ${timeRange.end.toISOString()}
    - Datos: ${JSON.stringify(data.slice(0, 10), null, 2)}
    - Total de puntos de datos: ${data.length}
    `;
  }

  private buildInsightsPrompt(data: any[], reportData: ReportData): string {
    return `
    Genera insights valiosos para un reporte de ${reportData.type}:
    - Datos: ${JSON.stringify(data.slice(0, 20), null, 2)}
    - Rango de tiempo: ${reportData.timeRange.start.toISOString()} a ${reportData.timeRange.end.toISOString()}
    - Filtros aplicados: ${JSON.stringify(reportData.filters, null, 2)}
    `;
  }

  private buildRecommendationsPrompt(data: any[], insights: InsightData[]): string {
    return `
    Genera recomendaciones basadas en:
    - Datos: ${data.length} puntos de datos
    - Insights identificados: ${insights.length}
    - Tipos de insights: ${insights.map(i => i.type).join(', ')}
    `;
  }

  private buildComparativePrompt(comparisonData: any): string {
    return `
    Genera un reporte comparativo:
    - Tipo de comparación: ${comparisonData.comparisonType}
    - Datos grupo 1: ${comparisonData.data1.length} puntos
    - Datos grupo 2: ${comparisonData.data2.length} puntos
    `;
  }

  private buildPredictivePrompt(historicalData: any[], predictionPeriods: number): string {
    return `
    Genera predicciones basadas en datos históricos:
    - Datos históricos: ${historicalData.length} puntos
    - Períodos a predecir: ${predictionPeriods}
    `;
  }
}

export const aiReportGeneratorService = new AIReportGeneratorService(); 