import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import {
  ChatMessage,
  ChatSession,
  ChatRequest,
  ChatResponse,
  ChatOptions,
  ChatContext,
  EducationalInsight,
  ChatbotPersonality,
  ConversationFlow,
  ChatbotMetrics,
  ChatbotConfiguration,
  ChatbotHealth,
  ChatbotError,
  ChatbotAnalytics,
  ChatbotFeedback,
  ChatStatus,
  MessageRole,
  InsightType,
  PersonalityRole,
} from '../types/chatbot.types.js';

export class ChatbotService {
  private llmGatewayUrl: string;
  private sessions: Map<string, ChatSession>;
  private messages: Map<string, ChatMessage[]>;
  private personalities: Map<string, ChatbotPersonality>;
  private flows: Map<string, ConversationFlow>;
  private metrics: ChatbotMetrics;
  private configuration: ChatbotConfiguration;
  private activeConnections: number;
  private totalConnections: number;

  constructor() {
    this.llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3004';
    this.sessions = new Map();
    this.messages = new Map();
    this.personalities = new Map();
    this.flows = new Map();
    this.activeConnections = 0;
    this.totalConnections = 0;
    
    this.metrics = {
      totalSessions: 0,
      activeSessions: 0,
      totalMessages: 0,
      averageSessionLength: 0,
      averageResponseTime: 0,
      userSatisfaction: 0,
      commonTopics: {},
      popularPersonalities: {},
      errorRate: 0,
      costPerSession: 0,
      lastUpdated: new Date().toISOString(),
    };

    this.configuration = {
      defaultModel: 'gpt-4',
      fallbackModel: 'gpt-3.5-turbo',
      maxTokensPerResponse: 1000,
      maxSessionLength: 50,
      sessionTimeout: 3600000, // 1 hour
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
      caching: {
        enabled: true,
        ttl: 300, // 5 minutes
      },
      monitoring: {
        enabled: true,
        logLevel: 'info',
      },
      personalities: [],
      flows: [],
    };

    this.initializeDefaultPersonalities();
    this.initializeDefaultFlows();
  }

  // Métodos principales de chat
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Validar sesión
      const session = this.getSession(request.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Crear mensaje del usuario
      const userMessage: ChatMessage = {
        id: uuidv4(),
        sessionId: request.sessionId,
        userId: request.userId,
        role: MessageRole.USER,
        content: request.message,
        timestamp: new Date().toISOString(),
        metadata: request.metadata,
        attachments: request.attachments,
        context: request.context,
      };

      // Guardar mensaje del usuario
      this.saveMessage(userMessage);

      // Procesar con LLM Gateway
      const llmResponse = await this.callLLMGateway(request, session);

      // Crear respuesta del chatbot
      const chatbotResponse: ChatResponse = {
        id: uuidv4(),
        sessionId: request.sessionId,
        message: llmResponse.message,
        confidence: llmResponse.confidence || 0.85,
        processingTime: Date.now() - startTime,
        modelUsed: llmResponse.modelUsed || this.configuration.defaultModel,
        tokensUsed: llmResponse.tokensUsed || 0,
        cost: llmResponse.cost || 0,
        suggestions: llmResponse.suggestions,
        followUpQuestions: llmResponse.followUpQuestions,
        educationalInsights: llmResponse.educationalInsights,
        metadata: llmResponse.metadata,
      };

      // Guardar mensaje del asistente
      const assistantMessage: ChatMessage = {
        id: chatbotResponse.id,
        sessionId: request.sessionId,
        userId: 'chatbot',
        role: MessageRole.ASSISTANT,
        content: chatbotResponse.message,
        timestamp: new Date().toISOString(),
        metadata: chatbotResponse.metadata,
      };

      this.saveMessage(assistantMessage);

      // Actualizar sesión
      this.updateSession(request.sessionId, {
        lastMessageAt: new Date().toISOString(),
        messageCount: session.messageCount + 2,
      });

      // Actualizar métricas
      this.updateMetrics('message', chatbotResponse.processingTime);

      logger.info('Message processed successfully', {
        sessionId: request.sessionId,
        userId: request.userId,
        processingTime: chatbotResponse.processingTime,
        modelUsed: chatbotResponse.modelUsed,
      });

      return chatbotResponse;
    } catch (error) {
      this.updateErrorMetrics();
      logger.error('Error processing message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: request.sessionId,
        userId: request.userId,
      });
      throw error;
    }
  }

  // Gestión de sesiones
  createSession(userId: string, title: string, context?: ChatContext): ChatSession {
    const sessionId = uuidv4();
    const session: ChatSession = {
      id: sessionId,
      userId,
      title,
      status: ChatStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
      context,
      metadata: {},
    };

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    this.metrics.totalSessions++;
    this.metrics.activeSessions++;

    logger.info('Session created', {
      sessionId,
      userId,
      title,
    });

    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<ChatSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { updatedAt: new Date().toISOString() });
      this.sessions.set(sessionId, session);
    }
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = ChatStatus.COMPLETED;
      session.updatedAt = new Date().toISOString();
      this.metrics.activeSessions--;
      
      logger.info('Session closed', {
        sessionId,
        userId: session.userId,
        messageCount: session.messageCount,
      });
    }
  }

  // Gestión de mensajes
  saveMessage(message: ChatMessage): void {
    const sessionMessages = this.messages.get(message.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(message.sessionId, sessionMessages);
    this.metrics.totalMessages++;
  }

  getSessionMessages(sessionId: string, limit?: number): ChatMessage[] {
    const messages = this.messages.get(sessionId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  // Personalidades del chatbot
  createPersonality(personality: ChatbotPersonality): void {
    this.personalities.set(personality.id, personality);
    this.configuration.personalities.push(personality);
  }

  getPersonality(personalityId: string): ChatbotPersonality | undefined {
    return this.personalities.get(personalityId);
  }

  getAllPersonalities(): ChatbotPersonality[] {
    return Array.from(this.personalities.values());
  }

  // Flujos de conversación
  createFlow(flow: ConversationFlow): void {
    this.flows.set(flow.id, flow);
    this.configuration.flows.push(flow);
  }

  getFlow(flowId: string): ConversationFlow | undefined {
    return this.flows.get(flowId);
  }

  getAllFlows(): ConversationFlow[] {
    return Array.from(this.flows.values());
  }

  // Métricas y monitoreo
  getMetrics(): ChatbotMetrics {
    return { ...this.metrics, lastUpdated: new Date().toISOString() };
  }

  getHealth(): ChatbotHealth {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: totalMemory,
        percentage: (memoryUsage.heapUsed / totalMemory) * 100,
      },
      cpu: {
        usage: 0, // Would need additional monitoring
        load: require('os').loadavg()[0],
      },
      connections: {
        active: this.activeConnections,
        total: this.totalConnections,
      },
      models: {
        available: [this.configuration.defaultModel, this.configuration.fallbackModel],
        active: this.configuration.defaultModel,
        status: 'online',
      },
      lastCheck: new Date().toISOString(),
    };
  }

  // Análisis y feedback
  submitFeedback(feedback: ChatbotFeedback): void {
    // En una implementación real, esto se guardaría en base de datos
    logger.info('Feedback submitted', {
      sessionId: feedback.sessionId,
      userId: feedback.userId,
      rating: feedback.rating,
      category: feedback.category,
    });
  }

  getAnalytics(sessionId: string): ChatbotAnalytics | null {
    const session = this.getSession(sessionId);
    const messages = this.getSessionMessages(sessionId);
    
    if (!session) return null;

    const topics = this.extractTopics(messages);
    const duration = session.status === ChatStatus.COMPLETED 
      ? new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()
      : undefined;

    return {
      sessionId,
      userId: session.userId,
      startTime: session.createdAt,
      endTime: session.status === ChatStatus.COMPLETED ? session.updatedAt : undefined,
      duration,
      messageCount: session.messageCount,
      topics,
      satisfaction: 0, // Would be calculated from feedback
      completionRate: session.status === ChatStatus.COMPLETED ? 100 : 0,
      learningOutcomes: this.extractLearningOutcomes(messages),
      metadata: session.metadata,
    };
  }

  // Métodos privados
  private async callLLMGateway(request: ChatRequest, session: ChatSession): Promise<any> {
    const prompt = this.buildChatPrompt(request, session);
    
    try {
      const response = await axios.post(`${this.llmGatewayUrl}/api/chat`, {
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(session.context),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: request.options?.model || this.configuration.defaultModel,
        temperature: request.options?.temperature || 0.7,
        max_tokens: request.options?.maxTokens || this.configuration.maxTokensPerResponse,
        stream: false,
      });

      return {
        message: response.data.choices[0].message.content,
        modelUsed: response.data.model,
        tokensUsed: response.data.usage?.total_tokens || 0,
        cost: response.data.cost || 0,
        suggestions: this.generateSuggestions(request.message),
        followUpQuestions: this.generateFollowUpQuestions(request.message),
        educationalInsights: this.generateEducationalInsights(request.message, session.context),
        metadata: response.data,
      };
    } catch (error) {
      logger.error('LLM Gateway call failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: request.sessionId,
        userId: request.userId,
      });
      throw error;
    }
  }

  private buildChatPrompt(request: ChatRequest, session: ChatSession): string {
    const context = session.context;
    const previousMessages = this.getSessionMessages(request.sessionId, 10);
    
    let prompt = `Context: Educational chatbot for ${context?.educationalLevel || 'university'} level. `;
    
    if (context?.subjectId) {
      prompt += `Subject: ${context.subjectId}. `;
    }
    
    if (context?.difficulty) {
      prompt += `Difficulty: ${context.difficulty}. `;
    }
    
    prompt += `\n\nUser message: ${request.message}`;
    
    if (previousMessages.length > 0) {
      prompt += '\n\nPrevious conversation:\n';
      previousMessages.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    return prompt;
  }

  private getSystemPrompt(context?: ChatContext): string {
    const basePrompt = `You are an educational AI assistant designed to help students learn effectively. 
    Provide clear, accurate, and helpful responses. Adapt your explanations to the student's level and learning style. 
    Encourage critical thinking and provide additional resources when appropriate.`;
    
    if (context?.educationalLevel) {
      return `${basePrompt} The student is at ${context.educationalLevel} level.`;
    }
    
    return basePrompt;
  }

  private generateSuggestions(message: string): string[] {
    // En una implementación real, esto usaría análisis de NLP
    return [
      '¿Te gustaría que profundice en algún aspecto específico?',
      '¿Hay algún concepto que te gustaría que explique de otra manera?',
      '¿Te gustaría ver ejemplos prácticos?',
    ];
  }

  private generateFollowUpQuestions(message: string): string[] {
    // En una implementación real, esto usaría análisis de NLP
    return [
      '¿Qué parte te resultó más interesante?',
      '¿Hay algo que te gustaría practicar?',
      '¿Te gustaría explorar un tema relacionado?',
    ];
  }

  private generateEducationalInsights(message: string, context?: ChatContext): EducationalInsight[] {
    // En una implementación real, esto usaría análisis de NLP y ML
    return [
      {
        type: InsightType.CONCEPT,
        title: 'Concepto Clave',
        description: 'Este tema es fundamental para entender conceptos más avanzados.',
        relevance: 0.9,
        resources: ['https://example.com/resource1', 'https://example.com/resource2'],
        relatedTopics: ['Tema relacionado 1', 'Tema relacionado 2'],
        difficulty: context?.difficulty || 'intermediate',
      },
    ];
  }

  private extractTopics(messages: ChatMessage[]): string[] {
    // En una implementación real, esto usaría NLP para extraer temas
    const topics = new Set<string>();
    messages.forEach(msg => {
      if (msg.content.includes('matemáticas')) topics.add('matemáticas');
      if (msg.content.includes('ciencias')) topics.add('ciencias');
      if (msg.content.includes('historia')) topics.add('historia');
    });
    return Array.from(topics);
  }

  private extractLearningOutcomes(messages: ChatMessage[]): string[] {
    // En una implementación real, esto analizaría el progreso del aprendizaje
    return ['Comprensión mejorada', 'Aplicación práctica', 'Pensamiento crítico'];
  }

  private initializeDefaultPersonalities(): void {
    const defaultPersonalities: ChatbotPersonality[] = [
      {
        id: 'math-tutor',
        name: 'Math Tutor',
        description: 'Especialista en matemáticas con enfoque pedagógico',
        role: PersonalityRole.TUTOR,
        subject: 'mathematics',
        tone: 'friendly',
        expertise: ['algebra', 'calculus', 'geometry', 'statistics'],
        language: 'es',
        educationalLevel: 'university',
        systemPrompt: 'Eres un tutor de matemáticas experto. Explica conceptos de manera clara y paso a paso.',
      },
      {
        id: 'science-mentor',
        name: 'Science Mentor',
        description: 'Mentor en ciencias con experiencia práctica',
        role: PersonalityRole.MENTOR,
        subject: 'science',
        tone: 'professional',
        expertise: ['physics', 'chemistry', 'biology', 'experiments'],
        language: 'es',
        educationalLevel: 'university',
        systemPrompt: 'Eres un mentor de ciencias. Comparte tu experiencia y guía el aprendizaje práctico.',
      },
    ];

    defaultPersonalities.forEach(personality => {
      this.createPersonality(personality);
    });
  }

  private initializeDefaultFlows(): void {
    const defaultFlows: ConversationFlow[] = [
      {
        id: 'problem-solving',
        name: 'Problem Solving Flow',
        description: 'Flujo para resolver problemas paso a paso',
        steps: [
          {
            id: 'understand-problem',
            order: 1,
            type: 'question',
            content: '¿Puedes explicar el problema en tus propias palabras?',
            nextStep: 'identify-approach',
          },
          {
            id: 'identify-approach',
            order: 2,
            type: 'explanation',
            content: 'Vamos a identificar la mejor estrategia para resolver este problema.',
            nextStep: 'solve-step-by-step',
          },
        ],
        triggers: ['problema', 'resolver', 'ayuda'],
        metadata: {},
      },
    ];

    defaultFlows.forEach(flow => {
      this.createFlow(flow);
    });
  }

  private updateMetrics(type: string, processingTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + processingTime) / 2;
    this.metrics.lastUpdated = new Date().toISOString();
  }

  private updateErrorMetrics(): void {
    this.metrics.errorRate = (this.metrics.errorRate + 1) / 2;
    this.metrics.lastUpdated = new Date().toISOString();
  }
} 