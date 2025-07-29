import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  requestId: string;
  service: string;
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  statusCode: number;
  responseSize: number;
  cacheHit: boolean;
  databaseQueries: number;
  externalCalls: number;
}

export interface OptimizationConfig {
  enableCompression: boolean;
  enableCaching: boolean;
  enableQueryOptimization: boolean;
  enableConnectionPooling: boolean;
  enableResponseOptimization: boolean;
  cacheTTL: number;
  maxCacheSize: number;
  compressionThreshold: number;
  queryTimeout: number;
  maxConnections: number;
}

export class PerformanceOptimizer extends EventEmitter {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private config: OptimizationConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private queryStats: Map<string, { count: number; avgTime: number; lastUsed: number }> = new Map();
  private connectionPool: Map<string, any[]> = new Map();

  constructor(config: Partial<OptimizationConfig> = {}) {
    super();
    this.config = {
      enableCompression: true,
      enableCaching: true,
      enableQueryOptimization: true,
      enableConnectionPooling: true,
      enableResponseOptimization: true,
      cacheTTL: 300000, // 5 minutes
      maxCacheSize: 1000,
      compressionThreshold: 1024, // 1KB
      queryTimeout: 30000, // 30 seconds
      maxConnections: 10,
      ...config
    };
  }

  /**
   * Inicia el tracking de una request
   */
  startRequest(requestId: string, service: string, endpoint: string, method: string): void {
    const startTime = performance.now();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.set(requestId, {
      requestId,
      service,
      endpoint,
      method,
      startTime,
      endTime: 0,
      duration: 0,
      memoryUsage,
      cpuUsage,
      statusCode: 0,
      responseSize: 0,
      cacheHit: false,
      databaseQueries: 0,
      externalCalls: 0
    });

    this.emit('requestStarted', { requestId, service, endpoint, method, startTime });
  }

  /**
   * Finaliza el tracking de una request
   */
  endRequest(requestId: string, statusCode: number, responseSize: number): PerformanceMetrics | null {
    const metric = this.metrics.get(requestId);
    if (!metric) return null;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.statusCode = statusCode;
    metric.responseSize = responseSize;

    this.metrics.delete(requestId);
    this.emit('requestCompleted', metric);

    return metric;
  }

  /**
   * Registra una consulta de base de datos
   */
  recordDatabaseQuery(requestId: string, query: string, duration: number): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.databaseQueries++;
    }

    // Optimización de queries
    if (this.config.enableQueryOptimization) {
      const queryKey = this.normalizeQuery(query);
      const stats = this.queryStats.get(queryKey) || { count: 0, avgTime: 0, lastUsed: Date.now() };
      
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + duration) / stats.count;
      stats.lastUsed = Date.now();
      
      this.queryStats.set(queryKey, stats);
    }
  }

  /**
   * Registra una llamada externa
   */
  recordExternalCall(requestId: string, service: string, duration: number): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.externalCalls++;
    }
  }

  /**
   * Optimiza una respuesta basada en el tamaño y tipo
   */
  optimizeResponse(data: any, requestId: string): any {
    if (!this.config.enableResponseOptimization) return data;

    const responseSize = JSON.stringify(data).length;
    
    // Compresión si es necesario
    if (this.config.enableCompression && responseSize > this.config.compressionThreshold) {
      // Aquí se implementaría la compresión real
      this.emit('responseCompressed', { requestId, originalSize: responseSize });
    }

    // Optimización de estructura de datos
    const optimized = this.optimizeDataStructure(data);
    
    return optimized;
  }

  /**
   * Obtiene datos del caché
   */
  getFromCache(key: string): any | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    const metric = this.findRequestByKey(key);
    if (metric) {
      metric.cacheHit = true;
    }

    this.emit('cacheHit', { key, timestamp: cached.timestamp });
    return cached.data;
  }

  /**
   * Guarda datos en el caché
   */
  setCache(key: string, data: any, ttl: number = this.config.cacheTTL): void {
    if (!this.config.enableCaching) return;

    // Limpiar caché si está lleno
    if (this.cache.size >= this.config.maxCacheSize) {
      this.cleanupCache();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    this.emit('cacheSet', { key, ttl });
  }

  /**
   * Obtiene una conexión del pool
   */
  getConnection(poolName: string): any | null {
    if (!this.config.enableConnectionPooling) return null;

    const pool = this.connectionPool.get(poolName) || [];
    return pool.length > 0 ? pool.pop() : null;
  }

  /**
   * Devuelve una conexión al pool
   */
  returnConnection(poolName: string, connection: any): void {
    if (!this.config.enableConnectionPooling) return;

    const pool = this.connectionPool.get(poolName) || [];
    if (pool.length < this.config.maxConnections) {
      pool.push(connection);
      this.connectionPool.set(poolName, pool);
    }
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  getPerformanceStats(): any {
    const stats = {
      activeRequests: this.metrics.size,
      cacheStats: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate(),
        keys: Array.from(this.cache.keys())
      },
      queryStats: {
        totalQueries: this.queryStats.size,
        slowQueries: this.getSlowQueries(),
        frequentlyUsed: this.getFrequentlyUsedQueries()
      },
      connectionPools: Object.fromEntries(
        Array.from(this.connectionPool.entries()).map(([name, pool]) => [
          name,
          { available: pool.length, max: this.config.maxConnections }
        ])
      ),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    return stats;
  }

  /**
   * Limpia recursos no utilizados
   */
  cleanup(): void {
    this.cleanupCache();
    this.cleanupQueryStats();
    this.cleanupConnectionPools();
  }

  /**
   * Optimiza la estructura de datos
   */
  private optimizeDataStructure(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.optimizeDataStructure(item));
    }

    if (data && typeof data === 'object') {
      const optimized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Remover propiedades undefined/null
        if (value !== undefined && value !== null) {
          optimized[key] = this.optimizeDataStructure(value);
        }
      }
      
      return optimized;
    }

    return data;
  }

  /**
   * Normaliza una query para estadísticas
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .trim();
  }

  /**
   * Encuentra una request por clave de caché
   */
  private findRequestByKey(key: string): PerformanceMetrics | undefined {
    // Implementación simplificada - en producción se usaría un mapping más sofisticado
    return Array.from(this.metrics.values()).find(metric => 
      metric.requestId.includes(key.split(':')[0])
    );
  }

  /**
   * Calcula la tasa de aciertos del caché
   */
  private calculateCacheHitRate(): number {
    // Implementación simplificada
    return this.cache.size > 0 ? 0.8 : 0; // Placeholder
  }

  /**
   * Obtiene queries lentas
   */
  private getSlowQueries(): Array<{ query: string; avgTime: number; count: number }> {
    return Array.from(this.queryStats.entries())
      .filter(([_, stats]) => stats.avgTime > 100) // > 100ms
      .map(([query, stats]) => ({
        query,
        avgTime: stats.avgTime,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
  }

  /**
   * Obtiene queries frecuentemente usadas
   */
  private getFrequentlyUsedQueries(): Array<{ query: string; count: number; avgTime: number }> {
    return Array.from(this.queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgTime: stats.avgTime
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Limpia el caché
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia estadísticas de queries antiguas
   */
  private cleanupQueryStats(): void {
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, stats] of this.queryStats.entries()) {
      if (stats.lastUsed < oneHourAgo) {
        this.queryStats.delete(key);
      }
    }
  }

  /**
   * Limpia pools de conexiones
   */
  private cleanupConnectionPools(): void {
    // Implementación específica según el tipo de conexión
    this.connectionPool.clear();
  }
}

// Middleware para Express
export const performanceMiddleware = (optimizer: PerformanceOptimizer) => {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;

    optimizer.startRequest(requestId, req.path, req.path, req.method);

    // Interceptar la respuesta
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
      optimizer.endRequest(requestId, res.statusCode, responseSize);
      
      // Optimizar respuesta
      const optimizedData = optimizer.optimizeResponse(data, requestId);
      return originalSend.call(this, optimizedData);
    };

    next();
  };
};