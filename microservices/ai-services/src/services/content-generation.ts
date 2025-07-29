import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
  ContentGenerationRequest, 
  ContentGenerationResponse, 
  ContentType 
} from '../types/ai';
import { contentLogger, logAIOperation } from '../utils/logger';

// ============================================================================
// CONTENT GENERATION SERVICE
// ============================================================================

export class ContentGenerationService {
  private llmGatewayUrl: string;
  private apiKey: string;

  constructor() {
    this.llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3007';
    this.apiKey = process.env.LLM_API_KEY || '';
  }

  // ============================================================================
  // MAIN GENERATION METHODS
  // ============================================================================

  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    const startTime = Date.now();
    const id = uuidv4();

    try {
      contentLogger.info('Starting content generation', {
        id,
        type: request.type,
        topic: request.topic,
        level: request.level
      });

      let content = '';
      let examples: string[] = [];
      let exercises: any[] = [];

      // Generate main content based on type
      switch (request.type) {
        case ContentType.LESSON:
          content = await this.generateLesson(request);
          break;
        case ContentType.QUIZ:
          const quizResult = await this.generateQuiz(request);
          content = quizResult.content;
          exercises = quizResult.exercises;
          break;
        case ContentType.EXERCISE:
          const exerciseResult = await this.generateExercise(request);
          content = exerciseResult.content;
          exercises = exerciseResult.exercises;
          break;
        case ContentType.SUMMARY:
          content = await this.generateSummary(request);
          break;
        case ContentType.EXPLANATION:
          content = await this.generateExplanation(request);
          break;
        case ContentType.TRANSCRIPT:
          content = await this.generateTranscript(request);
          break;
        default:
          throw new Error(`Unsupported content type: ${request.type}`);
      }

      // Generate examples if requested
      if (request.includeExamples) {
        examples = await this.generateExamples(request, content);
      }

      // Generate additional exercises if requested
      if (request.includeExercises && exercises.length === 0) {
        exercises = await this.generateAdditionalExercises(request, content);
      }

      const wordCount = this.countWords(content);
      const estimatedReadingTime = this.calculateReadingTime(wordCount);
      const keywords = await this.extractKeywords(content);

      const response: ContentGenerationResponse = {
        id,
        content,
        metadata: {
          type: request.type,
          topic: request.topic,
          level: request.level,
          language: request.language,
          length: request.length,
          wordCount,
          estimatedReadingTime,
          keywords,
          generatedAt: new Date().toISOString()
        },
        examples: examples.length > 0 ? examples : undefined,
        exercises: exercises.length > 0 ? exercises : undefined
      };

      const duration = Date.now() - startTime;
      logAIOperation(contentLogger, 'content_generation', request.type, request, response, duration);

      contentLogger.info('Content generation completed', {
        id,
        wordCount,
        estimatedReadingTime,
        duration: `${duration}ms`
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      contentLogger.error('Content generation failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  // ============================================================================
  // CONTENT TYPE GENERATORS
  // ============================================================================

  private async generateLesson(request: ContentGenerationRequest): Promise<string> {
    const prompt = this.buildLessonPrompt(request);
    const response = await this.callLLM(prompt, {
      maxTokens: this.getMaxTokens(request.length),
      temperature: 0.7
    });

    return this.formatLessonContent(response, request);
  }

  private async generateQuiz(request: ContentGenerationRequest): Promise<{ content: string; exercises: any[] }> {
    const prompt = this.buildQuizPrompt(request);
    const response = await this.callLLM(prompt, {
      maxTokens: this.getMaxTokens(request.length),
      temperature: 0.8
    });

    const parsed = this.parseQuizResponse(response);
    return {
      content: parsed.introduction,
      exercises: parsed.questions
    };
  }

  private async generateExercise(request: ContentGenerationRequest): Promise<{ content: string; exercises: any[] }> {
    const prompt = this.buildExercisePrompt(request);
    const response = await this.callLLM(prompt, {
      maxTokens: this.getMaxTokens(request.length),
      temperature: 0.7
    });

    const parsed = this.parseExerciseResponse(response);
    return {
      content: parsed.instructions,
      exercises: parsed.exercises
    };
  }

  private async generateSummary(request: ContentGenerationRequest): Promise<string> {
    const prompt = this.buildSummaryPrompt(request);
    const response = await this.callLLM(prompt, {
      maxTokens: 500,
      temperature: 0.5
    });

    return this.formatSummaryContent(response);
  }

  private async generateExplanation(request: ContentGenerationRequest): Promise<string> {
    const prompt = this.buildExplanationPrompt(request);
    const response = await this.callLLM(prompt, {
      maxTokens: this.getMaxTokens(request.length),
      temperature: 0.6
    });

    return this.formatExplanationContent(response, request);
  }

  private async generateTranscript(request: ContentGenerationRequest): Promise<string> {
    const prompt = this.buildTranscriptPrompt(request);
    const response = await this.callLLM(prompt, {
      maxTokens: this.getMaxTokens(request.length),
      temperature: 0.7
    });

    return this.formatTranscriptContent(response);
  }

  // ============================================================================
  // SUPPORTING GENERATORS
  // ============================================================================

  private async generateExamples(request: ContentGenerationRequest, content: string): Promise<string[]> {
    const prompt = this.buildExamplesPrompt(request, content);
    const response = await this.callLLM(prompt, {
      maxTokens: 300,
      temperature: 0.8
    });

    return this.parseExamplesResponse(response);
  }

  private async generateAdditionalExercises(request: ContentGenerationRequest, content: string): Promise<any[]> {
    const prompt = this.buildAdditionalExercisesPrompt(request, content);
    const response = await this.callLLM(prompt, {
      maxTokens: 400,
      temperature: 0.8
    });

    return this.parseAdditionalExercisesResponse(response);
  }

  private async extractKeywords(content: string): Promise<string[]> {
    const prompt = `Extrae las 10 palabras clave más importantes del siguiente texto educativo. Devuelve solo la lista de palabras separadas por comas:

${content}`;

    const response = await this.callLLM(prompt, {
      maxTokens: 100,
      temperature: 0.3
    });

    return response.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  // ============================================================================
  // PROMPT BUILDERS
  // ============================================================================

  private buildLessonPrompt(request: ContentGenerationRequest): string {
    return `Genera una lección educativa sobre "${request.topic}" con las siguientes características:

- Nivel: ${request.level}
- Idioma: ${request.language}
- Estilo: ${request.style}
- Longitud: ${request.length}
${request.targetAudience ? `- Audiencia objetivo: ${request.targetAudience}` : ''}
${request.keywords ? `- Palabras clave a incluir: ${request.keywords.join(', ')}` : ''}
${request.context ? `- Contexto adicional: ${request.context}` : ''}

La lección debe incluir:
1. Introducción clara del tema
2. Explicación paso a paso
3. Conceptos clave destacados
4. Ejemplos prácticos
5. Resumen de puntos importantes

Formato la respuesta en Markdown con títulos, subtítulos, listas y énfasis donde sea apropiado.`;
  }

  private buildQuizPrompt(request: ContentGenerationRequest): string {
    return `Genera un cuestionario educativo sobre "${request.topic}" con las siguientes características:

- Nivel: ${request.level}
- Idioma: ${request.language}
- Estilo: ${request.style}
- Longitud: ${request.length}

El cuestionario debe incluir:
1. Una breve introducción al tema
2. 5-10 preguntas de opción múltiple
3. Respuestas correctas
4. Explicaciones breves para cada respuesta

Formato la respuesta en JSON con esta estructura:
{
  "introduction": "texto de introducción",
  "questions": [
    {
      "question": "pregunta",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "answer": "opción correcta",
      "explanation": "explicación de la respuesta"
    }
  ]
}`;
  }

  private buildExercisePrompt(request: ContentGenerationRequest): string {
    return `Genera ejercicios prácticos sobre "${request.topic}" con las siguientes características:

- Nivel: ${request.level}
- Idioma: ${request.language}
- Estilo: ${request.style}
- Longitud: ${request.length}

Los ejercicios deben incluir:
1. Instrucciones claras
2. 3-5 ejercicios prácticos
3. Diferentes tipos de ejercicios (prácticos, teóricos, de aplicación)

Formato la respuesta en JSON con esta estructura:
{
  "instructions": "instrucciones generales",
  "exercises": [
    {
      "question": "enunciado del ejercicio",
      "type": "tipo de ejercicio",
      "hint": "pista opcional",
      "solution": "solución o respuesta esperada"
    }
  ]
}`;
  }

  private buildSummaryPrompt(request: ContentGenerationRequest): string {
    return `Genera un resumen conciso y estructurado sobre "${request.topic}" con las siguientes características:

- Nivel: ${request.level}
- Idioma: ${request.language}
- Estilo: ${request.style}

El resumen debe incluir:
1. Puntos clave principales
2. Conceptos fundamentales
3. Conclusiones importantes

Formato la respuesta en Markdown con viñetas y estructura clara.`;
  }

  private buildExplanationPrompt(request: ContentGenerationRequest): string {
    return `Genera una explicación detallada y didáctica sobre "${request.topic}" con las siguientes características:

- Nivel: ${request.level}
- Idioma: ${request.language}
- Estilo: ${request.style}
- Longitud: ${request.length}

La explicación debe incluir:
1. Definición clara del concepto
2. Explicación paso a paso
3. Analogías o ejemplos para facilitar la comprensión
4. Aplicaciones prácticas
5. Puntos importantes a recordar

Formato la respuesta en Markdown con estructura clara y ejemplos destacados.`;
  }

  private buildTranscriptPrompt(request: ContentGenerationRequest): string {
    return `Genera una transcripción educativa sobre "${request.topic}" con las siguientes características:

- Nivel: ${request.level}
- Idioma: ${request.language}
- Estilo: ${request.style}
- Longitud: ${request.length}

La transcripción debe simular una clase o presentación oral e incluir:
1. Saludo e introducción
2. Desarrollo del tema de forma conversacional
3. Pausas y transiciones naturales
4. Preguntas retóricas
5. Cierre y resumen

Formato la respuesta como si fuera una transcripción real de una clase.`;
  }

  private buildExamplesPrompt(request: ContentGenerationRequest, content: string): string {
    return `Basándote en la siguiente lección sobre "${request.topic}", genera 3 ejemplos prácticos que ilustren los conceptos principales:

${content}

Los ejemplos deben ser:
- Relevantes al nivel ${request.level}
- Claros y fáciles de entender
- Aplicables en situaciones reales
- En idioma ${request.language}

Devuelve solo los ejemplos, uno por línea, sin numeración.`;
  }

  private buildAdditionalExercisesPrompt(request: ContentGenerationRequest, content: string): string {
    return `Basándote en la siguiente lección sobre "${request.topic}", genera 3 ejercicios adicionales de práctica:

${content}

Los ejercicios deben ser:
- Apropiados para nivel ${request.level}
- Diferentes tipos (práctico, teórico, de aplicación)
- Con instrucciones claras
- En idioma ${request.language}

Formato la respuesta en JSON con esta estructura:
[
  {
    "question": "enunciado del ejercicio",
    "type": "tipo de ejercicio",
    "hint": "pista opcional",
    "solution": "solución esperada"
  }
]`;
  }

  // ============================================================================
  // RESPONSE PARSERS
  // ============================================================================

  private formatLessonContent(response: string, request: ContentGenerationRequest): string {
    // Clean and format the response
    let content = response.trim();
    
    // Ensure proper markdown formatting
    if (!content.startsWith('#')) {
      content = `# ${request.topic}\n\n${content}`;
    }

    return content;
  }

  private parseQuizResponse(response: string): { introduction: string; questions: any[] } {
    try {
      const parsed = JSON.parse(response);
      return {
        introduction: parsed.introduction || '',
        questions: parsed.questions || []
      };
    } catch (error) {
      contentLogger.warn('Failed to parse quiz response as JSON, using fallback', { response });
      return {
        introduction: 'Cuestionario sobre el tema',
        questions: []
      };
    }
  }

  private parseExerciseResponse(response: string): { instructions: string; exercises: any[] } {
    try {
      const parsed = JSON.parse(response);
      return {
        instructions: parsed.instructions || '',
        exercises: parsed.exercises || []
      };
    } catch (error) {
      contentLogger.warn('Failed to parse exercise response as JSON, using fallback', { response });
      return {
        instructions: 'Ejercicios prácticos',
        exercises: []
      };
    }
  }

  private formatSummaryContent(response: string): string {
    return response.trim();
  }

  private formatExplanationContent(response: string, request: ContentGenerationRequest): string {
    let content = response.trim();
    
    if (!content.startsWith('#')) {
      content = `# Explicación: ${request.topic}\n\n${content}`;
    }

    return content;
  }

  private formatTranscriptContent(response: string): string {
    return response.trim();
  }

  private parseExamplesResponse(response: string): string[] {
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 3); // Limit to 3 examples
  }

  private parseAdditionalExercisesResponse(response: string): any[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      contentLogger.warn('Failed to parse additional exercises response as JSON', { response });
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async callLLM(prompt: string, options: { maxTokens: number; temperature: number }): Promise<string> {
    try {
      const response = await axios.post(`${this.llmGatewayUrl}/api/llm/chat`, {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
        max_tokens: options.maxTokens,
        temperature: options.temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      contentLogger.error('LLM call failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('Failed to generate content via LLM');
    }
  }

  private getMaxTokens(length: string): number {
    switch (length) {
      case 'short': return 500;
      case 'medium': return 1000;
      case 'long': return 2000;
      default: return 1000;
    }
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(wordCount: number): number {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const contentGenerationService = new ContentGenerationService();