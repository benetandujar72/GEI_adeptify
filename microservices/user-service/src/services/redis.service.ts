import Redis from 'redis';
import { logger } from '../utils/logger.js';

export class RedisService {
  private client: Redis.RedisClientType | null = null;
  private readonly REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  /**
   * Inicializa la conexión a Redis
   */
  async connect(): Promise<void> {
    try {
      this.client = Redis.createClient({
        url: this.REDIS_URL
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
      });

      await this.client.connect();
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Obtiene un valor de Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Establece un valor en Redis
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }
      
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Elimina una clave de Redis
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis del operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verifica si una clave existe en Redis
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Incrementa un contador en Redis
   */
  async incr(key: string): Promise<number> {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis incr operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Establece un contador con TTL
   */
  async incrWithTTL(key: string, ttl: number): Promise<number> {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }
      
      const result = await this.client.incr(key);
      await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      logger.error('Redis incrWithTTL operation failed', {
        key,
        ttl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Cierra la conexión a Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('Redis connection closed successfully');
      }
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verifica la salud de Redis
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}