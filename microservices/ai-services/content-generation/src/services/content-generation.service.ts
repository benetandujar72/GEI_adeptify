import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import {
  ContentGenerationRequest,
  ContentGenerationResponse,
  QuizGenerationRequest,
  QuizGenerationResponse,
  AssignmentGenerationRequest,
  AssignmentGenerationResponse,
  SummaryGenerationRequest,
  SummaryGenerationResponse,
  ExplanationGenerationRequest,
  ExplanationGenerationResponse,
  ContentGenerationJob,
  ContentGenerationMetrics,
  ContentQualityCheck,
  ContentTranslationRequest,
  ContentTranslationResponse,
  ContentAdaptationRequest,
  ContentAdaptationResponse,
  JobStatus,
  ContentType,
} from '../types/content.types.js';

export class ContentGenerationService {
  private llmGatewayUrl: string;
  private metrics: ContentGenerationMetrics;

  constructor() {
    this.llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3003';
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      requestsByType: {},
      requestsBySubject: {},
      requestsByGrade: {},
      popularTopics: [],
      errorRate: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Generar contenido educativo
   */
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting content generation job: ${jobId}`, { type: request.type, subject: request.subject });

      // Actualizar métricas
      this.updateMetrics(request.type, request.subject, request.grade, request.topic);

      // Construir prompt para el LLM
      const prompt = this.buildContentPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, request);

      // Procesar respuesta
      const content = this.processLLMResponse(llmResponse, request.format);

      // Generar metadatos
      const metadata = this.generateMetadata(request, content);

      // Crear respuesta
      const response: ContentGenerationResponse = {
        id: jobId,
        content: content,
        title: this.generateTitle(request.topic, request.subject),
        summary: this.generateSummary(content),
        keywords: this.extractKeywords(content),
        estimatedReadingTime: this.calculateReadingTime(content),
        difficulty: request.difficulty,
        grade: request.grade,
        subject: request.subject,
        topic: request.topic,
        format: request.format,
        metadata: metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Actualizar métricas de éxito
      this.updateSuccessMetrics(Date.now() - startTime);

      logger.info(`Content generation completed: ${jobId}`, { 
        type: request.type, 
        subject: request.subject,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      // Actualizar métricas de error
      this.updateErrorMetrics();

      logger.error(`Content generation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: request.type,
        subject: request.subject 
      });

      throw error;
    }
  }

  /**
   * Generar quiz educativo
   */
  async generateQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting quiz generation job: ${jobId}`, { subject: request.subject, topic: request.topic });

      // Construir prompt para el quiz
      const prompt = this.buildQuizPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'quiz' });

      // Procesar respuesta del quiz
      const quizData = this.processQuizResponse(llmResponse, request);

      // Crear respuesta
      const response: QuizGenerationResponse = {
        id: jobId,
        title: `Quiz: ${request.topic}`,
        description: `Quiz sobre ${request.topic} para ${request.grade}`,
        subject: request.subject,
        topic: request.topic,
        grade: request.grade,
        difficulty: request.difficulty,
        questions: quizData.questions,
        totalPoints: quizData.totalPoints,
        estimatedTime: request.timeLimit || this.calculateQuizTime(quizData.questions),
        instructions: this.generateQuizInstructions(request),
        metadata: {
          questionTypes: request.questionTypes,
          includeExplanations: request.includeExplanations,
          language: request.language,
        },
        createdAt: new Date().toISOString(),
      };

      logger.info(`Quiz generation completed: ${jobId}`, { 
        subject: request.subject, 
        topic: request.topic,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Quiz generation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        subject: request.subject,
        topic: request.topic 
      });

      throw error;
    }
  }

  /**
   * Generar tarea/assignment
   */
  async generateAssignment(request: AssignmentGenerationRequest): Promise<AssignmentGenerationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting assignment generation job: ${jobId}`, { type: request.type, subject: request.subject });

      // Construir prompt para la tarea
      const prompt = this.buildAssignmentPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'assignment' });

      // Procesar respuesta de la tarea
      const assignmentData = this.processAssignmentResponse(llmResponse, request);

      // Crear respuesta
      const response: AssignmentGenerationResponse = {
        id: jobId,
        title: assignmentData.title,
        description: assignmentData.description,
        objectives: assignmentData.objectives,
        instructions: assignmentData.instructions,
        requirements: assignmentData.requirements,
        rubric: request.includeRubric ? assignmentData.rubric : undefined,
        resources: request.includeResources ? assignmentData.resources : undefined,
        estimatedDuration: this.calculateAssignmentDuration(request.duration, request.type),
        groupSize: request.groupSize,
        subject: request.subject,
        topic: request.topic,
        grade: request.grade,
        difficulty: request.difficulty,
        metadata: {
          type: request.type,
          duration: request.duration,
          includeRubric: request.includeRubric,
          includeResources: request.includeResources,
          language: request.language,
        },
        createdAt: new Date().toISOString(),
      };

      logger.info(`Assignment generation completed: ${jobId}`, { 
        type: request.type, 
        subject: request.subject,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Assignment generation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: request.type,
        subject: request.subject 
      });

      throw error;
    }
  }

  /**
   * Generar resumen
   */
  async generateSummary(request: SummaryGenerationRequest): Promise<SummaryGenerationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting summary generation job: ${jobId}`, { type: request.type, format: request.format });

      // Construir prompt para el resumen
      const prompt = this.buildSummaryPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'summary' });

      // Procesar respuesta del resumen
      const summaryData = this.processSummaryResponse(llmResponse, request);

      // Crear respuesta
      const response: SummaryGenerationResponse = {
        id: jobId,
        originalContent: request.content,
        summary: summaryData.summary,
        keyPoints: summaryData.keyPoints,
        questions: request.includeQuestions ? summaryData.questions : undefined,
        wordCount: this.countWords(summaryData.summary),
        readingTime: this.calculateReadingTime(summaryData.summary),
        format: request.format,
        language: request.language,
        metadata: {
          type: request.type,
          includeKeyPoints: request.includeKeyPoints,
          includeQuestions: request.includeQuestions,
          originalWordCount: this.countWords(request.content),
        },
        createdAt: new Date().toISOString(),
      };

      logger.info(`Summary generation completed: ${jobId}`, { 
        type: request.type, 
        format: request.format,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Summary generation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: request.type,
        format: request.format 
      });

      throw error;
    }
  }

  /**
   * Generar explicación
   */
  async generateExplanation(request: ExplanationGenerationRequest): Promise<ExplanationGenerationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting explanation generation job: ${jobId}`, { concept: request.concept, subject: request.subject });

      // Construir prompt para la explicación
      const prompt = this.buildExplanationPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'explanation' });

      // Procesar respuesta de la explicación
      const explanationData = this.processExplanationResponse(llmResponse, request);

      // Crear respuesta
      const response: ExplanationGenerationResponse = {
        id: jobId,
        concept: request.concept,
        explanation: explanationData.explanation,
        examples: explanationData.examples,
        analogies: request.includeAnalogies ? explanationData.analogies : undefined,
        visualAids: request.includeVisualAids ? explanationData.visualAids : undefined,
        relatedConcepts: explanationData.relatedConcepts,
        difficulty: this.assessDifficulty(request.grade, request.concept),
        grade: request.grade,
        subject: request.subject,
        metadata: {
          style: request.style,
          includeExamples: request.includeExamples,
          includeAnalogies: request.includeAnalogies,
          includeVisualAids: request.includeVisualAids,
          language: request.language,
        },
        createdAt: new Date().toISOString(),
      };

      logger.info(`Explanation generation completed: ${jobId}`, { 
        concept: request.concept, 
        subject: request.subject,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Explanation generation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        concept: request.concept,
        subject: request.subject 
      });

      throw error;
    }
  }

  /**
   * Traducir contenido
   */
  async translateContent(request: ContentTranslationRequest): Promise<ContentTranslationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting content translation job: ${jobId}`, { 
        sourceLanguage: request.sourceLanguage, 
        targetLanguage: request.targetLanguage 
      });

      // Construir prompt para traducción
      const prompt = this.buildTranslationPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'translation' });

      // Procesar respuesta de traducción
      const translationData = this.processTranslationResponse(llmResponse, request);

      // Crear respuesta
      const response: ContentTranslationResponse = {
        id: jobId,
        originalContent: request.content,
        translatedContent: translationData.translatedContent,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        glossary: request.includeGlossary ? translationData.glossary : undefined,
        confidence: translationData.confidence,
        metadata: {
          preserveFormatting: request.preserveFormatting,
          includeGlossary: request.includeGlossary,
          originalWordCount: this.countWords(request.content),
          translatedWordCount: this.countWords(translationData.translatedContent),
        },
        createdAt: new Date().toISOString(),
      };

      logger.info(`Content translation completed: ${jobId}`, { 
        sourceLanguage: request.sourceLanguage, 
        targetLanguage: request.targetLanguage,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Content translation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage 
      });

      throw error;
    }
  }

  /**
   * Adaptar contenido
   */
  async adaptContent(request: ContentAdaptationRequest): Promise<ContentAdaptationResponse> {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      logger.info(`Starting content adaptation job: ${jobId}`, { 
        adaptationType: request.adaptationType, 
        targetAudience: request.targetAudience 
      });

      // Construir prompt para adaptación
      const prompt = this.buildAdaptationPrompt(request);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'adaptation' });

      // Procesar respuesta de adaptación
      const adaptationData = this.processAdaptationResponse(llmResponse, request);

      // Crear respuesta
      const response: ContentAdaptationResponse = {
        id: jobId,
        originalContent: request.content,
        adaptedContent: adaptationData.adaptedContent,
        adaptationType: request.adaptationType,
        changes: adaptationData.changes,
        confidence: adaptationData.confidence,
        metadata: {
          targetAudience: request.targetAudience,
          parameters: request.parameters,
          preserveOriginal: request.preserveOriginal,
          originalWordCount: this.countWords(request.content),
          adaptedWordCount: this.countWords(adaptationData.adaptedContent),
        },
        createdAt: new Date().toISOString(),
      };

      logger.info(`Content adaptation completed: ${jobId}`, { 
        adaptationType: request.adaptationType, 
        targetAudience: request.targetAudience,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Content adaptation failed: ${jobId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        adaptationType: request.adaptationType,
        targetAudience: request.targetAudience 
      });

      throw error;
    }
  }

  /**
   * Verificar calidad del contenido
   */
  async checkContentQuality(contentId: string, content: string): Promise<ContentQualityCheck> {
    const startTime = Date.now();

    try {
      logger.info(`Starting content quality check: ${contentId}`);

      // Construir prompt para verificación de calidad
      const prompt = this.buildQualityCheckPrompt(content);

      // Llamar al LLM Gateway
      const llmResponse = await this.callLLMGateway(prompt, { type: 'quality-check' });

      // Procesar respuesta de verificación
      const qualityData = this.processQualityCheckResponse(llmResponse);

      // Crear respuesta
      const response: ContentQualityCheck = {
        id: uuidv4(),
        contentId: contentId,
        readabilityScore: qualityData.readabilityScore,
        grammarScore: qualityData.grammarScore,
        relevanceScore: qualityData.relevanceScore,
        accuracyScore: qualityData.accuracyScore,
        suggestions: qualityData.suggestions,
        overallScore: this.calculateOverallScore(qualityData),
        checkedAt: new Date().toISOString(),
      };

      logger.info(`Content quality check completed: ${contentId}`, { 
        overallScore: response.overallScore,
        processingTime: Date.now() - startTime 
      });

      return response;

    } catch (error) {
      logger.error(`Content quality check failed: ${contentId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      throw error;
    }
  }

  /**
   * Obtener métricas del servicio
   */
  getMetrics(): ContentGenerationMetrics {
    return { ...this.metrics };
  }

  // Métodos privados

  private async callLLMGateway(prompt: string, metadata: any): Promise<string> {
    try {
      const response = await axios.post(`${this.llmGatewayUrl}/api/chat`, {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4',
        max_tokens: 4000,
        temperature: 0.7,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LLM_GATEWAY_API_KEY}`,
        },
        timeout: 60000, // 60 segundos
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('LLM Gateway call failed:', error);
      throw new Error('Failed to generate content with AI model');
    }
  }

  private buildContentPrompt(request: ContentGenerationRequest): string {
    return `
Genera contenido educativo de alta calidad con las siguientes especificaciones:

Tipo: ${request.type}
Materia: ${request.subject}
Grado: ${request.grade}
Tema: ${request.topic}
Dificultad: ${request.difficulty}
Idioma: ${request.language}
Formato: ${request.format}
Longitud: ${request.length}
Estilo: ${request.style}
Incluir ejemplos: ${request.includeExamples ? 'Sí' : 'No'}
Incluir ejercicios: ${request.includeExercises ? 'Sí' : 'No'}
Incluir imágenes: ${request.includeImages ? 'Sí' : 'No'}

${request.customPrompt ? `Instrucciones adicionales: ${request.customPrompt}` : ''}

Por favor, genera contenido educativo completo, bien estructurado y apropiado para el nivel especificado.
    `.trim();
  }

  private buildQuizPrompt(request: QuizGenerationRequest): string {
    return `
Genera un quiz educativo con las siguientes especificaciones:

Materia: ${request.subject}
Tema: ${request.topic}
Grado: ${request.grade}
Dificultad: ${request.difficulty}
Tipos de preguntas: ${request.questionTypes.join(', ')}
Número de preguntas: ${request.numberOfQuestions}
Idioma: ${request.language}
Incluir explicaciones: ${request.includeExplanations ? 'Sí' : 'No'}
${request.timeLimit ? `Límite de tiempo: ${request.timeLimit} minutos` : ''}

${request.customPrompt ? `Instrucciones adicionales: ${request.customPrompt}` : ''}

Por favor, genera preguntas variadas, bien formuladas y con respuestas correctas.
    `.trim();
  }

  private buildAssignmentPrompt(request: AssignmentGenerationRequest): string {
    return `
Genera una tarea educativa con las siguientes especificaciones:

Materia: ${request.subject}
Tema: ${request.topic}
Grado: ${request.grade}
Tipo: ${request.type}
Dificultad: ${request.difficulty}
Duración: ${request.duration}
${request.groupSize ? `Tamaño del grupo: ${request.groupSize} estudiantes` : ''}
Incluir rúbrica: ${request.includeRubric ? 'Sí' : 'No'}
Incluir recursos: ${request.includeResources ? 'Sí' : 'No'}
Idioma: ${request.language}

${request.customPrompt ? `Instrucciones adicionales: ${request.customPrompt}` : ''}

Por favor, genera una tarea completa con objetivos claros, instrucciones detalladas y criterios de evaluación.
    `.trim();
  }

  private buildSummaryPrompt(request: SummaryGenerationRequest): string {
    return `
Genera un resumen del siguiente contenido:

Contenido: ${request.content}
Tipo: ${request.type}
Formato: ${request.format}
Longitud: ${request.length}
Idioma: ${request.language}
Incluir puntos clave: ${request.includeKeyPoints ? 'Sí' : 'No'}
Incluir preguntas: ${request.includeQuestions ? 'Sí' : 'No'}

${request.customPrompt ? `Instrucciones adicionales: ${request.customPrompt}` : ''}

Por favor, genera un resumen claro, conciso y bien estructurado.
    `.trim();
  }

  private buildExplanationPrompt(request: ExplanationGenerationRequest): string {
    return `
Genera una explicación del siguiente concepto:

Concepto: ${request.concept}
Materia: ${request.subject}
Grado: ${request.grade}
Estilo: ${request.style}
Incluir ejemplos: ${request.includeExamples ? 'Sí' : 'No'}
Incluir analogías: ${request.includeAnalogies ? 'Sí' : 'No'}
Incluir ayudas visuales: ${request.includeVisualAids ? 'Sí' : 'No'}
Idioma: ${request.language}

${request.customPrompt ? `Instrucciones adicionales: ${request.customPrompt}` : ''}

Por favor, genera una explicación clara, completa y apropiada para el nivel especificado.
    `.trim();
  }

  private buildTranslationPrompt(request: ContentTranslationRequest): string {
    return `
Traduce el siguiente contenido:

Contenido: ${request.content}
Idioma origen: ${request.sourceLanguage}
Idioma destino: ${request.targetLanguage}
Preservar formato: ${request.preserveFormatting ? 'Sí' : 'No'}
Incluir glosario: ${request.includeGlossary ? 'Sí' : 'No'}

${request.customInstructions ? `Instrucciones adicionales: ${request.customInstructions}` : ''}

Por favor, genera una traducción precisa y natural.
    `.trim();
  }

  private buildAdaptationPrompt(request: ContentAdaptationRequest): string {
    return `
Adapta el siguiente contenido:

Contenido: ${request.content}
Audiencia objetivo: ${request.targetAudience}
Tipo de adaptación: ${request.adaptationType}
Parámetros: ${JSON.stringify(request.parameters)}
Preservar original: ${request.preserveOriginal ? 'Sí' : 'No'}

${request.customInstructions ? `Instrucciones adicionales: ${request.customInstructions}` : ''}

Por favor, genera una adaptación apropiada para la audiencia objetivo.
    `.trim();
  }

  private buildQualityCheckPrompt(content: string): string {
    return `
Evalúa la calidad del siguiente contenido educativo:

Contenido: ${content}

Por favor, evalúa:
1. Legibilidad (0-100)
2. Gramática (0-100)
3. Relevancia educativa (0-100)
4. Precisión (0-100)
5. Sugerencias de mejora

Responde en formato JSON.
    `.trim();
  }

  private processLLMResponse(response: string, format: string): string {
    // Procesar respuesta según el formato requerido
    switch (format) {
      case 'markdown':
        return this.convertToMarkdown(response);
      case 'html':
        return this.convertToHTML(response);
      case 'json':
        return this.convertToJSON(response);
      default:
        return response;
    }
  }

  private processQuizResponse(response: string, request: QuizGenerationRequest): any {
    // Procesar respuesta del quiz
    try {
      const quizData = JSON.parse(response);
      return {
        questions: quizData.questions || [],
        totalPoints: quizData.totalPoints || 0,
      };
    } catch (error) {
      logger.error('Failed to parse quiz response:', error);
      throw new Error('Invalid quiz response format');
    }
  }

  private processAssignmentResponse(response: string, request: AssignmentGenerationRequest): any {
    // Procesar respuesta de la tarea
    try {
      const assignmentData = JSON.parse(response);
      return {
        title: assignmentData.title || `Tarea: ${request.topic}`,
        description: assignmentData.description || '',
        objectives: assignmentData.objectives || [],
        instructions: assignmentData.instructions || '',
        requirements: assignmentData.requirements || [],
        rubric: assignmentData.rubric || [],
        resources: assignmentData.resources || [],
      };
    } catch (error) {
      logger.error('Failed to parse assignment response:', error);
      throw new Error('Invalid assignment response format');
    }
  }

  private processSummaryResponse(response: string, request: SummaryGenerationRequest): any {
    // Procesar respuesta del resumen
    try {
      const summaryData = JSON.parse(response);
      return {
        summary: summaryData.summary || response,
        keyPoints: summaryData.keyPoints || [],
        questions: summaryData.questions || [],
      };
    } catch (error) {
      logger.error('Failed to parse summary response:', error);
      return {
        summary: response,
        keyPoints: [],
        questions: [],
      };
    }
  }

  private processExplanationResponse(response: string, request: ExplanationGenerationRequest): any {
    // Procesar respuesta de la explicación
    try {
      const explanationData = JSON.parse(response);
      return {
        explanation: explanationData.explanation || response,
        examples: explanationData.examples || [],
        analogies: explanationData.analogies || [],
        visualAids: explanationData.visualAids || [],
        relatedConcepts: explanationData.relatedConcepts || [],
      };
    } catch (error) {
      logger.error('Failed to parse explanation response:', error);
      return {
        explanation: response,
        examples: [],
        analogies: [],
        visualAids: [],
        relatedConcepts: [],
      };
    }
  }

  private processTranslationResponse(response: string, request: ContentTranslationRequest): any {
    // Procesar respuesta de traducción
    try {
      const translationData = JSON.parse(response);
      return {
        translatedContent: translationData.translatedContent || response,
        glossary: translationData.glossary || {},
        confidence: translationData.confidence || 0.8,
      };
    } catch (error) {
      logger.error('Failed to parse translation response:', error);
      return {
        translatedContent: response,
        glossary: {},
        confidence: 0.7,
      };
    }
  }

  private processAdaptationResponse(response: string, request: ContentAdaptationRequest): any {
    // Procesar respuesta de adaptación
    try {
      const adaptationData = JSON.parse(response);
      return {
        adaptedContent: adaptationData.adaptedContent || response,
        changes: adaptationData.changes || [],
        confidence: adaptationData.confidence || 0.8,
      };
    } catch (error) {
      logger.error('Failed to parse adaptation response:', error);
      return {
        adaptedContent: response,
        changes: [],
        confidence: 0.7,
      };
    }
  }

  private processQualityCheckResponse(response: string): any {
    // Procesar respuesta de verificación de calidad
    try {
      const qualityData = JSON.parse(response);
      return {
        readabilityScore: qualityData.readabilityScore || 0,
        grammarScore: qualityData.grammarScore || 0,
        relevanceScore: qualityData.relevanceScore || 0,
        accuracyScore: qualityData.accuracyScore || 0,
        suggestions: qualityData.suggestions || [],
      };
    } catch (error) {
      logger.error('Failed to parse quality check response:', error);
      return {
        readabilityScore: 0,
        grammarScore: 0,
        relevanceScore: 0,
        accuracyScore: 0,
        suggestions: ['Error parsing quality check response'],
      };
    }
  }

  private generateTitle(topic: string, subject: string): string {
    return `${topic} - ${subject}`;
  }

  private generateSummary(content: string): string {
    // Generar resumen automático del contenido
    const words = content.split(' ').slice(0, 50);
    return words.join(' ') + (content.split(' ').length > 50 ? '...' : '');
  }

  private extractKeywords(content: string): string[] {
    // Extraer palabras clave del contenido
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(' ').length;
    return Math.ceil(words / wordsPerMinute);
  }

  private calculateQuizTime(questions: any[]): number {
    const timePerQuestion = 2; // minutos por pregunta
    return questions.length * timePerQuestion;
  }

  private calculateAssignmentDuration(duration: string, type: string): number {
    const durationMap: Record<string, number> = {
      short: 30,
      medium: 60,
      long: 120,
    };
    
    const baseTime = durationMap[duration] || 60;
    
    // Ajustar según el tipo de tarea
    const typeMultiplier: Record<string, number> = {
      homework: 1,
      project: 2,
      research: 3,
      presentation: 1.5,
      lab: 1.2,
    };
    
    return Math.round(baseTime * (typeMultiplier[type] || 1));
  }

  private generateQuizInstructions(request: QuizGenerationRequest): string {
    return `Lee cada pregunta cuidadosamente y selecciona la mejor respuesta. ${request.timeLimit ? `Tienes ${request.timeLimit} minutos para completar el quiz.` : ''}`;
  }

  private assessDifficulty(grade: string, concept: string): string {
    // Evaluar dificultad basada en el grado
    const gradeLevel = parseInt(grade);
    if (gradeLevel <= 6) return 'beginner';
    if (gradeLevel <= 9) return 'intermediate';
    return 'advanced';
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateOverallScore(qualityData: any): number {
    const weights = {
      readability: 0.25,
      grammar: 0.25,
      relevance: 0.25,
      accuracy: 0.25,
    };
    
    return Math.round(
      qualityData.readabilityScore * weights.readability +
      qualityData.grammarScore * weights.grammar +
      qualityData.relevanceScore * weights.relevance +
      qualityData.accuracyScore * weights.accuracy
    );
  }

  private convertToMarkdown(text: string): string {
    // Convertir texto a Markdown
    return text
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      .replace(/\*(.*?)\*/g, '*$1*')
      .replace(/^### (.*$)/gim, '### $1')
      .replace(/^## (.*$)/gim, '## $1')
      .replace(/^# (.*$)/gim, '# $1');
  }

  private convertToHTML(text: string): string {
    // Convertir texto a HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>');
  }

  private convertToJSON(text: string): string {
    try {
      return JSON.stringify({ content: text }, null, 2);
    } catch (error) {
      return JSON.stringify({ content: text, error: 'Failed to parse as JSON' });
    }
  }

  private generateMetadata(request: any, content: string): Record<string, any> {
    return {
      wordCount: this.countWords(content),
      readingTime: this.calculateReadingTime(content),
      keywords: this.extractKeywords(content),
      generatedAt: new Date().toISOString(),
      request: request,
    };
  }

  private updateMetrics(type: string, subject: string, grade: string, topic: string): void {
    this.metrics.totalRequests++;
    this.metrics.requestsByType[type] = (this.metrics.requestsByType[type] || 0) + 1;
    this.metrics.requestsBySubject[subject] = (this.metrics.requestsBySubject[subject] || 0) + 1;
    this.metrics.requestsByGrade[grade] = (this.metrics.requestsByGrade[grade] || 0) + 1;
    
    if (!this.metrics.popularTopics.includes(topic)) {
      this.metrics.popularTopics.push(topic);
      if (this.metrics.popularTopics.length > 20) {
        this.metrics.popularTopics.shift();
      }
    }
    
    this.metrics.lastUpdated = new Date().toISOString();
  }

  private updateSuccessMetrics(processingTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.successfulRequests - 1) + processingTime) / 
      this.metrics.successfulRequests;
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
  }

  private updateErrorMetrics(): void {
    this.metrics.failedRequests++;
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
  }
} 