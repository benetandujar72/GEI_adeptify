import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  ttl?: number;
  maxMemory?: string;
  maxMemoryPolicy?: string;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
  hitRate: number;
}

export class CacheService {
  private client: RedisClientType;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private isConnected: boolean = false;

  constructor(config: CacheConfig = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      ttl: parseInt(process.env.REDIS_TTL || '3600'),
      maxMemory: process.env.REDIS_MAX_MEMORY || '256mb',
      maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      hitRate: 0
    };

    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port
      },
      password: this.config.password,
      database: this.config.db
    });

    this.setupEventHandlers();
  }

  /**
   * Configura los event handlers para el cliente Redis
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('🔗 Conectado a Redis');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis listo para operaciones');
      this.configureRedis();
    });

    this.client.on('error', (error) => {
      logger.error('❌ Error de Redis:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.warn('⚠️ Conexión a Redis cerrada');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('🔄 Reconectando a Redis...');
    });
  }

  /**
   * Configura Redis con parámetros optimizados
   */
  private async configureRedis(): Promise<void> {
    try {
      // Configurar memoria máxima
      await this.client.configSet('maxmemory', this.config.maxMemory!);
      await this.client.configSet('maxmemory-policy', this.config.maxMemoryPolicy!);
      
      // Configurar persistencia
      await this.client.configSet('save', '900 1 300 10 60 10000');
      
      // Configurar compresión
      await this.client.configSet('hash-max-ziplist-entries', '512');
      await this.client.configSet('hash-max-ziplist-value', '64');
      
      logger.info('⚙️ Redis configurado con parámetros optimizados');
    } catch (error) {
      logger.warn('⚠️ No se pudieron configurar parámetros avanzados de Redis:', error);
    }
  }

  /**
   * Conecta al cliente Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Desconecta del cliente Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  /**
   * Obtiene un valor del caché
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.connect();
      
      const value = await this.client.get(key);
      
      if (value) {
        this.metrics.hits++;
        const parsed = JSON.parse(value);
        logger.debug(`✅ Cache hit: ${key}`);
        return parsed;
      } else {
        this.metrics.misses++;
        logger.debug(`❌ Cache miss: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error('Error obteniendo del caché:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * Establece un valor en el caché
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      await this.connect();
      
      const ttl = options.ttl || this.config.ttl;
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      // Añadir tags si se especifican
      if (options.tags && options.tags.length > 0) {
        await this.addTags(key, options.tags);
      }

      logger.debug(`💾 Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Error estableciendo en caché:', error);
    }
  }

  /**
   * Elimina un valor del caché
   */
  async delete(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
      logger.debug(`🗑️ Cache delete: ${key}`);
    } catch (error) {
      logger.error('Error eliminando del caché:', error);
    }
  }

  /**
   * Elimina múltiples valores del caché
   */
  async deleteMultiple(keys: string[]): Promise<void> {
    try {
      await this.connect();
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`🗑️ Cache delete multiple: ${keys.length} keys`);
      }
    } catch (error) {
      logger.error('Error eliminando múltiples del caché:', error);
    }
  }

  /**
   * Elimina todos los valores con un patrón específico
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      await this.connect();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`🗑️ Cache delete pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error('Error eliminando patrón del caché:', error);
    }
  }

  /**
   * Elimina todos los valores con tags específicos
   */
  async deleteByTags(tags: string[]): Promise<void> {
    try {
      await this.connect();
      const keysToDelete: string[] = [];
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.client.sMembers(tagKey);
        keysToDelete.push(...keys);
      }

      if (keysToDelete.length > 0) {
        await this.deleteMultiple([...new Set(keysToDelete)]);
        logger.debug(`🗑️ Cache delete by tags: ${tags.join(', ')} (${keysToDelete.length} keys)`);
      }
    } catch (error) {
      logger.error('Error eliminando por tags del caché:', error);
    }
  }

  /**
   * Añade tags a una clave
   */
  private async addTags(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await this.client.sAdd(tagKey, key);
        // Establecer TTL para el tag
        await this.client.expire(tagKey, this.config.ttl!);
      }
    } catch (error) {
      logger.error('Error añadiendo tags:', error);
    }
  }

  /**
   * Obtiene o establece un valor (get-or-set pattern)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Incrementa un contador
   */
  async increment(key: string, value: number = 1, options: CacheOptions = {}): Promise<number> {
    try {
      await this.connect();
      const result = await this.client.incrBy(key, value);
      
      // Establecer TTL si no existe
      if (options.ttl) {
        await this.client.expire(key, options.ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Error incrementando contador:', error);
      return 0;
    }
  }

  /**
   * Establece un valor solo si no existe
   */
  async setIfNotExists<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      await this.connect();
      
      const ttl = options.ttl || this.config.ttl;
      const serializedValue = JSON.stringify(value);
      
      const result = await this.client.setNX(key, serializedValue);
      
      if (result && ttl) {
        await this.client.expire(key, ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Error estableciendo si no existe:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  async getStats(): Promise<CacheMetrics> {
    try {
      await this.connect();
      
      const info = await this.client.info('stats');
      const keyspace = await this.client.info('keyspace');
      
      // Parsear información de Redis
      const stats = this.parseRedisInfo(info);
      const keyspaceInfo = this.parseRedisKeyspace(keyspace);
      
      this.metrics.keys = keyspaceInfo.keys || 0;
      this.metrics.memory = stats.used_memory || 0;
      
      return { ...this.metrics };
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      return { ...this.metrics };
    }
  }

  /**
   * Limpia todo el caché
   */
  async clear(): Promise<void> {
    try {
      await this.connect();
      await this.client.flushDb();
      logger.info('🧹 Cache limpiado completamente');
    } catch (error) {
      logger.error('Error limpiando caché:', error);
    }
  }

  /**
   * Actualiza la tasa de aciertos
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Parsea la información de estadísticas de Redis
   */
  private parseRedisInfo(info: string): Record<string, number> {
    const stats: Record<string, number> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value && !isNaN(Number(value))) {
        stats[key] = Number(value);
      }
    }
    
    return stats;
  }

  /**
   * Parsea la información de keyspace de Redis
   */
  private parseRedisKeyspace(keyspace: string): Record<string, number> {
    const info: Record<string, number> = {};
    const lines = keyspace.split('\r\n');
    
    for (const line of lines) {
      if (line.startsWith('db')) {
        const match = line.match(/keys=(\d+)/);
        if (match) {
          info.keys = Number(match[1]);
        }
      }
    }
    
    return info;
  }

  /**
   * Verifica si el servicio está conectado
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Obtiene el cliente Redis (para operaciones avanzadas)
   */
  getClient(): RedisClientType {
    return this.client;
  }
}

// Instancia singleton del servicio de caché
export const cacheService = new CacheService();

// Funciones de utilidad para caché
export const cacheUtils = {
  /**
   * Genera una clave de caché para consultas de base de datos
   */
  generateQueryKey(table: string, filters: Record<string, any> = {}): string {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    
    return `query:${table}:${filterStr || 'all'}`;
  },

  /**
   * Genera una clave de caché para usuarios
   */
  generateUserKey(userId: string, resource: string): string {
    return `user:${userId}:${resource}`;
  },

  /**
   * Genera una clave de caché para institutos
   */
  generateInstituteKey(instituteId: string, resource: string): string {
    return `institute:${instituteId}:${resource}`;
  },

  /**
   * Genera tags para invalidación de caché
   */
  generateTags(table: string, instituteId?: string): string[] {
    const tags = [`table:${table}`];
    if (instituteId) {
      tags.push(`institute:${instituteId}`);
    }
    return tags;
  }
}; 