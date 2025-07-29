import { Pool, PoolClient } from 'pg';
import { createPool } from 'mysql2/promise';
import { MongoClient, Db } from 'mongodb';
import { EventEmitter } from 'events';

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  queryTimeout: number;
  enableQueryCache: boolean;
  enableConnectionPooling: boolean;
  enableQueryOptimization: boolean;
  enableIndexing: boolean;
  enableSlowQueryLogging: boolean;
  slowQueryThreshold: number;
}

export interface QueryStats {
  query: string;
  count: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  lastUsed: Date;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number;
}

export class DatabaseOptimizer extends EventEmitter {
  private pool: Pool | any;
  private config: DatabaseConfig;
  private queryStats: Map<string, QueryStats> = new Map();
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private slowQueries: Array<{ query: string; time: number; timestamp: Date }> = [];
  private connectionPool: Map<string, any[]> = new Map();
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
    this.initializePool();
  }

  /**
   * Inicializa el pool de conexiones
   */
  private async initializePool(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'postgres':
          this.pool = new Pool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            max: this.config.maxConnections,
            idleTimeoutMillis: this.config.idleTimeout,
            connectionTimeoutMillis: this.config.connectionTimeout,
            query_timeout: this.config.queryTimeout
          });
          break;

        case 'mysql':
          this.pool = createPool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            connectionLimit: this.config.maxConnections,
            acquireTimeout: this.config.connectionTimeout,
            timeout: this.config.queryTimeout
          });
          break;

        case 'mongodb':
          const client = new MongoClient(`mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`);
          await client.connect();
          this.pool = client.db(this.config.database);
          break;
      }

      this.isConnected = true;
      this.emit('poolInitialized', { type: this.config.type, maxConnections: this.config.maxConnections });
    } catch (error) {
      this.emit('poolError', error);
      throw error;
    }
  }

  /**
   * Ejecuta una consulta optimizada
   */
  async query(sql: string, params: any[] = [], options: { cache?: boolean; ttl?: number; timeout?: number } = {}): Promise<any> {
    const startTime = Date.now();
    const queryKey = this.normalizeQuery(sql, params);
    
    try {
      // Verificar caché
      if (options.cache !== false && this.config.enableQueryCache) {
        const cached = this.queryCache.get(queryKey);
        if (cached && Date.now() - cached.timestamp < (options.ttl || 300000)) {
          this.recordQueryStats(queryKey, 0, true, false);
          this.emit('cacheHit', { query: sql, key: queryKey });
          return cached.data;
        }
      }

      // Obtener conexión del pool
      const connection = await this.getConnection();
      
      try {
        let result: any;
        
        switch (this.config.type) {
          case 'postgres':
            result = await connection.query(sql, params);
            break;
          case 'mysql':
            result = await connection.execute(sql, params);
            break;
          case 'mongodb':
            result = await this.executeMongoQuery(sql, params);
            break;
        }

        const duration = Date.now() - startTime;
        
        // Registrar estadísticas
        this.recordQueryStats(queryKey, duration, false, false);
        
        // Verificar si es una query lenta
        if (duration > this.config.slowQueryThreshold) {
          this.recordSlowQuery(sql, duration);
        }

        // Guardar en caché si es necesario
        if (options.cache !== false && this.config.enableQueryCache) {
          this.queryCache.set(queryKey, {
            data: result,
            timestamp: Date.now(),
            ttl: options.ttl || 300000
          });
        }

        this.emit('queryCompleted', { query: sql, duration, result: result.rows || result });
        return result;

      } finally {
        this.returnConnection(connection);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryStats(queryKey, duration, false, true);
      this.emit('queryError', { query: sql, error, duration });
      throw error;
    }
  }

  /**
   * Ejecuta una consulta MongoDB
   */
  private async executeMongoQuery(sql: string, params: any[]): Promise<any> {
    // Implementación simplificada para MongoDB
    // En producción se usaría un parser SQL a MongoDB
    const db = this.pool as Db;
    const collection = sql.split(' ')[3]; // Simplificado
    return await db.collection(collection).find(params[0] || {}).toArray();
  }

  /**
   * Obtiene una conexión del pool
   */
  private async getConnection(): Promise<any> {
    if (!this.isConnected) {
      await this.initializePool();
    }

    switch (this.config.type) {
      case 'postgres':
        return await this.pool.connect();
      case 'mysql':
        return await this.pool.getConnection();
      case 'mongodb':
        return this.pool;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }
  }

  /**
   * Devuelve una conexión al pool
   */
  private returnConnection(connection: any): void {
    if (this.config.type === 'mysql' && connection) {
      connection.release();
    }
    // PostgreSQL y MongoDB manejan automáticamente la liberación
  }

  /**
   * Registra estadísticas de consulta
   */
  private recordQueryStats(queryKey: string, duration: number, cacheHit: boolean, isError: boolean): void {
    const stats = this.queryStats.get(queryKey) || {
      query: queryKey,
      count: 0,
      avgTime: 0,
      minTime: duration,
      maxTime: duration,
      totalTime: 0,
      lastUsed: new Date(),
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.lastUsed = new Date();

    if (cacheHit) {
      stats.cacheHits++;
    } else {
      stats.cacheMisses++;
    }

    if (isError) {
      stats.errorCount++;
    }

    this.queryStats.set(queryKey, stats);
  }

  /**
   * Registra una consulta lenta
   */
  private recordSlowQuery(query: string, duration: number): void {
    this.slowQueries.push({
      query,
      time: duration,
      timestamp: new Date()
    });

    // Mantener solo las últimas 100 queries lentas
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    this.emit('slowQuery', { query, duration, timestamp: new Date() });
  }

  /**
   * Normaliza una query para estadísticas
   */
  private normalizeQuery(sql: string, params: any[]): string {
    let normalized = sql
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .trim();

    // Agregar parámetros como parte de la clave
    if (params.length > 0) {
      normalized += `_params_${params.length}`;
    }

    return normalized;
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  getPerformanceStats(): any {
    const totalQueries = Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.count, 0);
    const totalTime = Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.totalTime, 0);
    const avgQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;

    return {
      totalQueries,
      avgQueryTime,
      cacheStats: {
        size: this.queryCache.size,
        hitRate: this.calculateCacheHitRate(),
        keys: Array.from(this.queryCache.keys())
      },
      slowQueries: this.slowQueries.slice(-10),
      topQueries: this.getTopQueries(),
      errorRate: this.calculateErrorRate(),
      connectionPool: {
        type: this.config.type,
        maxConnections: this.config.maxConnections,
        isConnected: this.isConnected
      }
    };
  }

  /**
   * Calcula la tasa de aciertos del caché
   */
  private calculateCacheHitRate(): number {
    const stats = Array.from(this.queryStats.values());
    const totalHits = stats.reduce((sum, stat) => sum + stat.cacheHits, 0);
    const totalRequests = stats.reduce((sum, stat) => sum + stat.cacheHits + stat.cacheMisses, 0);
    
    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  /**
   * Calcula la tasa de errores
   */
  private calculateErrorRate(): number {
    const stats = Array.from(this.queryStats.values());
    const totalErrors = stats.reduce((sum, stat) => sum + stat.errorCount, 0);
    const totalQueries = stats.reduce((sum, stat) => sum + stat.count, 0);
    
    return totalQueries > 0 ? totalErrors / totalQueries : 0;
  }

  /**
   * Obtiene las consultas más frecuentes
   */
  private getTopQueries(): Array<QueryStats> {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Sugiere índices para mejorar el rendimiento
   */
  async suggestIndexes(): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];
    
    // Analizar queries lentas para sugerir índices
    for (const slowQuery of this.slowQueries) {
      const suggestion = this.analyzeQueryForIndexes(slowQuery.query);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Analiza una query para sugerir índices
   */
  private analyzeQueryForIndexes(query: string): IndexSuggestion | null {
    // Implementación simplificada - en producción se usaría un parser SQL más sofisticado
    const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (whereMatch) {
      const column = whereMatch[1];
      const tableMatch = query.match(/FROM\s+(\w+)/i);
      if (tableMatch) {
        return {
          table: tableMatch[1],
          columns: [column],
          type: 'btree',
          reason: 'Frequent equality lookups',
          estimatedImprovement: 0.8
        };
      }
    }
    return null;
  }

  /**
   * Optimiza el esquema de la base de datos
   */
  async optimizeSchema(): Promise<void> {
    try {
      // Analizar tablas
      await this.analyzeTables();
      
      // Vacuum (PostgreSQL)
      if (this.config.type === 'postgres') {
        await this.query('VACUUM ANALYZE');
      }
      
      // Optimizar tablas (MySQL)
      if (this.config.type === 'mysql') {
        const tables = await this.query('SHOW TABLES');
        for (const table of tables) {
          const tableName = Object.values(table)[0];
          await this.query(`OPTIMIZE TABLE ${tableName}`);
        }
      }

      this.emit('schemaOptimized');
    } catch (error) {
      this.emit('optimizationError', error);
      throw error;
    }
  }

  /**
   * Analiza las tablas para estadísticas
   */
  private async analyzeTables(): Promise<void> {
    switch (this.config.type) {
      case 'postgres':
        await this.query('ANALYZE');
        break;
      case 'mysql':
        // MySQL actualiza estadísticas automáticamente
        break;
      case 'mongodb':
        // MongoDB actualiza estadísticas automáticamente
        break;
    }
  }

  /**
   * Limpia recursos
   */
  async cleanup(): Promise<void> {
    // Limpiar caché
    this.queryCache.clear();
    
    // Limpiar estadísticas antiguas
    const oneDayAgo = new Date(Date.now() - 86400000);
    for (const [key, stats] of this.queryStats.entries()) {
      if (stats.lastUsed < oneDayAgo) {
        this.queryStats.delete(key);
      }
    }

    // Limpiar queries lentas antiguas
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.slowQueries = this.slowQueries.filter(q => q.timestamp > oneHourAgo);

    // Cerrar pool
    if (this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }

    this.isConnected = false;
    this.emit('cleanupCompleted');
  }
}