import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface MemoryConfig {
  maxHeapSize: number; // MB
  gcThreshold: number; // Porcentaje de uso de heap
  memoryCheckInterval: number; // ms
  enableGarbageCollection: boolean;
  enableMemoryMonitoring: boolean;
  enableLeakDetection: boolean;
  enableCompression: boolean;
  compressionThreshold: number; // bytes
  maxCacheSize: number; // MB
  cleanupInterval: number; // ms
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapFree: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  heapUsagePercentage: number;
  gcCount: number;
  gcDuration: number;
  memoryLeaks: Array<{ type: string; count: number; size: number }>;
  cacheSize: number;
  cacheHitRate: number;
}

export interface MemoryLeak {
  type: string;
  count: number;
  size: number;
  timestamp: Date;
  stack: string;
}

export class MemoryOptimizer extends EventEmitter {
  private config: MemoryConfig;
  private memoryStats: MemoryStats;
  private gcStats: { count: number; duration: number; lastGc: number } = { count: 0, duration: 0, lastGc: 0 };
  private memoryLeaks: MemoryLeak[] = [];
  private cache: Map<string, { data: any; size: number; timestamp: number; compressed: boolean }> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private objectTracker: Map<string, { count: number; size: number; lastSeen: number }> = new Map();

  constructor(config: Partial<MemoryConfig> = {}) {
    super();
    this.config = {
      maxHeapSize: 512, // 512MB
      gcThreshold: 80, // 80%
      memoryCheckInterval: 30000, // 30 seconds
      enableGarbageCollection: true,
      enableMemoryMonitoring: true,
      enableLeakDetection: true,
      enableCompression: true,
      compressionThreshold: 1024, // 1KB
      maxCacheSize: 100, // 100MB
      cleanupInterval: 60000, // 1 minute
      ...config
    };

    this.memoryStats = this.getCurrentMemoryStats();
    this.startMonitoring();
  }

  /**
   * Inicia el monitoreo de memoria
   */
  private startMonitoring(): void {
    if (this.config.enableMemoryMonitoring) {
      this.monitoringInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, this.config.memoryCheckInterval);
    }

    if (this.config.enableGarbageCollection) {
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, this.config.cleanupInterval);
    }

    // Configurar garbage collection monitoring
    if (typeof gc !== 'undefined') {
      const gc = require('gc-stats')();
      gc.on('stats', (stats: any) => {
        this.gcStats.count++;
        this.gcStats.duration += stats.pause;
        this.gcStats.lastGc = Date.now();
        this.emit('garbageCollected', stats);
      });
    }
  }

  /**
   * Verifica el uso de memoria y toma acciones si es necesario
   */
  private checkMemoryUsage(): void {
    const stats = this.getCurrentMemoryStats();
    this.memoryStats = stats;

    // Verificar si se excede el umbral de heap
    if (stats.heapUsagePercentage > this.config.gcThreshold) {
      this.emit('memoryThresholdExceeded', {
        current: stats.heapUsagePercentage,
        threshold: this.config.gcThreshold,
        stats
      });

      if (this.config.enableGarbageCollection) {
        this.forceGarbageCollection();
      }
    }

    // Detectar memory leaks
    if (this.config.enableLeakDetection) {
      this.detectMemoryLeaks();
    }

    // Optimizar caché si es necesario
    if (stats.cacheSize > this.config.maxCacheSize * 1024 * 1024) {
      this.optimizeCache();
    }

    this.emit('memoryStats', stats);
  }

  /**
   * Obtiene estadísticas actuales de memoria
   */
  getCurrentMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const heapUsagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapFree: memUsage.heapTotal - memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
      heapUsagePercentage,
      gcCount: this.gcStats.count,
      gcDuration: this.gcStats.duration,
      memoryLeaks: this.memoryLeaks.slice(-10),
      cacheSize: this.calculateCacheSize(),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Fuerza la recolección de basura
   */
  private forceGarbageCollection(): void {
    if (typeof gc !== 'undefined') {
      const startTime = performance.now();
      gc();
      const duration = performance.now() - startTime;
      
      this.emit('garbageCollectionForced', { duration });
    }
  }

  /**
   * Detecta memory leaks
   */
  private detectMemoryLeaks(): void {
    const currentStats = this.getCurrentMemoryStats();
    const previousStats = this.memoryStats;

    // Detectar crecimiento anormal del heap
    if (currentStats.heapUsed > previousStats.heapUsed * 1.1) { // 10% de crecimiento
      const leak: MemoryLeak = {
        type: 'heap_growth',
        count: 1,
        size: currentStats.heapUsed - previousStats.heapUsed,
        timestamp: new Date(),
        stack: new Error().stack || ''
      };

      this.memoryLeaks.push(leak);
      this.emit('memoryLeakDetected', leak);
    }

    // Detectar objetos no liberados
    this.trackObjects();
  }

  /**
   * Rastrea objetos para detectar leaks
   */
  private trackObjects(): void {
    // Implementación simplificada - en producción se usaría un profiler más sofisticado
    const weakMap = new WeakMap();
    const objectCount = weakMap.size;
    
    if (objectCount > 1000) { // Umbral arbitrario
      const leak: MemoryLeak = {
        type: 'object_accumulation',
        count: objectCount,
        size: objectCount * 100, // Estimación
        timestamp: new Date(),
        stack: new Error().stack || ''
      };

      this.memoryLeaks.push(leak);
      this.emit('memoryLeakDetected', leak);
    }
  }

  /**
   * Optimiza el caché
   */
  private optimizeCache(): void {
    const entries = Array.from(this.cache.entries());
    const totalSize = entries.reduce((sum, [_, entry]) => sum + entry.size, 0);
    const targetSize = this.config.maxCacheSize * 1024 * 1024 * 0.8; // 80% del máximo

    if (totalSize > targetSize) {
      // Eliminar entradas más antiguas
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      let removedSize = 0;
      for (const [key, entry] of entries) {
        if (removedSize >= totalSize - targetSize) break;
        
        this.cache.delete(key);
        removedSize += entry.size;
      }

      this.emit('cacheOptimized', { removedSize, remainingSize: totalSize - removedSize });
    }
  }

  /**
   * Guarda datos en caché con optimización de memoria
   */
  setCache(key: string, data: any, ttl: number = 300000): void {
    const dataSize = this.calculateObjectSize(data);
    const shouldCompress = this.config.enableCompression && dataSize > this.config.compressionThreshold;

    let processedData = data;
    let compressed = false;

    if (shouldCompress) {
      processedData = this.compressData(data);
      compressed = true;
    }

    this.cache.set(key, {
      data: processedData,
      size: this.calculateObjectSize(processedData),
      timestamp: Date.now(),
      compressed
    });

    this.emit('cacheSet', { key, size: dataSize, compressed });
  }

  /**
   * Obtiene datos del caché
   */
  getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > 300000) { // 5 minutes TTL
      this.cache.delete(key);
      return null;
    }

    let data = entry.data;
    if (entry.compressed) {
      data = this.decompressData(data);
    }

    this.emit('cacheHit', { key, size: entry.size, compressed: entry.compressed });
    return data;
  }

  /**
   * Comprime datos
   */
  private compressData(data: any): any {
    // Implementación simplificada - en producción se usaría zlib o similar
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64');
  }

  /**
   * Descomprime datos
   */
  private decompressData(data: any): any {
    // Implementación simplificada
    const jsonString = Buffer.from(data, 'base64').toString();
    return JSON.parse(jsonString);
  }

  /**
   * Calcula el tamaño de un objeto
   */
  private calculateObjectSize(obj: any): number {
    const str = JSON.stringify(obj);
    return Buffer.byteLength(str, 'utf8');
  }

  /**
   * Calcula el tamaño total del caché
   */
  private calculateCacheSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Calcula la tasa de aciertos del caché
   */
  private calculateCacheHitRate(): number {
    // Implementación simplificada
    return this.cache.size > 0 ? 0.85 : 0; // Placeholder
  }

  /**
   * Realiza limpieza periódica
   */
  private performCleanup(): void {
    // Limpiar caché expirado
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > 300000) { // 5 minutes
        this.cache.delete(key);
      }
    }

    // Limpiar memory leaks antiguos
    const oneHourAgo = Date.now() - 3600000;
    this.memoryLeaks = this.memoryLeaks.filter(leak => leak.timestamp.getTime() > oneHourAgo);

    // Limpiar object tracker
    const oneMinuteAgo = Date.now() - 60000;
    for (const [key, tracker] of this.objectTracker.entries()) {
      if (tracker.lastSeen < oneMinuteAgo) {
        this.objectTracker.delete(key);
      }
    }

    this.emit('cleanupCompleted');
  }

  /**
   * Obtiene estadísticas de rendimiento de memoria
   */
  getMemoryPerformanceStats(): any {
    const stats = this.getCurrentMemoryStats();
    
    return {
      ...stats,
      recommendations: this.generateRecommendations(stats),
      alerts: this.generateAlerts(stats),
      optimization: {
        cacheEfficiency: this.calculateCacheEfficiency(),
        memoryEfficiency: this.calculateMemoryEfficiency(),
        gcEfficiency: this.calculateGCEfficiency()
      }
    };
  }

  /**
   * Genera recomendaciones de optimización
   */
  private generateRecommendations(stats: MemoryStats): string[] {
    const recommendations: string[] = [];

    if (stats.heapUsagePercentage > 90) {
      recommendations.push('Heap usage is very high. Consider increasing memory limits or optimizing data structures.');
    }

    if (stats.cacheSize > this.config.maxCacheSize * 1024 * 1024 * 0.8) {
      recommendations.push('Cache size is approaching limit. Consider reducing cache TTL or implementing LRU eviction.');
    }

    if (stats.memoryLeaks.length > 5) {
      recommendations.push('Multiple memory leaks detected. Review object lifecycle management.');
    }

    if (stats.gcDuration > 100) {
      recommendations.push('Garbage collection is taking too long. Consider optimizing object creation and disposal.');
    }

    return recommendations;
  }

  /**
   * Genera alertas de memoria
   */
  private generateAlerts(stats: MemoryStats): Array<{ level: 'warning' | 'error'; message: string }> {
    const alerts: Array<{ level: 'warning' | 'error'; message: string }> = [];

    if (stats.heapUsagePercentage > 95) {
      alerts.push({
        level: 'error',
        message: `Critical memory usage: ${stats.heapUsagePercentage.toFixed(1)}%`
      });
    } else if (stats.heapUsagePercentage > 85) {
      alerts.push({
        level: 'warning',
        message: `High memory usage: ${stats.heapUsagePercentage.toFixed(1)}%`
      });
    }

    if (stats.memoryLeaks.length > 10) {
      alerts.push({
        level: 'error',
        message: `Multiple memory leaks detected: ${stats.memoryLeaks.length}`
      });
    }

    return alerts;
  }

  /**
   * Calcula eficiencia del caché
   */
  private calculateCacheEfficiency(): number {
    const hitRate = this.calculateCacheHitRate();
    const sizeEfficiency = 1 - (this.calculateCacheSize() / (this.config.maxCacheSize * 1024 * 1024));
    return (hitRate + sizeEfficiency) / 2;
  }

  /**
   * Calcula eficiencia de memoria
   */
  private calculateMemoryEfficiency(): number {
    const stats = this.getCurrentMemoryStats();
    return 1 - (stats.heapUsagePercentage / 100);
  }

  /**
   * Calcula eficiencia de garbage collection
   */
  private calculateGCEfficiency(): number {
    if (this.gcStats.count === 0) return 1;
    return Math.max(0, 1 - (this.gcStats.duration / (this.gcStats.count * 100)));
  }

  /**
   * Detiene el monitoreo
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cache.clear();
    this.memoryLeaks = [];
    this.objectTracker.clear();

    this.emit('monitoringStopped');
  }

  /**
   * Limpia todos los recursos
   */
  cleanup(): void {
    this.stop();
    this.emit('cleanupCompleted');
  }
}