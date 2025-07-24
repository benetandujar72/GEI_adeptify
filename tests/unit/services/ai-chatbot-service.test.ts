import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIChatbotService } from '../../../server/services/ai-chatbot-service.js';
import { cacheService } from '../../../server/services/cache-service.js';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

// Mock cache service
vi.mock('../../../server/services/cache-service.js', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    clear: vi.fn()
  }
}));

describe('AIChatbotService', () => {
  let chatbotService: AIChatbotService;

  beforeEach(() => {
    chatbotService = new AIChatbotService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid configuration', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const result = await chatbotService.initialize();
      
      expect(result).toBe(true);
      expect(chatbotService.isInitialized).toBe(true);
    });

    it('should throw error when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      
      await expect(chatbotService.initialize()).rejects.toThrow(
        'OpenAI API key is required'
      );
    });
  });

  describe('createChatSession', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should create a new chat session successfully', async () => {
      const sessionData = {
        userId: 'user123',
        context: 'educational',
        metadata: { subject: 'math' }
      };

      const session = await chatbotService.createChatSession(sessionData);

      expect(session).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.context).toBe('educational');
      expect(session.messages).toHaveLength(0);
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    it('should generate unique session ID', async () => {
      const session1 = await chatbotService.createChatSession({ userId: 'user1' });
      const session2 = await chatbotService.createChatSession({ userId: 'user2' });

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should send message and get AI response', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Hello! How can I help you with your studies today?',
            role: 'assistant'
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const session = await chatbotService.createChatSession({ userId: 'user123' });
      
      const response = await chatbotService.sendMessage(session.sessionId, {
        content: 'Hello, I need help with math',
        role: 'user'
      });

      expect(response).toBeDefined();
      expect(response.content).toContain('Hello! How can I help you');
      expect(response.role).toBe('assistant');
      expect(response.sentiment).toBeDefined();
      expect(response.topics).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });

    it('should handle session not found', async () => {
      await expect(
        chatbotService.sendMessage('invalid-session', {
          content: 'Hello',
          role: 'user'
        })
      ).rejects.toThrow('Chat session not found');
    });

    it('should analyze sentiment correctly', async () => {
      const session = await chatbotService.createChatSession({ userId: 'user123' });
      
      const response = await chatbotService.sendMessage(session.sessionId, {
        content: 'I am very happy with my progress!',
        role: 'user'
      });

      expect(response.sentiment).toBeDefined();
      expect(['positive', 'negative', 'neutral']).toContain(response.sentiment.label);
    });
  });

  describe('getChatHistory', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should return chat history for valid session', async () => {
      const session = await chatbotService.createChatSession({ userId: 'user123' });
      
      await chatbotService.sendMessage(session.sessionId, {
        content: 'Hello',
        role: 'user'
      });

      const history = await chatbotService.getChatHistory(session.sessionId);

      expect(history).toBeDefined();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Hello');
      expect(history[0].role).toBe('user');
    });

    it('should return empty array for non-existent session', async () => {
      const history = await chatbotService.getChatHistory('invalid-session');
      expect(history).toEqual([]);
    });
  });

  describe('getChatSessions', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should return all sessions for a user', async () => {
      await chatbotService.createChatSession({ userId: 'user123' });
      await chatbotService.createChatSession({ userId: 'user123' });
      await chatbotService.createChatSession({ userId: 'user456' });

      const sessions = await chatbotService.getChatSessions('user123');

      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.userId === 'user123')).toBe(true);
    });

    it('should return empty array for user with no sessions', async () => {
      const sessions = await chatbotService.getChatSessions('user999');
      expect(sessions).toEqual([]);
    });
  });

  describe('deleteChatSession', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should delete session successfully', async () => {
      const session = await chatbotService.createChatSession({ userId: 'user123' });
      
      const result = await chatbotService.deleteChatSession(session.sessionId);
      expect(result).toBe(true);

      const sessions = await chatbotService.getChatSessions('user123');
      expect(sessions).toHaveLength(0);
    });

    it('should return false for non-existent session', async () => {
      const result = await chatbotService.deleteChatSession('invalid-session');
      expect(result).toBe(false);
    });
  });

  describe('getChatStats', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should return correct statistics', async () => {
      const session = await chatbotService.createChatSession({ userId: 'user123' });
      
      await chatbotService.sendMessage(session.sessionId, {
        content: 'Hello',
        role: 'user'
      });

      const stats = await chatbotService.getChatStats();

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.averageMessagesPerSession).toBeGreaterThan(0);
    });
  });

  describe('generateSuggestions', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should generate relevant suggestions based on context', async () => {
      const session = await chatbotService.createChatSession({ 
        userId: 'user123',
        context: 'math_help'
      });

      const suggestions = await chatbotService.generateSuggestions(session.sessionId);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => typeof s === 'string')).toBe(true);
    });
  });

  describe('getRelatedTopics', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await chatbotService.initialize();
    });

    it('should return related topics based on message content', async () => {
      const session = await chatbotService.createChatSession({ userId: 'user123' });
      
      await chatbotService.sendMessage(session.sessionId, {
        content: 'I need help with algebra',
        role: 'user'
      });

      const topics = await chatbotService.getRelatedTopics(session.sessionId);

      expect(topics).toBeDefined();
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
    });
  });
}); 