import { createClient, RedisClientType } from 'redis';
import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export class RedisService {
  private client: RedisClientType;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;

  constructor(config: RedisConfig = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...config
    };

    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
        reconnectStrategy: (retries) => {
          if (retries > this.maxReconnectAttempts) {
            logger.error('Max Redis reconnection attempts reached', { retries });
            return new Error('Max reconnection attempts reached');
          }
          this.reconnectAttempts = retries;
          return Math.min(retries * this.reconnectDelay, 3000);
        }
      },
      password: this.config.password,
      database: this.config.db,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      lazyConnect: this.config.lazyConnect
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis connected', { host: this.config.host, port: this.config.port });
      metrics.setRedisConnections(1, 'connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis ready');
      metrics.setRedisConnections(1, 'ready');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis error', { error: error.message });
      metrics.setRedisConnections(0, 'error');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection ended');
      metrics.setRedisConnections(0, 'disconnected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting', { attempt: this.reconnectAttempts });
      metrics.setRedisConnections(0, 'reconnecting');
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Redis ping failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Métodos generales de Redis
  public async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.get(key);
      return result;
    } catch (error) {
      logger.error('Redis get failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<string> {
    try {
      if (ttl) {
        return await this.client.setEx(key, ttl, value);
      } else {
        return await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis del failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis exists failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis expire failed', { key, seconds, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis ttl failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys failed', { pattern, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis incr failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Redis decr failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Redis hget failed', { key, field, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error('Redis hset failed', { key, field, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis hgetall failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async hdel(key: string, field: string): Promise<number> {
    try {
      return await this.client.hDel(key, field);
    } catch (error) {
      logger.error('Redis hdel failed', { key, field, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async lpush(key: string, value: string): Promise<number> {
    try {
      return await this.client.lPush(key, value);
    } catch (error) {
      logger.error('Redis lpush failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rPop(key);
    } catch (error) {
      logger.error('Redis rpop failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      logger.error('Redis lrange failed', { key, start, stop, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async sadd(key: string, member: string): Promise<number> {
    try {
      return await this.client.sAdd(key, member);
    } catch (error) {
      logger.error('Redis sadd failed', { key, member, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async srem(key: string, member: string): Promise<number> {
    try {
      return await this.client.sRem(key, member);
    } catch (error) {
      logger.error('Redis srem failed', { key, member, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error('Redis smembers failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      logger.error('Redis zadd failed', { key, score, member, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      logger.error('Redis zrange failed', { key, start, stop, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async publish(channel: string, message: any): Promise<number> {
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.client.publish(channel, messageStr);
    } catch (error) {
      logger.error('Redis publish failed', { channel, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.client.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch {
          callback(message);
        }
      });
    } catch (error) {
      logger.error('Redis subscribe failed', { channel, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Métodos específicos para LLM Gateway
  public async setLLMResponse(cacheKey: string, response: any, ttl: number = 3600): Promise<void> {
    try {
      await this.set(`llm:${cacheKey}`, JSON.stringify(response), ttl);
      logger.info('LLM response cached', { cacheKey, ttl });
    } catch (error) {
      logger.error('Failed to cache LLM response', { cacheKey, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getLLMResponse(cacheKey: string): Promise<any | null> {
    try {
      const cached = await this.get(`llm:${cacheKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached LLM response', { cacheKey, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setCircuitBreakerState(provider: string, state: 'closed' | 'open' | 'half_open'): Promise<void> {
    try {
      await this.set(`circuit_breaker:${provider}`, state, 300); // 5 minutos
      logger.info('Circuit breaker state updated', { provider, state });
    } catch (error) {
      logger.error('Failed to update circuit breaker state', { provider, state, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getCircuitBreakerState(provider: string): Promise<string | null> {
    try {
      return await this.get(`circuit_breaker:${provider}`);
    } catch (error) {
      logger.error('Failed to get circuit breaker state', { provider, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async incrementRateLimit(key: string, window: number = 3600): Promise<number> {
    try {
      const current = await this.incr(`rate_limit:${key}`);
      if (current === 1) {
        await this.expire(`rate_limit:${key}`, window);
      }
      return current;
    } catch (error) {
      logger.error('Failed to increment rate limit', { key, error: error instanceof Error ? error.message : String(error) });
      return 0;
    }
  }

  // Métodos específicos para Content Generation
  public async setContentCache(contentKey: string, content: any, ttl: number = 3600): Promise<void> {
    try {
      await this.set(`content:${contentKey}`, JSON.stringify(content), ttl);
      logger.info('Content cached', { contentKey, ttl });
    } catch (error) {
      logger.error('Failed to cache content', { contentKey, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getContentCache(contentKey: string): Promise<any | null> {
    try {
      const cached = await this.get(`content:${contentKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached content', { contentKey, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setTemplate(templateId: string, template: any): Promise<void> {
    try {
      await this.set(`template:${templateId}`, JSON.stringify(template));
      logger.info('Template cached', { templateId });
    } catch (error) {
      logger.error('Failed to cache template', { templateId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getTemplate(templateId: string): Promise<any | null> {
    try {
      const cached = await this.get(`template:${templateId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached template', { templateId, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  // Métodos específicos para Chatbot
  public async setConversation(conversationId: string, conversation: any, ttl: number = 86400): Promise<void> {
    try {
      await this.set(`conversation:${conversationId}`, JSON.stringify(conversation), ttl);
      logger.info('Conversation cached', { conversationId, ttl });
    } catch (error) {
      logger.error('Failed to cache conversation', { conversationId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getConversation(conversationId: string): Promise<any | null> {
    try {
      const cached = await this.get(`conversation:${conversationId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached conversation', { conversationId, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setUserConversations(userId: string, conversations: any[]): Promise<void> {
    try {
      await this.set(`user_conversations:${userId}`, JSON.stringify(conversations), 3600);
      logger.info('User conversations cached', { userId });
    } catch (error) {
      logger.error('Failed to cache user conversations', { userId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getUserConversations(userId: string): Promise<any[] | null> {
    try {
      const cached = await this.get(`user_conversations:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached user conversations', { userId, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setIntentPatterns(intent: string, patterns: string[]): Promise<void> {
    try {
      await this.set(`intent_patterns:${intent}`, JSON.stringify(patterns));
      logger.info('Intent patterns cached', { intent });
    } catch (error) {
      logger.error('Failed to cache intent patterns', { intent, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getIntentPatterns(intent: string): Promise<string[] | null> {
    try {
      const cached = await this.get(`intent_patterns:${intent}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached intent patterns', { intent, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  // Métodos específicos para Predictive Analytics
  public async setStudentData(studentId: string, data: any, ttl: number = 86400): Promise<void> {
    try {
      await this.set(`student:${studentId}`, JSON.stringify(data), ttl);
      logger.info('Student data cached', { studentId, ttl });
    } catch (error) {
      logger.error('Failed to cache student data', { studentId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getStudentData(studentId: string): Promise<any | null> {
    try {
      const cached = await this.get(`student:${studentId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached student data', { studentId, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setPrediction(studentId: string, predictionType: string, prediction: any, ttl: number = 3600): Promise<void> {
    try {
      await this.set(`prediction:${studentId}:${predictionType}`, JSON.stringify(prediction), ttl);
      logger.info('Prediction cached', { studentId, predictionType, ttl });
    } catch (error) {
      logger.error('Failed to cache prediction', { studentId, predictionType, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getPrediction(studentId: string, predictionType: string): Promise<any | null> {
    try {
      const cached = await this.get(`prediction:${studentId}:${predictionType}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached prediction', { studentId, predictionType, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setLearningPath(pathId: string, path: any, ttl: number = 86400): Promise<void> {
    try {
      await this.set(`learning_path:${pathId}`, JSON.stringify(path), ttl);
      logger.info('Learning path cached', { pathId, ttl });
    } catch (error) {
      logger.error('Failed to cache learning path', { pathId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getLearningPath(pathId: string): Promise<any | null> {
    try {
      const cached = await this.get(`learning_path:${pathId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached learning path', { pathId, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setContentRecommendations(studentId: string, recommendations: any[], ttl: number = 1800): Promise<void> {
    try {
      await this.set(`recommendations:${studentId}`, JSON.stringify(recommendations), ttl);
      logger.info('Content recommendations cached', { studentId, ttl });
    } catch (error) {
      logger.error('Failed to cache content recommendations', { studentId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getContentRecommendations(studentId: string): Promise<any[] | null> {
    try {
      const cached = await this.get(`recommendations:${studentId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached content recommendations', { studentId, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async setModelConfig(modelName: string, config: any): Promise<void> {
    try {
      await this.set(`model_config:${modelName}`, JSON.stringify(config));
      logger.info('Model config cached', { modelName });
    } catch (error) {
      logger.error('Failed to cache model config', { modelName, error: error instanceof Error ? error.message : String(error) });
    }
  }

  public async getModelConfig(modelName: string): Promise<any | null> {
    try {
      const cached = await this.get(`model_config:${modelName}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached model config', { modelName, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  // Métodos de utilidad
  public async clearCache(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.client.del(...keys);
        logger.info('Cache cleared', { pattern, keysCount: keys.length, deletedCount: deleted });
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Failed to clear cache', { pattern, error: error instanceof Error ? error.message : String(error) });
      return 0;
    }
  }

  public async getStats(): Promise<Record<string, any>> {
    try {
      const info = await this.client.info();
      const stats: Record<string, any> = {
        connected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts,
        info: info
      };

      // Contar diferentes tipos de claves
      const patterns = ['llm:*', 'content:*', 'conversation:*', 'student:*', 'prediction:*', 'learning_path:*', 'recommendations:*'];
      for (const pattern of patterns) {
        const keys = await this.keys(pattern);
        stats[pattern.replace(':*', '_count')] = keys.length;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get Redis stats', { error: error instanceof Error ? error.message : String(error) });
      return { connected: this.isConnected, error: error instanceof Error ? error.message : String(error) };
    }
  }

  public isConnectedToRedis(): boolean {
    return this.isConnected;
  }
}

export default RedisService;