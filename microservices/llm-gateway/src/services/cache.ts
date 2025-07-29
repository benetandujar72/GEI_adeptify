import Redis from 'redis';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import { ChatRequest, CompletionRequest, EmbeddingRequest, ChatResponse, CompletionResponse, EmbeddingResponse } from '../types/llm';

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'redis' | 'memory' | 'hybrid';
  redisUrl?: string;
}

export class CacheService {
  private config: CacheConfig;
  private redisClient?: Redis.RedisClientType;
  private memoryCache: NodeCache;
  private isInitialized = false;

  constructor(config: CacheConfig) {
    this.config = config;
    this.memoryCache = new NodeCache({
      stdTTL: config.ttl,
      maxKeys: config.maxSize,
      checkperiod: 600, // 10 minutos
      useClones: false,
    });
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Cache deshabilitado');
      return;
    }

    try {
      if (this.config.strategy === 'redis' || this.config.strategy === 'hybrid') {
        if (!this.config.redisUrl) {
          throw new Error('Redis URL no configurada');
        }

        this.redisClient = Redis.createClient({
          url: this.config.redisUrl,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                logger.error('Demasiados intentos de reconexión a Redis');
                return new Error('Demasiados intentos de reconexión');
              }
              return Math.min(retries * 100, 3000);
            },
          },
        });

        this.redisClient.on('error', (err) => {
          logger.error('Error de Redis:', err);
        });

        this.redisClient.on('connect', () => {
          logger.info('Conectado a Redis');
        });

        await this.redisClient.connect();
      }

      this.isInitialized = true;
      logger.info(`Cache inicializado con estrategia: ${this.config.strategy}`);
    } catch (error) {
      logger.error('Error inicializando cache:', error);
      if (this.config.strategy === 'redis') {
        throw error;
      }
      // Si es híbrido, continuar con cache en memoria
      this.config.strategy = 'memory';
      this.isInitialized = true;
      logger.info('Fallback a cache en memoria');
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.memoryCache.close();
    this.isInitialized = false;
  }

  private generateKey(request: ChatRequest | CompletionRequest | EmbeddingRequest): string {
    const requestData = JSON.stringify({
      type: this.getRequestType(request),
      data: request,
      timestamp: Math.floor(Date.now() / (this.config.ttl * 1000)) // Redondear al período de TTL
    });

    return createHash('sha256').update(requestData).digest('hex');
  }

  private getRequestType(request: ChatRequest | CompletionRequest | EmbeddingRequest): string {
    if ('messages' in request) return 'chat';
    if ('prompt' in request) return 'completion';
    if ('input' in request) return 'embedding';
    return 'unknown';
  }

  async get<T>(request: ChatRequest | CompletionRequest | EmbeddingRequest): Promise<T | null> {
    if (!this.config.enabled || !this.isInitialized) {
      return null;
    }

    const key = this.generateKey(request);
    
    try {
      // Intentar cache en memoria primero
      if (this.config.strategy === 'memory' || this.config.strategy === 'hybrid') {
        const cached = this.memoryCache.get<T>(key);
        if (cached) {
          logger.debug(`Cache hit en memoria: ${key}`);
          return cached;
        }
      }

      // Intentar Redis si está disponible
      if ((this.config.strategy === 'redis' || this.config.strategy === 'hybrid') && this.redisClient) {
        const cached = await this.redisClient.get(key);
        if (cached) {
          const parsed = JSON.parse(cached) as T;
          logger.debug(`Cache hit en Redis: ${key}`);
          
          // Si es híbrido, también guardar en memoria
          if (this.config.strategy === 'hybrid') {
            this.memoryCache.set(key, parsed);
          }
          
          return parsed;
        }
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error obteniendo del cache:', error);
      return null;
    }
  }

  async set<T>(request: ChatRequest | CompletionRequest | EmbeddingRequest, response: T): Promise<void> {
    if (!this.config.enabled || !this.isInitialized) {
      return;
    }

    const key = this.generateKey(request);
    
    try {
      // Guardar en memoria
      if (this.config.strategy === 'memory' || this.config.strategy === 'hybrid') {
        this.memoryCache.set(key, response);
      }

      // Guardar en Redis si está disponible
      if ((this.config.strategy === 'redis' || this.config.strategy === 'hybrid') && this.redisClient) {
        await this.redisClient.setEx(key, this.config.ttl, JSON.stringify(response));
      }

      logger.debug(`Cache set: ${key}`);
    } catch (error) {
      logger.error('Error guardando en cache:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.config.enabled || !this.isInitialized) {
      return;
    }

    try {
      // Invalidar en memoria
      if (this.config.strategy === 'memory' || this.config.strategy === 'hybrid') {
        const keys = this.memoryCache.keys();
        const matchingKeys = keys.filter(key => key.includes(pattern));
        matchingKeys.forEach(key => this.memoryCache.del(key));
        logger.debug(`Invalidados ${matchingKeys.length} keys en memoria`);
      }

      // Invalidar en Redis si está disponible
      if ((this.config.strategy === 'redis' || this.config.strategy === 'hybrid') && this.redisClient) {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          logger.debug(`Invalidados ${keys.length} keys en Redis`);
        }
      }
    } catch (error) {
      logger.error('Error invalidando cache:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.config.enabled || !this.isInitialized) {
      return;
    }

    try {
      // Limpiar memoria
      if (this.config.strategy === 'memory' || this.config.strategy === 'hybrid') {
        this.memoryCache.flushAll();
        logger.info('Cache en memoria limpiado');
      }

      // Limpiar Redis si está disponible
      if ((this.config.strategy === 'redis' || this.config.strategy === 'hybrid') && this.redisClient) {
        await this.redisClient.flushDb();
        logger.info('Cache en Redis limpiado');
      }
    } catch (error) {
      logger.error('Error limpiando cache:', error);
    }
  }

  getStats(): {
    strategy: string;
    memoryKeys: number;
    memoryHits: number;
    memoryMisses: number;
    redisConnected: boolean;
  } {
    const stats = this.memoryCache.getStats();
    
    return {
      strategy: this.config.strategy,
      memoryKeys: stats.keys,
      memoryHits: stats.hits,
      memoryMisses: stats.misses,
      redisConnected: this.redisClient?.isReady || false,
    };
  }

  // Métodos específicos para tipos de respuesta
  async getChatResponse(request: ChatRequest): Promise<ChatResponse | null> {
    return this.get<ChatResponse>(request);
  }

  async setChatResponse(request: ChatRequest, response: ChatResponse): Promise<void> {
    // Marcar como cacheado
    const cachedResponse = { ...response, cached: true };
    await this.set(request, cachedResponse);
  }

  async getCompletionResponse(request: CompletionRequest): Promise<CompletionResponse | null> {
    return this.get<CompletionResponse>(request);
  }

  async setCompletionResponse(request: CompletionRequest, response: CompletionResponse): Promise<void> {
    const cachedResponse = { ...response, cached: true };
    await this.set(request, cachedResponse);
  }

  async getEmbeddingResponse(request: EmbeddingRequest): Promise<EmbeddingResponse | null> {
    return this.get<EmbeddingResponse>(request);
  }

  async setEmbeddingResponse(request: EmbeddingRequest, response: EmbeddingResponse): Promise<void> {
    const cachedResponse = { ...response, cached: true };
    await this.set(request, cachedResponse);
  }
}

// Instancia global del servicio de cache
export const cacheService = new CacheService({
  enabled: process.env.CACHE_ENABLED === 'true',
  ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hora por defecto
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
  strategy: (process.env.CACHE_STRATEGY as 'redis' | 'memory' | 'hybrid') || 'memory',
  redisUrl: process.env.REDIS_URL,
});