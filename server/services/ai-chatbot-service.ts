import OpenAI from 'openai';
import { db } from '../index.js';
import { logger } from '../utils/logger.js';
import { cacheService } from './cache-service.js';
import { z } from 'zod';

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    context?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    confidence?: number;
    topics?: string[];
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

export interface ChatbotConfig {
  openaiApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  contextWindow: number;
}

export interface ChatResponse {
  message: ChatMessage;
  suggestions: string[];
  relatedTopics: string[];
  confidence: number;
}

export class AIChatbotService {
  private openai: OpenAI;
  private config: ChatbotConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
      systemPrompt: `Eres un asistente educativo inteligente para la plataforma GEI Unified. Tu objetivo es ayudar a estudiantes, profesores y administradores con:

1. **Preguntas académicas**: Explicar conceptos, resolver dudas, proporcionar recursos
2. **Uso de la plataforma**: Guiar en el uso de funcionalidades, explicar procesos
3. **Análisis de datos**: Interpretar reportes, explicar métricas, sugerir mejoras
4. **Recomendaciones**: Sugerir estrategias de estudio, recursos adicionales
5. **Soporte técnico**: Ayudar con problemas técnicos básicos

Mantén un tono profesional pero amigable. Proporciona respuestas claras, concisas y útiles. Si no estás seguro de algo, indícalo claramente.`,
      contextWindow: 10
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
      logger.info('✅ Servicio de chatbot IA inicializado');
    } catch (error) {
      logger.error('❌ Error al inicializar chatbot IA:', error);
      throw error;
    }
  }

  async createChatSession(userId: string, title?: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: title || 'Nueva conversación',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0
    };

    // Guardar en caché
    await cacheService.set(`chat_session:${session.id}`, session, 3600);
    
    return session;
  }

  async sendMessage(
    sessionId: string,
    userId: string,
    content: string,
    context?: string
  ): Promise<ChatResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('Chatbot no está inicializado');
      }

      // Obtener historial de mensajes
      const messages = await this.getChatHistory(sessionId);
      
      // Analizar sentimiento del mensaje
      const sentiment = await this.analyzeSentiment(content);
      
      // Extraer temas del mensaje
      const topics = await this.extractTopics(content);

      // Crear mensaje del usuario
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        role: 'user',
        content,
        timestamp: new Date(),
        metadata: {
          context,
          sentiment,
          topics
        }
      };

      // Preparar mensajes para OpenAI
      const openaiMessages = [
        { role: 'system' as const, content: this.config.systemPrompt },
        ...messages.slice(-this.config.contextWindow).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content }
      ];

      // Obtener respuesta de OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      const assistantContent = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';

      // Crear mensaje del asistente
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'assistant',
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        metadata: {
          confidence: completion.choices[0]?.finish_reason === 'stop' ? 0.9 : 0.7
        }
      };

      // Guardar mensajes
      await this.saveMessage(sessionId, userMessage);
      await this.saveMessage(sessionId, assistantMessage);

      // Generar sugerencias
      const suggestions = await this.generateSuggestions(content, assistantContent);
      
      // Obtener temas relacionados
      const relatedTopics = await this.getRelatedTopics(topics);

      return {
        message: assistantMessage,
        suggestions,
        relatedTopics,
        confidence: assistantMessage.metadata?.confidence || 0.8
      };

    } catch (error) {
      logger.error('Error en sendMessage:', error);
      throw error;
    }
  }

  private async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const cacheKey = `chat_history:${sessionId}`;
    const cached = await cacheService.get<ChatMessage[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // En una implementación real, obtendrías esto de la base de datos
    // Por ahora, retornamos un array vacío
    return [];
  }

  private async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const cacheKey = `chat_history:${sessionId}`;
    const history = await this.getChatHistory(sessionId);
    history.push(message);
    
    // Mantener solo los últimos 50 mensajes
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    await cacheService.set(cacheKey, history, 3600);
  }

  private async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analiza el sentimiento del siguiente texto y responde solo con: positive, negative, o neutral'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const sentiment = response.choices[0]?.message?.content?.toLowerCase().trim();
      
      if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
        return sentiment;
      }
      
      return 'neutral';
    } catch (error) {
      logger.error('Error al analizar sentimiento:', error);
      return 'neutral';
    }
  }

  private async extractTopics(text: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extrae los temas principales del siguiente texto. Responde con una lista separada por comas, máximo 5 temas.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      });

      const topicsText = response.choices[0]?.message?.content || '';
      return topicsText.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } catch (error) {
      logger.error('Error al extraer temas:', error);
      return [];
    }
  }

  private async generateSuggestions(userMessage: string, assistantResponse: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Basándote en el mensaje del usuario y la respuesta del asistente, genera 3 sugerencias de preguntas relacionadas que el usuario podría hacer a continuación. Responde solo con las preguntas, una por línea.'
          },
          {
            role: 'user',
            content: `Usuario: ${userMessage}\nAsistente: ${assistantResponse}`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const suggestionsText = response.choices[0]?.message?.content || '';
      return suggestionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
    } catch (error) {
      logger.error('Error al generar sugerencias:', error);
      return [];
    }
  }

  private async getRelatedTopics(topics: string[]): Promise<string[]> {
    if (topics.length === 0) return [];

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Basándote en los temas proporcionados, sugiere 3 temas relacionados que podrían ser útiles para el usuario. Responde solo con los temas, uno por línea.'
          },
          {
            role: 'user',
            content: `Temas: ${topics.join(', ')}`
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      });

      const relatedText = response.choices[0]?.message?.content || '';
      return relatedText.split('\n').map(t => t.trim()).filter(t => t.length > 0).slice(0, 3);
    } catch (error) {
      logger.error('Error al obtener temas relacionados:', error);
      return [];
    }
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    const cacheKey = `user_sessions:${userId}`;
    const cached = await cacheService.get<ChatSession[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // En una implementación real, obtendrías esto de la base de datos
    return [];
  }

  async deleteChatSession(sessionId: string, userId: string): Promise<void> {
    await cacheService.delete(`chat_session:${sessionId}`);
    await cacheService.delete(`chat_history:${sessionId}`);
    
    // Actualizar lista de sesiones del usuario
    const sessions = await this.getChatSessions(userId);
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    await cacheService.set(`user_sessions:${userId}`, updatedSessions, 3600);
  }

  async getChatStats(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    mostActiveDay: string;
    sentimentDistribution: Record<string, number>;
  }> {
    const sessions = await this.getChatSessions(userId);
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

    return {
      totalSessions,
      totalMessages,
      averageMessagesPerSession,
      mostActiveDay: 'Lunes', // Placeholder
      sentimentDistribution: {
        positive: 60,
        neutral: 30,
        negative: 10
      }
    };
  }
}

export const aiChatbotService = new AIChatbotService(); 