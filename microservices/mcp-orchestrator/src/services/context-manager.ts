import { createClient } from 'redis';
import winston from 'winston';

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configurar Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Interfaces para el Context Manager
interface Context {
  id: string;
  userId: string;
  sessionId: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  ttl: number;
}

interface ContextRequest {
  userId: string;
  sessionId: string;
  key: string;
  value?: any;
}

class ContextManager {
  private readonly DEFAULT_TTL = 3600; // 1 hora

  async createContext(userId: string, sessionId: string): Promise<Context> {
    const contextId = context::;
    const context: Context = {
      id: contextId,
      userId,
      sessionId,
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ttl: this.DEFAULT_TTL
    };

    await redisClient.setEx(contextId, this.DEFAULT_TTL, JSON.stringify(context));
    logger.info(Created context for user: , session: );
    
    return context;
  }

  async getContext(userId: string, sessionId: string): Promise<Context | null> {
    const contextId = context::;
    const contextData = await redisClient.get(contextId);
    
    if (!contextData) {
      return null;
    }

    const context: Context = JSON.parse(contextData);
    return context;
  }

  async updateContext(userId: string, sessionId: string, data: Record<string, any>): Promise<Context> {
    const context = await this.getContext(userId, sessionId);
    
    if (!context) {
      return this.createContext(userId, sessionId);
    }

    context.data = { ...context.data, ...data };
    context.updatedAt = new Date();

    const contextId = context::;
    await redisClient.setEx(contextId, this.DEFAULT_TTL, JSON.stringify(context));
    
    logger.info(Updated context for user: , session: );
    return context;
  }

  async deleteContext(userId: string, sessionId: string): Promise<boolean> {
    const contextId = context::;
    const result = await redisClient.del(contextId);
    
    logger.info(Deleted context for user: , session: );
    return result > 0;
  }

  async getContextValue(userId: string, sessionId: string, key: string): Promise<any> {
    const context = await this.getContext(userId, sessionId);
    return context?.data[key] || null;
  }

  async setContextValue(userId: string, sessionId: string, key: string, value: any): Promise<void> {
    const context = await this.getContext(userId, sessionId);
    
    if (!context) {
      await this.createContext(userId, sessionId);
    }

    await this.updateContext(userId, sessionId, { [key]: value });
  }

  async clearContext(userId: string, sessionId: string): Promise<void> {
    await this.deleteContext(userId, sessionId);
  }

  async getContextStats(): Promise<Record<string, any>> {
    const keys = await redisClient.keys('context:*');
    const stats = {
      totalContexts: keys.length,
      activeUsers: new Set(keys.map(key => key.split(':')[1])).size,
      timestamp: new Date().toISOString()
    };

    return stats;
  }
}

export default new ContextManager();
