import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';
import LLMGatewayService, { LLMRequest } from './llm-gateway.service.js';
import RedisService from './redis.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface ContentType {
  id: string;
  name: string;
  description: string;
  template: string;
  parameters: string[];
  estimatedTokens: number;
}

export interface ContentRequest {
  type: string;
  subject: string;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  parameters: Record<string, any>;
  userId?: string;
  sessionId?: string;
  context?: any;
}

export interface ContentResponse {
  id: string;
  type: string;
  content: any;
  metadata: {
    subject: string;
    topic: string;
    level: string;
    language: string;
    generatedAt: number;
    tokensUsed: number;
    cost: number;
    userId?: string;
    sessionId?: string;
  };
  llmResponse?: any;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  outputFormat: 'text' | 'json' | 'markdown' | 'html';
  validationSchema?: any;
  examples?: any[];
}

export class ContentGenerationService {
  private static instance: ContentGenerationService;
  private llmGateway: LLMGatewayService;
  private redis: RedisService;
  private contentTypes: Map<string, ContentType> = new Map();
  private templates: Map<string, ContentTemplate> = new Map();

  private constructor() {
    this.llmGateway = LLMGatewayService.getInstance();
    this.redis = new RedisService();
    this.initializeContentTypes();
    this.initializeTemplates();
  }

  public static getInstance(): ContentGenerationService {
    if (!ContentGenerationService.instance) {
      ContentGenerationService.instance = new ContentGenerationService();
    }
    return ContentGenerationService.instance;
  }

  private initializeContentTypes(): void {
    const types: ContentType[] = [
      {
        id: 'lesson_plan',
        name: 'Lesson Plan',
        description: 'Comprehensive lesson plan with objectives, activities, and assessment',
        template: 'lesson_plan',
        parameters: ['duration', 'learningObjectives', 'materials', 'assessmentType'],
        estimatedTokens: 2000
      },
      {
        id: 'quiz',
        name: 'Quiz',
        description: 'Multiple choice and open-ended questions with answers',
        template: 'quiz',
        parameters: ['questionCount', 'difficulty', 'questionTypes', 'timeLimit'],
        estimatedTokens: 1500
      },
      {
        id: 'exercise',
        name: 'Exercise',
        description: 'Practice exercises with step-by-step solutions',
        template: 'exercise',
        parameters: ['exerciseCount', 'difficulty', 'solutionType', 'hints'],
        estimatedTokens: 1200
      },
      {
        id: 'summary',
        name: 'Summary',
        description: 'Concise summary of key concepts and points',
        template: 'summary',
        parameters: ['length', 'includeExamples', 'includeKeyTerms'],
        estimatedTokens: 800
      },
      {
        id: 'explanation',
        name: 'Explanation',
        description: 'Detailed explanation of complex concepts',
        template: 'explanation',
        parameters: ['detailLevel', 'includeAnalogies', 'includeVisuals'],
        estimatedTokens: 1000
      },
      {
        id: 'story',
        name: 'Educational Story',
        description: 'Engaging story to illustrate concepts',
        template: 'story',
        parameters: ['storyLength', 'targetAge', 'moral', 'characters'],
        estimatedTokens: 1800
      },
      {
        id: 'worksheet',
        name: 'Worksheet',
        description: 'Printable worksheet with activities',
        template: 'worksheet',
        parameters: ['activityCount', 'printable', 'answerKey'],
        estimatedTokens: 1600
      },
      {
        id: 'presentation',
        name: 'Presentation',
        description: 'Slide presentation content',
        template: 'presentation',
        parameters: ['slideCount', 'includeNotes', 'visualElements'],
        estimatedTokens: 1400
      }
    ];

    types.forEach(type => this.contentTypes.set(type.id, type));
  }

  private initializeTemplates(): void {
    const templates: ContentTemplate[] = [
      {
        id: 'lesson_plan',
        name: 'Lesson Plan Template',
        description: 'Template for creating comprehensive lesson plans',
        prompt: `Create a detailed lesson plan for {subject} on the topic of {topic} for {level} level students.

Requirements:
- Duration: {duration} minutes
- Learning Objectives: {learningObjectives}
- Materials needed: {materials}
- Assessment type: {assessmentType}

Please include:
1. Lesson objectives
2. Prerequisites
3. Materials and resources
4. Lesson procedure (step-by-step)
5. Assessment methods
6. Extension activities
7. Homework suggestions

Format the response as a structured lesson plan with clear sections.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Mathematics',
            topic: 'Linear Equations',
            level: 'intermediate',
            duration: 45,
            learningObjectives: 'Students will solve linear equations with one variable',
            materials: 'Whiteboard, markers, worksheets',
            assessmentType: 'Quiz'
          }
        ]
      },
      {
        id: 'quiz',
        name: 'Quiz Template',
        description: 'Template for creating educational quizzes',
        prompt: `Create a {questionCount}-question quiz on {topic} in {subject} for {level} level students.

Requirements:
- Difficulty: {difficulty}
- Question types: {questionTypes}
- Time limit: {timeLimit} minutes

Please include:
1. Multiple choice questions (70%)
2. True/False questions (20%)
3. Short answer questions (10%)
4. Answer key with explanations
5. Difficulty ratings for each question

Format as a structured quiz with clear question numbering and answer key.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Science',
            topic: 'Photosynthesis',
            level: 'intermediate',
            questionCount: 10,
            difficulty: 'medium',
            questionTypes: 'multiple_choice,true_false,short_answer',
            timeLimit: 15
          }
        ]
      },
      {
        id: 'exercise',
        name: 'Exercise Template',
        description: 'Template for creating practice exercises',
        prompt: `Create {exerciseCount} practice exercises on {topic} in {subject} for {level} level students.

Requirements:
- Difficulty: {difficulty}
- Solution type: {solutionType}
- Include hints: {hints}

Please include:
1. Clear problem statements
2. Step-by-step solutions
3. Hints for struggling students
4. Additional practice problems
5. Common mistakes to avoid

Format with clear problem numbering and detailed solutions.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Physics',
            topic: 'Newton\'s Laws',
            level: 'advanced',
            exerciseCount: 5,
            difficulty: 'hard',
            solutionType: 'step_by_step',
            hints: true
          }
        ]
      },
      {
        id: 'summary',
        name: 'Summary Template',
        description: 'Template for creating content summaries',
        prompt: `Create a {length} summary of {topic} in {subject} for {level} level students.

Requirements:
- Include examples: {includeExamples}
- Include key terms: {includeKeyTerms}

Please include:
1. Main concepts
2. Key definitions
3. Important examples
4. Key takeaways
5. Related topics

Make it concise but comprehensive.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'History',
            topic: 'World War II',
            level: 'intermediate',
            length: 'medium',
            includeExamples: true,
            includeKeyTerms: true
          }
        ]
      },
      {
        id: 'explanation',
        name: 'Explanation Template',
        description: 'Template for detailed concept explanations',
        prompt: `Provide a detailed explanation of {topic} in {subject} for {level} level students.

Requirements:
- Detail level: {detailLevel}
- Include analogies: {includeAnalogies}
- Include visuals: {includeVisuals}

Please include:
1. Basic definition
2. Detailed explanation
3. Real-world examples
4. Analogies and comparisons
5. Common misconceptions
6. Related concepts

Make it engaging and easy to understand.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Chemistry',
            topic: 'Chemical Bonding',
            level: 'intermediate',
            detailLevel: 'comprehensive',
            includeAnalogies: true,
            includeVisuals: true
          }
        ]
      },
      {
        id: 'story',
        name: 'Educational Story Template',
        description: 'Template for creating educational stories',
        prompt: `Create an educational story about {topic} in {subject} for {level} level students.

Requirements:
- Story length: {storyLength}
- Target age: {targetAge}
- Moral/lesson: {moral}
- Characters: {characters}

Please include:
1. Engaging characters
2. Clear plot
3. Educational content woven naturally
4. Moral or lesson
5. Discussion questions

Make it entertaining while educational.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Environmental Science',
            topic: 'Recycling',
            level: 'beginner',
            storyLength: 'short',
            targetAge: '8-12',
            moral: 'Importance of environmental responsibility',
            characters: 'Animal characters'
          }
        ]
      },
      {
        id: 'worksheet',
        name: 'Worksheet Template',
        description: 'Template for creating printable worksheets',
        prompt: `Create a printable worksheet on {topic} in {subject} for {level} level students.

Requirements:
- Activity count: {activityCount}
- Printable format: {printable}
- Include answer key: {answerKey}

Please include:
1. Clear instructions
2. Multiple activity types
3. Space for student work
4. Answer key (if requested)
5. Extension activities

Format for easy printing and completion.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Language Arts',
            topic: 'Grammar',
            level: 'intermediate',
            activityCount: 5,
            printable: true,
            answerKey: true
          }
        ]
      },
      {
        id: 'presentation',
        name: 'Presentation Template',
        description: 'Template for creating presentation content',
        prompt: `Create presentation content for {topic} in {subject} for {level} level students.

Requirements:
- Slide count: {slideCount}
- Include speaker notes: {includeNotes}
- Visual elements: {visualElements}

Please include:
1. Slide titles and content
2. Key points per slide
3. Speaker notes (if requested)
4. Visual suggestions
5. Discussion questions
6. Summary slide

Format for easy presentation creation.`,
        outputFormat: 'markdown',
        examples: [
          {
            subject: 'Geography',
            topic: 'Climate Zones',
            level: 'intermediate',
            slideCount: 8,
            includeNotes: true,
            visualElements: true
          }
        ]
      }
    ];

    templates.forEach(template => this.templates.set(template.id, template));
  }

  public async generateContent(request: ContentRequest): Promise<ContentResponse> {
    const startTime = Date.now();
    const contentId = uuidv4();
    
    try {
      logger.info('Iniciando generación de contenido', {
        contentId,
        type: request.type,
        subject: request.subject,
        topic: request.topic,
        level: request.level,
        userId: request.userId,
        sessionId: request.sessionId
      });

      // Verificar cache
      const cachedContent = await this.getCachedContent(request);
      if (cachedContent) {
        logger.info('Contenido obtenido desde cache', { contentId });
        metrics.recordContentGeneration(request.type, 'cache_hit', Date.now() - startTime);
        return cachedContent;
      }

      // Validar tipo de contenido
      const contentType = this.contentTypes.get(request.type);
      if (!contentType) {
        throw new Error(`Invalid content type: ${request.type}`);
      }

      // Obtener template
      const template = this.templates.get(contentType.template);
      if (!template) {
        throw new Error(`Template not found: ${contentType.template}`);
      }

      // Generar prompt
      const prompt = this.generatePrompt(template, request);
      
      // Llamar a LLM
      const llmRequest: LLMRequest = {
        prompt,
        model: 'gpt-4',
        maxTokens: contentType.estimatedTokens,
        temperature: 0.7,
        userId: request.userId,
        sessionId: request.sessionId,
        context: request.context
      };

      const llmResponse = await this.llmGateway.generateText(llmRequest);

      // Procesar respuesta
      const content = this.processResponse(llmResponse.content, template.outputFormat);

      // Crear respuesta
      const response: ContentResponse = {
        id: contentId,
        type: request.type,
        content,
        metadata: {
          subject: request.subject,
          topic: request.topic,
          level: request.level,
          language: request.language,
          generatedAt: Date.now(),
          tokensUsed: llmResponse.usage.totalTokens,
          cost: llmResponse.usage.cost,
          userId: request.userId,
          sessionId: request.sessionId
        },
        llmResponse
      };

      // Cachear contenido
      await this.cacheContent(request, response);

      // Registrar métricas
      const duration = Date.now() - startTime;
      metrics.recordContentGeneration(request.type, 'success', duration);
      metrics.recordContentUsage(request.type, llmResponse.usage.totalTokens, llmResponse.usage.cost);

      logger.info('Generación de contenido completada', {
        contentId,
        type: request.type,
        tokens: llmResponse.usage.totalTokens,
        cost: llmResponse.usage.cost,
        latency: duration
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordContentGeneration(request.type, 'error', duration);
      logger.error('Error en generación de contenido', {
        contentId,
        type: request.type,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      throw error;
    }
  }

  private generatePrompt(template: ContentTemplate, request: ContentRequest): string {
    let prompt = template.prompt;

    // Reemplazar placeholders básicos
    prompt = prompt.replace(/{subject}/g, request.subject);
    prompt = prompt.replace(/{topic}/g, request.topic);
    prompt = prompt.replace(/{level}/g, request.level);
    prompt = prompt.replace(/{language}/g, request.language);

    // Reemplazar parámetros específicos
    for (const [key, value] of Object.entries(request.parameters)) {
      const placeholder = `{${key}}`;
      if (prompt.includes(placeholder)) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return prompt;
  }

  private processResponse(content: string, format: string): any {
    switch (format) {
      case 'json':
        try {
          return JSON.parse(content);
        } catch (error) {
          logger.warn('Error parsing JSON response, returning as text', { error });
          return content;
        }
      case 'markdown':
      case 'html':
      case 'text':
      default:
        return content;
    }
  }

  private async getCachedContent(request: ContentRequest): Promise<ContentResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheContent(request: ContentRequest, response: ContentResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    await this.redis.set(cacheKey, JSON.stringify(response), 3600); // 1 hora
  }

  private generateCacheKey(request: ContentRequest): string {
    const keyData = {
      type: request.type,
      subject: request.subject,
      topic: request.topic,
      level: request.level,
      language: request.language,
      parameters: request.parameters
    };
    return `content:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  public async getContentTypes(): Promise<ContentType[]> {
    return Array.from(this.contentTypes.values());
  }

  public async getTemplates(): Promise<ContentTemplate[]> {
    return Array.from(this.templates.values());
  }

  public async getTemplate(id: string): Promise<ContentTemplate | null> {
    return this.templates.get(id) || null;
  }

  public async addTemplate(template: ContentTemplate): Promise<void> {
    this.templates.set(template.id, template);
    logger.info('Nuevo template agregado', { templateId: template.id });
  }

  public async updateTemplate(id: string, template: ContentTemplate): Promise<void> {
    if (this.templates.has(id)) {
      this.templates.set(id, template);
      logger.info('Template actualizado', { templateId: id });
    } else {
      throw new Error(`Template not found: ${id}`);
    }
  }

  public async deleteTemplate(id: string): Promise<void> {
    if (this.templates.has(id)) {
      this.templates.delete(id);
      logger.info('Template eliminado', { templateId: id });
    } else {
      throw new Error(`Template not found: ${id}`);
    }
  }

  public async clearCache(): Promise<void> {
    const keys = await this.redis.keys('content:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info('Cache de contenido limpiado', { keysCount: keys.length });
    }
  }

  public async getContentStats(): Promise<Record<string, any>> {
    const stats = {
      contentTypes: this.contentTypes.size,
      templates: this.templates.size,
      cacheKeys: await this.redis.keys('content:*').then(keys => keys.length)
    };

    return stats;
  }
}

export default ContentGenerationService;