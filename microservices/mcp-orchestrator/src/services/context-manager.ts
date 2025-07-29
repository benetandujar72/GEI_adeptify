import { v4 as uuidv4 } from 'uuid';
import { Context, ContextType, ContextData } from '../types/mcp';
import { logContext, logError } from '../utils/logger';

export class ContextManager {
  private contexts: Map<string, Context> = new Map();
  private userContexts: Map<string, string[]> = new Map(); // userId -> contextIds
  private sessionContexts: Map<string, string[]> = new Map(); // sessionId -> contextIds
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxAge: number = 24 * 60 * 60 * 1000; // 24 hours
  private readonly cleanupIntervalMs: number = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanupInterval();
  }

  // Create Context
  async createContext(
    type: ContextType,
    data: ContextData,
    userId?: string,
    sessionId?: string,
    expiresAt?: Date
  ): Promise<Context> {
    const contextId = uuidv4();
    const now = new Date();
    
    const context: Context = {
      id: contextId,
      type,
      userId,
      sessionId,
      data,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt || new Date(now.getTime() + this.maxAge)
    };

    this.contexts.set(contextId, context);

    // Track by user
    if (userId) {
      if (!this.userContexts.has(userId)) {
        this.userContexts.set(userId, []);
      }
      this.userContexts.get(userId)!.push(contextId);
    }

    // Track by session
    if (sessionId) {
      if (!this.sessionContexts.has(sessionId)) {
        this.sessionContexts.set(sessionId, []);
      }
      this.sessionContexts.get(sessionId)!.push(contextId);
    }

    logContext('create', contextId, { type, userId, sessionId, dataSize: Object.keys(data).length });

    return context;
  }

  // Get Context
  async getContext(contextId: string): Promise<Context | null> {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      return null;
    }

    // Check if expired
    if (context.expiresAt && context.expiresAt < new Date()) {
      await this.deleteContext(contextId);
      return null;
    }

    // Update last access
    context.updatedAt = new Date();
    this.contexts.set(contextId, context);

    logContext('get', contextId, { type: context.type, userId: context.userId });

    return context;
  }

  // Update Context
  async updateContext(contextId: string, updates: Partial<ContextData>): Promise<Context | null> {
    const context = await this.getContext(contextId);
    
    if (!context) {
      return null;
    }

    // Merge updates
    context.data = { ...context.data, ...updates };
    context.updatedAt = new Date();

    this.contexts.set(contextId, context);

    logContext('update', contextId, { 
      type: context.type, 
      userId: context.userId, 
      updates: Object.keys(updates) 
    });

    return context;
  }

  // Delete Context
  async deleteContext(contextId: string): Promise<boolean> {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      return false;
    }

    // Remove from tracking maps
    if (context.userId) {
      const userContexts = this.userContexts.get(context.userId);
      if (userContexts) {
        const index = userContexts.indexOf(contextId);
        if (index > -1) {
          userContexts.splice(index, 1);
        }
      }
    }

    if (context.sessionId) {
      const sessionContexts = this.sessionContexts.get(context.sessionId);
      if (sessionContexts) {
        const index = sessionContexts.indexOf(contextId);
        if (index > -1) {
          sessionContexts.splice(index, 1);
        }
      }
    }

    this.contexts.delete(contextId);

    logContext('delete', contextId, { type: context.type, userId: context.userId });

    return true;
  }

  // Get Contexts by User
  async getContextsByUser(userId: string, type?: ContextType): Promise<Context[]> {
    const contextIds = this.userContexts.get(userId) || [];
    const contexts: Context[] = [];

    for (const contextId of contextIds) {
      const context = await this.getContext(contextId);
      if (context && (!type || context.type === type)) {
        contexts.push(context);
      }
    }

    return contexts;
  }

  // Get Contexts by Session
  async getContextsBySession(sessionId: string, type?: ContextType): Promise<Context[]> {
    const contextIds = this.sessionContexts.get(sessionId) || [];
    const contexts: Context[] = [];

    for (const contextId of contextIds) {
      const context = await this.getContext(contextId);
      if (context && (!type || context.type === type)) {
        contexts.push(context);
      }
    }

    return contexts;
  }

  // Search Contexts
  async searchContexts(criteria: {
    type?: ContextType;
    userId?: string;
    sessionId?: string;
    dataKeys?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
  }): Promise<Context[]> {
    const contexts: Context[] = [];

    for (const context of this.contexts.values()) {
      // Check if expired
      if (context.expiresAt && context.expiresAt < new Date()) {
        continue;
      }

      // Apply filters
      if (criteria.type && context.type !== criteria.type) {
        continue;
      }

      if (criteria.userId && context.userId !== criteria.userId) {
        continue;
      }

      if (criteria.sessionId && context.sessionId !== criteria.sessionId) {
        continue;
      }

      if (criteria.dataKeys) {
        const hasAllKeys = criteria.dataKeys.every(key => key in context.data);
        if (!hasAllKeys) {
          continue;
        }
      }

      if (criteria.createdAfter && context.createdAt < criteria.createdAfter) {
        continue;
      }

      if (criteria.createdBefore && context.createdAt > criteria.createdBefore) {
        continue;
      }

      contexts.push(context);
    }

    return contexts;
  }

  // Merge Contexts
  async mergeContexts(contextIds: string[], targetContextId?: string): Promise<Context | null> {
    if (contextIds.length === 0) {
      return null;
    }

    const contexts: Context[] = [];
    for (const contextId of contextIds) {
      const context = await this.getContext(contextId);
      if (context) {
        contexts.push(context);
      }
    }

    if (contexts.length === 0) {
      return null;
    }

    // Use the first context as base
    const baseContext = contexts[0];
    const mergedData: ContextData = { ...baseContext.data };

    // Merge data from other contexts
    for (let i = 1; i < contexts.length; i++) {
      const context = contexts[i];
      Object.assign(mergedData, context.data);
    }

    // Create new merged context or update target
    if (targetContextId) {
      return await this.updateContext(targetContextId, mergedData);
    } else {
      return await this.createContext(
        baseContext.type,
        mergedData,
        baseContext.userId,
        baseContext.sessionId
      );
    }
  }

  // Get Context Summary
  async getContextSummary(): Promise<{
    total: number;
    byType: Record<ContextType, number>;
    active: number;
    expired: number;
    byUser: number;
    bySession: number;
  }> {
    const now = new Date();
    let active = 0;
    let expired = 0;
    const byType: Record<ContextType, number> = {
      [ContextType.USER_SESSION]: 0,
      [ContextType.LEARNING_SESSION]: 0,
      [ContextType.AI_INTERACTION]: 0,
      [ContextType.SYSTEM_OPERATION]: 0
    };

    for (const context of this.contexts.values()) {
      byType[context.type]++;

      if (context.expiresAt && context.expiresAt < now) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.contexts.size,
      byType,
      active,
      expired,
      byUser: this.userContexts.size,
      bySession: this.sessionContexts.size
    };
  }

  // Cleanup Expired Contexts
  async cleanupExpiredContexts(): Promise<number> {
    const now = new Date();
    const expiredContextIds: string[] = [];

    for (const [contextId, context] of this.contexts.entries()) {
      if (context.expiresAt && context.expiresAt < now) {
        expiredContextIds.push(contextId);
      }
    }

    let cleanedCount = 0;
    for (const contextId of expiredContextIds) {
      const deleted = await this.deleteContext(contextId);
      if (deleted) {
        cleanedCount++;
      }
    }

    logContext('cleanup', 'system', { cleanedCount, remaining: this.contexts.size });

    return cleanedCount;
  }

  // Start Cleanup Interval
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredContexts();
      } catch (error) {
        logError(error as Error, { operation: 'cleanup_expired_contexts' });
      }
    }, this.cleanupIntervalMs);
  }

  // Stop Cleanup Interval
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Get All Contexts (for debugging)
  async getAllContexts(): Promise<Context[]> {
    return Array.from(this.contexts.values());
  }

  // Clear All Contexts (for testing)
  async clearAllContexts(): Promise<void> {
    this.contexts.clear();
    this.userContexts.clear();
    this.sessionContexts.clear();
  }

  // Get Context Statistics
  async getContextStatistics(): Promise<{
    totalContexts: number;
    contextsByType: Record<ContextType, number>;
    contextsByUser: number;
    contextsBySession: number;
    averageContextSize: number;
    oldestContext: Date | null;
    newestContext: Date | null;
  }> {
    const contexts = Array.from(this.contexts.values());
    const byType: Record<ContextType, number> = {
      [ContextType.USER_SESSION]: 0,
      [ContextType.LEARNING_SESSION]: 0,
      [ContextType.AI_INTERACTION]: 0,
      [ContextType.SYSTEM_OPERATION]: 0
    };

    let totalSize = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const context of contexts) {
      byType[context.type]++;
      totalSize += JSON.stringify(context.data).length;

      if (!oldestDate || context.createdAt < oldestDate) {
        oldestDate = context.createdAt;
      }

      if (!newestDate || context.createdAt > newestDate) {
        newestDate = context.createdAt;
      }
    }

    return {
      totalContexts: contexts.length,
      contextsByType: byType,
      contextsByUser: this.userContexts.size,
      contextsBySession: this.sessionContexts.size,
      averageContextSize: contexts.length > 0 ? totalSize / contexts.length : 0,
      oldestContext: oldestDate,
      newestContext: newestDate
    };
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
