import { Redis } from 'ioredis';

export interface Context {
  userId: string;
  sessionId: string;
  timestamp: number;
  data: any;
  metadata: any;
}

export class ContextManager {
  private redis: Redis;
  private readonly TTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async setContext(sessionId: string, context: Context): Promise<void> {
    const key = context:;
    await this.redis.setex(key, this.TTL, JSON.stringify(context));
  }

  async getContext(sessionId: string): Promise<Context | null> {
    const key = context:;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateContext(sessionId: string, updates: Partial<Context>): Promise<void> {
    const existing = await this.getContext(sessionId);
    if (existing) {
      const updated = { ...existing, ...updates, timestamp: Date.now() };
      await this.setContext(sessionId, updated);
    }
  }

  async clearContext(sessionId: string): Promise<void> {
    const key = context:;
    await this.redis.del(key);
  }

  async getContextHistory(userId: string, limit: number = 10): Promise<Context[]> {
    const pattern = context:*;
    const keys = await this.redis.keys(pattern);
    const contexts: Context[] = [];

    for (const key of keys.slice(0, limit)) {
      const data = await this.redis.get(key);
      if (data) {
        const context = JSON.parse(data);
        if (context.userId === userId) {
          contexts.push(context);
        }
      }
    }

    return contexts.sort((a, b) => b.timestamp - a.timestamp);
  }
}
