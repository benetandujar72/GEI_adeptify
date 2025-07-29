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
  enableReadyCheck?: boolean;
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
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      ...config
    };

    this.client = createClient({
      url: this.config.url,
      socket: {
        host: this.config.host,
        port: this.config.port,
        reconnectStrategy: (retries) => {
          if (retries > this.maxReconnectAttempts) {
            logger.error('Max Redis reconnection attempts reached', { retries });
            return new Error('Max reconnection attempts reached');
          }
          
          this.reconnectAttempts = retries;
          const delay = Math.min(this.reconnectDelay * Math.pow(2, retries), 30000);
          
          logger.warn('Redis reconnection attempt', { 
            attempt: retries, 
            delay,
            maxAttempts: this.maxReconnectAttempts 
          });
          
          return delay;
        }
      },
      password: this.config.password,
      database: this.config.db,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      lazyConnect: this.config.lazyConnect
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis connected and ready');
      metrics.setRedisConnections(1, 'connected');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis error', { error: error.message });
      metrics.recordRedisOperation('error', 'failed', 0);
      metrics.setRedisConnections(0, 'error');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection ended');
      metrics.setRedisConnections(0, 'disconnected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...', { attempt: this.reconnectAttempts });
    });

    this.client.on('warning', (warning) => {
      logger.warn('Redis warning', { warning: warning.message });
    });
  }

  public async connect(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.client.connect();
      const duration = Date.now() - startTime;
      
      logger.info('Redis connection established', { duration });
      metrics.recordRedisOperation('connect', 'success', duration);
      
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      metrics.recordRedisOperation('connect', 'failed', 0);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.client.quit();
      const duration = Date.now() - startTime;
      
      this.isConnected = false;
      logger.info('Redis connection closed', { duration });
      metrics.recordRedisOperation('disconnect', 'success', duration);
      
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      metrics.recordRedisOperation('disconnect', 'failed', 0);
      throw error;
    }
  }

  public async ping(): Promise<string> {
    try {
      const startTime = Date.now();
      const result = await this.client.ping();
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('ping', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis ping failed', { error });
      metrics.recordRedisOperation('ping', 'failed', 0);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      const startTime = Date.now();
      const result = await this.client.get(key);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('get', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis get failed', { key, error });
      metrics.recordRedisOperation('get', 'failed', 0);
      throw error;
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<string> {
    try {
      const startTime = Date.now();
      const result = ttl 
        ? await this.client.setEx(key, ttl, value)
        : await this.client.set(key, value);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('set', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis set failed', { key, error });
      metrics.recordRedisOperation('set', 'failed', 0);
      throw error;
    }
  }

  public async del(key: string): Promise<number> {
    try {
      const startTime = Date.now();
      const result = await this.client.del(key);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('del', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis del failed', { key, error });
      metrics.recordRedisOperation('del', 'failed', 0);
      throw error;
    }
  }

  public async exists(key: string): Promise<number> {
    try {
      const startTime = Date.now();
      const result = await this.client.exists(key);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('exists', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis exists failed', { key, error });
      metrics.recordRedisOperation('exists', 'failed', 0);
      throw error;
    }
  }

  public async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const startTime = Date.now();
      const result = await this.client.expire(key, ttl);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('expire', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis expire failed', { key, ttl, error });
      metrics.recordRedisOperation('expire', 'failed', 0);
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      const startTime = Date.now();
      const result = await this.client.ttl(key);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('ttl', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis ttl failed', { key, error });
      metrics.recordRedisOperation('ttl', 'failed', 0);
      throw error;
    }
  }

  // Métodos específicos para MCP Orchestrator

  // Cache de servicios MCP
  public async setMCPService(serviceId: string, serviceData: any, ttl: number = 3600): Promise<void> {
    const key = `mcp:service:${serviceId}`;
    await this.set(key, JSON.stringify(serviceData), ttl);
  }

  public async getMCPService(serviceId: string): Promise<any | null> {
    const key = `mcp:service:${serviceId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async removeMCPService(serviceId: string): Promise<void> {
    const key = `mcp:service:${serviceId}`;
    await this.del(key);
  }

  // Cache de routing
  public async setRoutingCache(routeKey: string, routeData: any, ttl: number = 1800): Promise<void> {
    const key = `routing:cache:${routeKey}`;
    await this.set(key, JSON.stringify(routeData), ttl);
  }

  public async getRoutingCache(routeKey: string): Promise<any | null> {
    const key = `routing:cache:${routeKey}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async removeRoutingCache(routeKey: string): Promise<void> {
    const key = `routing:cache:${routeKey}`;
    await this.del(key);
  }

  // Gestión de contextos
  public async setContext(contextId: string, contextData: any, ttl: number = 7200): Promise<void> {
    const key = `context:${contextId}`;
    await this.set(key, JSON.stringify(contextData), ttl);
  }

  public async getContext(contextId: string): Promise<any | null> {
    const key = `context:${contextId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async removeContext(contextId: string): Promise<void> {
    const key = `context:${contextId}`;
    await this.del(key);
  }

  public async updateContext(contextId: string, updates: any): Promise<void> {
    const existing = await this.getContext(contextId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: Date.now() };
      await this.setContext(contextId, updated);
    }
  }

  // Gestión de agentes
  public async setAgent(agentId: string, agentData: any, ttl: number = 3600): Promise<void> {
    const key = `agent:${agentId}`;
    await this.set(key, JSON.stringify(agentData), ttl);
  }

  public async getAgent(agentId: string): Promise<any | null> {
    const key = `agent:${agentId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async removeAgent(agentId: string): Promise<void> {
    const key = `agent:${agentId}`;
    await this.del(key);
  }

  // Gestión de workflows
  public async setWorkflow(workflowId: string, workflowData: any, ttl: number = 14400): Promise<void> {
    const key = `workflow:${workflowId}`;
    await this.set(key, JSON.stringify(workflowData), ttl);
  }

  public async getWorkflow(workflowId: string): Promise<any | null> {
    const key = `workflow:${workflowId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async removeWorkflow(workflowId: string): Promise<void> {
    const key = `workflow:${workflowId}`;
    await this.del(key);
  }

  // Gestión de tareas
  public async setTask(taskId: string, taskData: any, ttl: number = 7200): Promise<void> {
    const key = `task:${taskId}`;
    await this.set(key, JSON.stringify(taskData), ttl);
  }

  public async getTask(taskId: string): Promise<any | null> {
    const key = `task:${taskId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async removeTask(taskId: string): Promise<void> {
    const key = `task:${taskId}`;
    await this.del(key);
  }

  // Rate limiting
  public async incrementRateLimit(key: string, window: number = 3600): Promise<number> {
    const current = await this.get(key);
    const count = current ? parseInt(current) : 0;
    const newCount = count + 1;
    
    if (count === 0) {
      await this.set(key, newCount.toString(), window);
    } else {
      await this.set(key, newCount.toString());
    }
    
    return newCount;
  }

  public async getRateLimit(key: string): Promise<number> {
    const current = await this.get(key);
    return current ? parseInt(current) : 0;
  }

  // Circuit breaker
  public async setCircuitBreakerState(service: string, state: 'closed' | 'open' | 'half_open'): Promise<void> {
    const key = `circuit:breaker:${service}`;
    const data = {
      state,
      timestamp: Date.now(),
      lastFailure: null
    };
    await this.set(key, JSON.stringify(data), 3600);
  }

  public async getCircuitBreakerState(service: string): Promise<any | null> {
    const key = `circuit:breaker:${service}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async recordCircuitBreakerFailure(service: string): Promise<void> {
    const key = `circuit:breaker:${service}`;
    const existing = await this.get(key);
    const data = existing ? JSON.parse(existing) : { state: 'closed', failures: 0 };
    
    data.failures = (data.failures || 0) + 1;
    data.lastFailure = Date.now();
    
    if (data.failures >= 5) {
      data.state = 'open';
    }
    
    await this.set(key, JSON.stringify(data), 3600);
  }

  // Pub/Sub para comunicación entre servicios
  public async publish(channel: string, message: any): Promise<number> {
    try {
      const startTime = Date.now();
      const result = await this.client.publish(channel, JSON.stringify(message));
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('publish', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis publish failed', { channel, error });
      metrics.recordRedisOperation('publish', 'failed', 0);
      throw error;
    }
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error('Error parsing Redis message', { channel, error });
        }
      });
      
      logger.info('Redis subscription established', { channel });
      
    } catch (error) {
      logger.error('Redis subscribe failed', { channel, error });
      throw error;
    }
  }

  // Métodos de utilidad
  public async keys(pattern: string): Promise<string[]> {
    try {
      const startTime = Date.now();
      const result = await this.client.keys(pattern);
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('keys', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis keys failed', { pattern, error });
      metrics.recordRedisOperation('keys', 'failed', 0);
      throw error;
    }
  }

  public async flushDb(): Promise<string> {
    try {
      const startTime = Date.now();
      const result = await this.client.flushDb();
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('flushDb', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis flushDb failed', { error });
      metrics.recordRedisOperation('flushDb', 'failed', 0);
      throw error;
    }
  }

  public async info(): Promise<string> {
    try {
      const startTime = Date.now();
      const result = await this.client.info();
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('info', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis info failed', { error });
      metrics.recordRedisOperation('info', 'failed', 0);
      throw error;
    }
  }

  public async memoryUsage(): Promise<any> {
    try {
      const startTime = Date.now();
      const result = await this.client.memoryUsage();
      const duration = Date.now() - startTime;
      
      metrics.recordRedisOperation('memoryUsage', 'success', duration);
      return result;
      
    } catch (error) {
      logger.error('Redis memoryUsage failed', { error });
      metrics.recordRedisOperation('memoryUsage', 'failed', 0);
      throw error;
    }
  }

  // Métodos de salud
  public isConnected(): boolean {
    return this.isConnected;
  }

  public getConnectionInfo(): any {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      config: {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      }
    };
  }

  // Método para limpiar datos expirados
  public async cleanupExpiredData(): Promise<void> {
    try {
      const patterns = [
        'mcp:service:*',
        'routing:cache:*',
        'context:*',
        'agent:*',
        'workflow:*',
        'task:*',
        'circuit:breaker:*'
      ];

      for (const pattern of patterns) {
        const keys = await this.keys(pattern);
        for (const key of keys) {
          const ttl = await this.ttl(key);
          if (ttl === -2) { // Key doesn't exist
            await this.del(key);
          }
        }
      }

      logger.info('Redis cleanup completed');
      
    } catch (error) {
      logger.error('Redis cleanup failed', { error });
    }
  }
}

export default RedisService;