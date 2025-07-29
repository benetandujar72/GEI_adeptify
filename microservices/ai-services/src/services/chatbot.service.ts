import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';
import LLMGatewayService, { LLMRequest } from './llm-gateway.service.js';
import RedisService from './redis.service.js';
import { v4 as uuidv4 } from 'uuid';
import * as natural from 'natural';
import * as sentiment from 'sentiment';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    sentiment?: number;
    confidence?: number;
    intent?: string;
    entities?: string[];
    userId?: string;
    sessionId?: string;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  context: {
    subject?: string;
    topic?: string;
    level?: string;
    language?: string;
    preferences?: Record<string, any>;
    history?: any[];
  };
  metadata: {
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    averageSentiment: number;
    topics: string[];
  };
  settings: ChatbotSettings;
}

export interface ChatbotSettings {
  personality: string;
  language: string;
  responseStyle: 'formal' | 'casual' | 'educational' | 'friendly';
  maxContextLength: number;
  enableSentimentAnalysis: boolean;
  enableIntentRecognition: boolean;
  enableEntityExtraction: boolean;
  enableContextMemory: boolean;
  responseLength: 'short' | 'medium' | 'long';
  temperature: number;
}

export interface ChatRequest {
  message: string;
  userId: string;
  sessionId?: string;
  context?: {
    subject?: string;
    topic?: string;
    level?: string;
    language?: string;
    preferences?: Record<string, any>;
  };
  settings?: Partial<ChatbotSettings>;
}

export interface ChatResponse {
  id: string;
  message: string;
  conversationId: string;
  metadata: {
    sentiment: number;
    confidence: number;
    intent?: string;
    entities?: string[];
    responseTime: number;
    tokensUsed: number;
    cost: number;
  };
  suggestions?: string[];
  context?: any;
}

export interface Intent {
  name: string;
  patterns: string[];
  responses: string[];
  confidence: number;
}

export class ChatbotService {
  private static instance: ChatbotService;
  private llmGateway: LLMGatewayService;
  private redis: RedisService;
  private conversations: Map<string, Conversation> = new Map();
  private intents: Map<string, Intent> = new Map();
  private tokenizer: natural.WordTokenizer;
  private sentimentAnalyzer: sentiment;

  private constructor() {
    this.llmGateway = LLMGatewayService.getInstance();
    this.redis = new RedisService();
    this.tokenizer = new natural.WordTokenizer();
    this.sentimentAnalyzer = new sentiment();
    this.initializeIntents();
  }

  public static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }

  private initializeIntents(): void {
    const intents: Intent[] = [
      {
        name: 'greeting',
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        responses: [
          'Hello! How can I help you today?',
          'Hi there! What would you like to learn about?',
          'Greetings! I\'m here to assist you with your educational journey.'
        ],
        confidence: 0.9
      },
      {
        name: 'farewell',
        patterns: ['bye', 'goodbye', 'see you', 'thank you', 'thanks'],
        responses: [
          'Goodbye! Feel free to return if you have more questions.',
          'See you later! Keep learning and growing!',
          'You\'re welcome! Have a great day!'
        ],
        confidence: 0.9
      },
      {
        name: 'help',
        patterns: ['help', 'support', 'assist', 'what can you do'],
        responses: [
          'I can help you with various educational topics, answer questions, explain concepts, and provide learning resources.',
          'I\'m an educational assistant. I can explain subjects, create content, answer questions, and help with your studies.',
          'I\'m here to support your learning! I can explain topics, generate content, answer questions, and more.'
        ],
        confidence: 0.8
      },
      {
        name: 'explain_topic',
        patterns: ['explain', 'what is', 'how does', 'tell me about', 'describe'],
        responses: [
          'I\'d be happy to explain that topic for you.',
          'Let me break that down for you.',
          'I\'ll help you understand that concept.'
        ],
        confidence: 0.7
      },
      {
        name: 'generate_content',
        patterns: ['create', 'generate', 'make', 'write', 'produce'],
        responses: [
          'I can help you create educational content like quizzes, exercises, or explanations.',
          'Let me generate some educational content for you.',
          'I\'ll create that content for you right away.'
        ],
        confidence: 0.7
      },
      {
        name: 'difficulty_level',
        patterns: ['easy', 'hard', 'difficult', 'simple', 'complex', 'beginner', 'advanced'],
        responses: [
          'I can adjust the difficulty level to match your needs.',
          'Let me tailor the explanation to your level.',
          'I\'ll make sure the content is appropriate for your skill level.'
        ],
        confidence: 0.6
      }
    ];

    intents.forEach(intent => this.intents.set(intent.name, intent));
  }

  public async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const messageId = uuidv4();
    
    try {
      logger.info('Procesando mensaje de chat', {
        messageId,
        userId: request.userId,
        sessionId: request.sessionId,
        messageLength: request.message.length
      });

      // Obtener o crear conversación
      const conversation = await this.getOrCreateConversation(request);
      
      // Analizar mensaje
      const messageAnalysis = await this.analyzeMessage(request.message);
      
      // Crear mensaje de usuario
      const userMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: request.message,
        timestamp: Date.now(),
        metadata: {
          sentiment: messageAnalysis.sentiment,
          intent: messageAnalysis.intent,
          entities: messageAnalysis.entities,
          userId: request.userId,
          sessionId: conversation.sessionId
        }
      };

      // Agregar mensaje a la conversación
      conversation.messages.push(userMessage);
      conversation.metadata.lastActivity = Date.now();
      conversation.metadata.messageCount++;
      conversation.metadata.averageSentiment = this.calculateAverageSentiment(conversation.messages);

      // Generar respuesta
      const response = await this.generateResponse(conversation, userMessage, request.settings);
      
      // Crear mensaje del asistente
      const assistantMessage: ChatMessage = {
        id: response.id,
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        metadata: {
          confidence: response.metadata.confidence,
          intent: response.metadata.intent,
          entities: response.metadata.entities,
          userId: request.userId,
          sessionId: conversation.sessionId
        }
      };

      // Agregar respuesta a la conversación
      conversation.messages.push(assistantMessage);
      conversation.metadata.lastActivity = Date.now();
      conversation.metadata.messageCount++;

      // Actualizar contexto
      await this.updateConversationContext(conversation, userMessage, assistantMessage);

      // Guardar conversación
      await this.saveConversation(conversation);

      // Registrar métricas
      const duration = Date.now() - startTime;
      metrics.recordChatbotMessage('success', duration);
      metrics.recordChatbotUsage(response.metadata.tokensUsed, response.metadata.cost);

      logger.info('Mensaje de chat procesado', {
        messageId,
        conversationId: conversation.id,
        responseTime: duration,
        tokens: response.metadata.tokensUsed,
        cost: response.metadata.cost
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordChatbotMessage('error', duration);
      logger.error('Error procesando mensaje de chat', {
        messageId,
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      throw error;
    }
  }

  private async analyzeMessage(message: string): Promise<{
    sentiment: number;
    intent?: string;
    entities: string[];
    confidence: number;
  }> {
    const tokens = this.tokenizer.tokenize(message.toLowerCase()) || [];
    const sentimentResult = this.sentimentAnalyzer.analyze(message);
    
    // Detectar intent
    let detectedIntent: string | undefined;
    let maxConfidence = 0;

    for (const [intentName, intent] of this.intents.entries()) {
      for (const pattern of intent.patterns) {
        const patternTokens = this.tokenizer.tokenize(pattern.toLowerCase()) || [];
        const matchCount = patternTokens.filter(token => tokens.includes(token)).length;
        const confidence = matchCount / Math.max(patternTokens.length, 1);
        
        if (confidence > maxConfidence && confidence > 0.3) {
          maxConfidence = confidence;
          detectedIntent = intentName;
        }
      }
    }

    // Extraer entidades básicas (palabras clave)
    const entities = tokens.filter(token => 
      token.length > 3 && 
      !['the', 'and', 'but', 'for', 'with', 'this', 'that', 'have', 'will', 'would'].includes(token)
    );

    return {
      sentiment: sentimentResult.score,
      intent: detectedIntent,
      entities,
      confidence: maxConfidence
    };
  }

  private async generateResponse(
    conversation: Conversation, 
    userMessage: ChatMessage, 
    settings?: Partial<ChatbotSettings>
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const responseId = uuidv4();

    // Construir contexto para LLM
    const context = this.buildLLMContext(conversation, userMessage, settings);
    
    // Generar prompt
    const prompt = this.buildPrompt(conversation, userMessage, context, settings);
    
    // Llamar a LLM
    const llmRequest: LLMRequest = {
      prompt,
      model: 'gpt-4',
      maxTokens: 500,
      temperature: settings?.temperature || 0.7,
      userId: conversation.userId,
      sessionId: conversation.sessionId,
      context: conversation.context
    };

    const llmResponse = await this.llmGateway.generateText(llmRequest);

    // Generar sugerencias
    const suggestions = await this.generateSuggestions(conversation, userMessage);

    const response: ChatResponse = {
      id: responseId,
      message: llmResponse.content,
      conversationId: conversation.id,
      metadata: {
        sentiment: userMessage.metadata?.sentiment || 0,
        confidence: userMessage.metadata?.confidence || 0,
        intent: userMessage.metadata?.intent,
        entities: userMessage.metadata?.entities || [],
        responseTime: Date.now() - startTime,
        tokensUsed: llmResponse.usage.totalTokens,
        cost: llmResponse.usage.cost
      },
      suggestions,
      context: conversation.context
    };

    return response;
  }

  private buildLLMContext(
    conversation: Conversation, 
    userMessage: ChatMessage, 
    settings?: Partial<ChatbotSettings>
  ): string {
    const mergedSettings = { ...conversation.settings, ...settings };
    
    let context = `You are an educational AI assistant with the following characteristics:
- Personality: ${mergedSettings.personality}
- Language: ${mergedSettings.language}
- Response Style: ${mergedSettings.responseStyle}
- Response Length: ${mergedSettings.responseLength}

Current conversation context:
- Subject: ${conversation.context.subject || 'General'}
- Topic: ${conversation.context.topic || 'Not specified'}
- Level: ${conversation.context.level || 'Not specified'}
- User Preferences: ${JSON.stringify(conversation.context.preferences || {})}

Recent conversation history (last 5 messages):`;

    const recentMessages = conversation.messages.slice(-5);
    for (const msg of recentMessages) {
      context += `\n${msg.role}: ${msg.content}`;
    }

    context += `\n\nUser's current message: ${userMessage.content}`;
    
    if (userMessage.metadata?.intent) {
      context += `\n\nDetected intent: ${userMessage.metadata.intent}`;
    }

    return context;
  }

  private buildPrompt(
    conversation: Conversation, 
    userMessage: ChatMessage, 
    context: string, 
    settings?: Partial<ChatbotSettings>
  ): string {
    const mergedSettings = { ...conversation.settings, ...settings };
    
    let prompt = context;
    
    prompt += `\n\nPlease respond to the user's message in a ${mergedSettings.responseStyle} manner. `;
    
    if (mergedSettings.responseLength === 'short') {
      prompt += 'Keep your response concise and to the point. ';
    } else if (mergedSettings.responseLength === 'long') {
      prompt += 'Provide a detailed and comprehensive response. ';
    }
    
    prompt += `Consider the conversation context and maintain a helpful, educational tone.`;
    
    return prompt;
  }

  private async generateSuggestions(conversation: Conversation, userMessage: ChatMessage): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Sugerencias basadas en el contexto
    if (conversation.context.subject) {
      suggestions.push(`Tell me more about ${conversation.context.subject}`);
      suggestions.push(`Create a quiz about ${conversation.context.subject}`);
    }
    
    // Sugerencias basadas en el intent
    if (userMessage.metadata?.intent === 'explain_topic') {
      suggestions.push('Can you provide an example?');
      suggestions.push('What are the key points to remember?');
    }
    
    // Sugerencias generales
    suggestions.push('Help me with my studies');
    suggestions.push('Create educational content');
    suggestions.push('Explain a concept');
    
    return suggestions.slice(0, 3); // Máximo 3 sugerencias
  }

  private async getOrCreateConversation(request: ChatRequest): Promise<Conversation> {
    const conversationId = request.sessionId || `${request.userId}_${Date.now()}`;
    const cacheKey = `conversation:${conversationId}`;
    
    // Intentar obtener desde cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const conversation = JSON.parse(cached);
      this.conversations.set(conversationId, conversation);
      return conversation;
    }

    // Crear nueva conversación
    const conversation: Conversation = {
      id: conversationId,
      userId: request.userId,
      sessionId: conversationId,
      messages: [],
      context: {
        subject: request.context?.subject,
        topic: request.context?.topic,
        level: request.context?.level,
        language: request.context?.language,
        preferences: request.context?.preferences,
        history: []
      },
      metadata: {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messageCount: 0,
        averageSentiment: 0,
        topics: []
      },
      settings: {
        personality: 'helpful and knowledgeable',
        language: request.context?.language || 'en',
        responseStyle: 'educational',
        maxContextLength: 10,
        enableSentimentAnalysis: true,
        enableIntentRecognition: true,
        enableEntityExtraction: true,
        enableContextMemory: true,
        responseLength: 'medium',
        temperature: 0.7
      }
    };

    // Aplicar configuraciones personalizadas
    if (request.settings) {
      conversation.settings = { ...conversation.settings, ...request.settings };
    }

    this.conversations.set(conversationId, conversation);
    await this.saveConversation(conversation);
    
    return conversation;
  }

  private async saveConversation(conversation: Conversation): Promise<void> {
    const cacheKey = `conversation:${conversation.id}`;
    await this.redis.set(cacheKey, JSON.stringify(conversation), 86400); // 24 horas
  }

  private async updateConversationContext(
    conversation: Conversation, 
    userMessage: ChatMessage, 
    assistantMessage: ChatMessage
  ): Promise<void> {
    // Actualizar temas
    const newTopics = userMessage.metadata?.entities || [];
    conversation.metadata.topics = [...new Set([...conversation.metadata.topics, ...newTopics])];

    // Actualizar historial
    conversation.context.history = conversation.context.history || [];
    conversation.context.history.push({
      userMessage: userMessage.content,
      assistantMessage: assistantMessage.content,
      timestamp: Date.now(),
      sentiment: userMessage.metadata?.sentiment || 0
    });

    // Mantener solo el historial reciente
    if (conversation.context.history.length > conversation.settings.maxContextLength) {
      conversation.context.history = conversation.context.history.slice(-conversation.settings.maxContextLength);
    }
  }

  private calculateAverageSentiment(messages: ChatMessage[]): number {
    const sentiments = messages
      .map(msg => msg.metadata?.sentiment || 0)
      .filter(sentiment => sentiment !== 0);
    
    if (sentiments.length === 0) return 0;
    return sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length;
  }

  public async getConversation(conversationId: string): Promise<Conversation | null> {
    const cacheKey = `conversation:${conversationId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  public async getUserConversations(userId: string): Promise<Conversation[]> {
    const keys = await this.redis.keys(`conversation:${userId}_*`);
    const conversations: Conversation[] = [];
    
    for (const key of keys) {
      const cached = await this.redis.get(key);
      if (cached) {
        conversations.push(JSON.parse(cached));
      }
    }
    
    return conversations.sort((a, b) => b.metadata.lastActivity - a.metadata.lastActivity);
  }

  public async deleteConversation(conversationId: string): Promise<void> {
    const cacheKey = `conversation:${conversationId}`;
    await this.redis.del(cacheKey);
    this.conversations.delete(conversationId);
    logger.info('Conversación eliminada', { conversationId });
  }

  public async updateConversationSettings(
    conversationId: string, 
    settings: Partial<ChatbotSettings>
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    conversation.settings = { ...conversation.settings, ...settings };
    await this.saveConversation(conversation);
    
    logger.info('Configuración de conversación actualizada', { conversationId, settings });
  }

  public async getChatbotStats(): Promise<Record<string, any>> {
    const stats = {
      activeConversations: this.conversations.size,
      totalIntents: this.intents.size,
      cacheKeys: await this.redis.keys('conversation:*').then(keys => keys.length)
    };

    return stats;
  }

  public async clearOldConversations(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const keys = await this.redis.keys('conversation:*');
    const now = Date.now();
    let deletedCount = 0;
    
    for (const key of keys) {
      const cached = await this.redis.get(key);
      if (cached) {
        const conversation = JSON.parse(cached);
        if (now - conversation.metadata.lastActivity > maxAge) {
          await this.redis.del(key);
          deletedCount++;
        }
      }
    }
    
    logger.info('Conversaciones antiguas limpiadas', { deletedCount });
  }
}

export default ChatbotService;