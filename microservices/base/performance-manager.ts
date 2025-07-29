import { EventEmitter } from 'events';
import { PerformanceOptimizer } from './performance-optimizer';
import { DatabaseOptimizer } from './database-optimizer';
import { MemoryOptimizer } from './memory-optimizer';
import { NetworkOptimizer } from './network-optimizer';

export interface PerformanceManagerConfig {
  enablePerformanceOptimization: boolean;
  enableDatabaseOptimization: boolean;
  enableMemoryOptimization: boolean;
  enableNetworkOptimization: boolean;
  monitoringInterval: number;
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
    databaseQueryTime: number;
  };
  optimizationSchedule: {
    databaseCleanup: number; // ms
    memoryCleanup: number; // ms
    cacheCleanup: number; // ms
    statsReset: number; // ms
  };
}

export interface SystemPerformanceStats {
  timestamp: Date;
  overall: {
    health: 'excellent' | 'good' | 'warning' | 'critical';
    score: number; // 0-100
    recommendations: string[];
    alerts: Array<{ level: 'warning' | 'error'; message: string }>;
  };
  performance: any;
  database: any;
  memory: any;
  network: any;
  services: Array<{
    name: string;
    health: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
    throughput: number;
  }>;
}

export class PerformanceManager extends EventEmitter {
  private config: PerformanceManagerConfig;
  private performanceOptimizer: PerformanceOptimizer;
  private databaseOptimizer: DatabaseOptimizer | null = null;
  private memoryOptimizer: MemoryOptimizer;
  private networkOptimizer: NetworkOptimizer;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private serviceHealth: Map<string, { health: string; lastCheck: number; metrics: any }> = new Map();

  constructor(config: Partial<PerformanceManagerConfig> = {}) {
    super();
    this.config = {
      enablePerformanceOptimization: true,
      enableDatabaseOptimization: true,
      enableMemoryOptimization: true,
      enableNetworkOptimization: true,
      monitoringInterval: 30000, // 30 seconds
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        responseTime: 5000,
        errorRate: 10,
        databaseQueryTime: 1000
      },
      optimizationSchedule: {
        databaseCleanup: 3600000, // 1 hour
        memoryCleanup: 300000, // 5 minutes
        cacheCleanup: 600000, // 10 minutes
        statsReset: 86400000 // 24 hours
      },
      ...config
    };

    // Inicializar optimizadores
    this.performanceOptimizer = new PerformanceOptimizer();
    this.memoryOptimizer = new MemoryOptimizer();
    this.networkOptimizer = new NetworkOptimizer();

    this.startMonitoring();
    this.scheduleOptimizations();
  }

  /**
   * Configura el optimizador de base de datos
   */
  setDatabaseOptimizer(databaseConfig: any): void {
    if (this.config.enableDatabaseOptimization) {
      this.databaseOptimizer = new DatabaseOptimizer(databaseConfig);
      this.setupDatabaseOptimizerEvents();
    }
  }

  /**
   * Configura eventos del optimizador de base de datos
   */
  private setupDatabaseOptimizerEvents(): void {
    if (!this.databaseOptimizer) return;

    this.databaseOptimizer.on('slowQuery', (data) => {
      this.emit('databaseSlowQuery', data);
    });

    this.databaseOptimizer.on('queryError', (data) => {
      this.emit('databaseError', data);
    });

    this.databaseOptimizer.on('cacheHit', (data) => {
      this.emit('databaseCacheHit', data);
    });
  }

  /**
   * Inicia el monitoreo del sistema
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemStats();
    }, this.config.monitoringInterval);
  }

  /**
   * Programa optimizaciones automáticas
   */
  private scheduleOptimizations(): void {
    // Limpieza de base de datos
    if (this.config.enableDatabaseOptimization) {
      const dbCleanup = setInterval(() => {
        this.performDatabaseCleanup();
      }, this.config.optimizationSchedule.databaseCleanup);
      this.optimizationIntervals.set('databaseCleanup', dbCleanup);
    }

    // Limpieza de memoria
    if (this.config.enableMemoryOptimization) {
      const memCleanup = setInterval(() => {
        this.performMemoryCleanup();
      }, this.config.optimizationSchedule.memoryCleanup);
      this.optimizationIntervals.set('memoryCleanup', memCleanup);
    }

    // Limpieza de caché
    const cacheCleanup = setInterval(() => {
      this.performCacheCleanup();
    }, this.config.optimizationSchedule.cacheCleanup);
    this.optimizationIntervals.set('cacheCleanup', cacheCleanup);

    // Reset de estadísticas
    const statsReset = setInterval(() => {
      this.resetStats();
    }, this.config.optimizationSchedule.statsReset);
    this.optimizationIntervals.set('statsReset', statsReset);
  }

  /**
   * Recolecta estadísticas del sistema
   */
  private async collectSystemStats(): Promise<void> {
    try {
      const stats: SystemPerformanceStats = {
        timestamp: new Date(),
        overall: {
          health: 'excellent',
          score: 100,
          recommendations: [],
          alerts: []
        },
        performance: this.performanceOptimizer.getPerformanceStats(),
        database: this.databaseOptimizer?.getPerformanceStats() || null,
        memory: this.memoryOptimizer.getMemoryPerformanceStats(),
        network: this.networkOptimizer.getNetworkPerformanceStats(),
        services: this.getServiceHealth()
      };

      // Calcular salud general del sistema
      const overallHealth = this.calculateOverallHealth(stats);
      stats.overall = overallHealth;

      // Emitir eventos si hay alertas
      if (overallHealth.alerts.length > 0) {
        this.emit('systemAlerts', overallHealth.alerts);
      }

      // Emitir estadísticas
      this.emit('systemStats', stats);

      // Verificar si se necesitan optimizaciones automáticas
      this.checkAutomaticOptimizations(stats);

    } catch (error) {
      this.emit('monitoringError', error);
    }
  }

  /**
   * Calcula la salud general del sistema
   */
  private calculateOverallHealth(stats: SystemPerformanceStats): {
    health: 'excellent' | 'good' | 'warning' | 'critical';
    score: number;
    recommendations: string[];
    alerts: Array<{ level: 'warning' | 'error'; message: string }>;
  } {
    const alerts: Array<{ level: 'warning' | 'error'; message: string }> = [];
    const recommendations: string[] = [];
    let score = 100;

    // Verificar memoria
    if (stats.memory.heapUsagePercentage > this.config.alertThresholds.memoryUsage) {
      const level = stats.memory.heapUsagePercentage > 95 ? 'error' : 'warning';
      alerts.push({
        level,
        message: `High memory usage: ${stats.memory.heapUsagePercentage.toFixed(1)}%`
      });
      score -= 20;
    }

    // Verificar base de datos
    if (stats.database) {
      if (stats.database.avgQueryTime > this.config.alertThresholds.databaseQueryTime) {
        alerts.push({
          level: 'warning',
          message: `Slow database queries: ${stats.database.avgQueryTime.toFixed(0)}ms average`
        });
        score -= 15;
      }

      if (stats.database.errorRate > this.config.alertThresholds.errorRate) {
        alerts.push({
          level: 'error',
          message: `High database error rate: ${(stats.database.errorRate * 100).toFixed(1)}%`
        });
        score -= 25;
      }
    }

    // Verificar red
    if (stats.network.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        level: 'warning',
        message: `Slow network response: ${stats.network.averageResponseTime.toFixed(0)}ms average`
      });
      score -= 15;
    }

    if (stats.network.failedRequests / stats.network.totalRequests > this.config.alertThresholds.errorRate / 100) {
      alerts.push({
        level: 'error',
        message: `High network error rate: ${((stats.network.failedRequests / stats.network.totalRequests) * 100).toFixed(1)}%`
      });
      score -= 20;
    }

    // Verificar servicios
    const unhealthyServices = stats.services.filter(s => s.health === 'unhealthy');
    if (unhealthyServices.length > 0) {
      alerts.push({
        level: 'error',
        message: `${unhealthyServices.length} unhealthy services detected`
      });
      score -= unhealthyServices.length * 10;
    }

    // Generar recomendaciones
    if (stats.memory.heapUsagePercentage > 80) {
      recommendations.push('Consider increasing memory limits or optimizing data structures');
    }

    if (stats.database && stats.database.slowQueries.length > 5) {
      recommendations.push('Review and optimize slow database queries');
    }

    if (stats.network.batchEfficiency < 0.8) {
      recommendations.push('Consider adjusting network batch settings');
    }

    // Determinar salud general
    let health: 'excellent' | 'good' | 'warning' | 'critical';
    if (score >= 90) health = 'excellent';
    else if (score >= 75) health = 'good';
    else if (score >= 50) health = 'warning';
    else health = 'critical';

    return { health, score, recommendations, alerts };
  }

  /**
   * Obtiene el estado de salud de los servicios
   */
  private getServiceHealth(): Array<{
    name: string;
    health: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
    throughput: number;
  }> {
    const services: Array<{
      name: string;
      health: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      errorRate: number;
      throughput: number;
    }> = [];

    // Servicios del sistema
    const systemServices = [
      { name: 'user-service', port: 3001 },
      { name: 'student-service', port: 3002 },
      { name: 'course-service', port: 3003 },
      { name: 'resource-service', port: 3004 },
      { name: 'communication-service', port: 3005 },
      { name: 'analytics-service', port: 3006 },
      { name: 'llm-gateway', port: 3007 },
      { name: 'auth-service', port: 3008 },
      { name: 'notification-service', port: 3009 },
      { name: 'file-service', port: 3010 },
      { name: 'search-service', port: 3011 }
    ];

    for (const service of systemServices) {
      const health = this.serviceHealth.get(service.name) || {
        health: 'healthy',
        lastCheck: Date.now(),
        metrics: { responseTime: 0, errorRate: 0, throughput: 0 }
      };

      services.push({
        name: service.name,
        health: health.health as 'healthy' | 'degraded' | 'unhealthy',
        responseTime: health.metrics.responseTime,
        errorRate: health.metrics.errorRate,
        throughput: health.metrics.throughput
      });
    }

    return services;
  }

  /**
   * Verifica si se necesitan optimizaciones automáticas
   */
  private checkAutomaticOptimizations(stats: SystemPerformanceStats): void {
    // Optimización automática de memoria
    if (stats.memory.heapUsagePercentage > 90) {
      this.emit('autoOptimization', {
        type: 'memory',
        reason: 'Critical memory usage',
        action: 'Forcing garbage collection'
      });
      this.memoryOptimizer.forceGarbageCollection();
    }

    // Optimización automática de base de datos
    if (stats.database && stats.database.slowQueries.length > 10) {
      this.emit('autoOptimization', {
        type: 'database',
        reason: 'Multiple slow queries detected',
        action: 'Suggesting indexes'
      });
      this.databaseOptimizer?.suggestIndexes();
    }

    // Optimización automática de red
    if (stats.network.failedRequests / stats.network.totalRequests > 0.15) {
      this.emit('autoOptimization', {
        type: 'network',
        reason: 'High failure rate',
        action: 'Adjusting circuit breaker settings'
      });
    }
  }

  /**
   * Realiza limpieza de base de datos
   */
  private async performDatabaseCleanup(): Promise<void> {
    try {
      if (this.databaseOptimizer) {
        await this.databaseOptimizer.optimizeSchema();
        this.emit('optimizationCompleted', { type: 'database', action: 'schema_optimization' });
      }
    } catch (error) {
      this.emit('optimizationError', { type: 'database', error });
    }
  }

  /**
   * Realiza limpieza de memoria
   */
  private performMemoryCleanup(): void {
    try {
      this.memoryOptimizer.cleanup();
      this.emit('optimizationCompleted', { type: 'memory', action: 'cleanup' });
    } catch (error) {
      this.emit('optimizationError', { type: 'memory', error });
    }
  }

  /**
   * Realiza limpieza de caché
   */
  private performCacheCleanup(): void {
    try {
      this.performanceOptimizer.cleanup();
      this.emit('optimizationCompleted', { type: 'cache', action: 'cleanup' });
    } catch (error) {
      this.emit('optimizationError', { type: 'cache', error });
    }
  }

  /**
   * Resetea estadísticas
   */
  private resetStats(): void {
    // Implementar reset de estadísticas si es necesario
    this.emit('statsReset');
  }

  /**
   * Registra métricas de un servicio
   */
  registerServiceMetrics(serviceName: string, metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  }): void {
    let health: string = 'healthy';
    
    if (metrics.errorRate > 0.1 || metrics.responseTime > 5000) {
      health = 'unhealthy';
    } else if (metrics.errorRate > 0.05 || metrics.responseTime > 2000) {
      health = 'degraded';
    }

    this.serviceHealth.set(serviceName, {
      health,
      lastCheck: Date.now(),
      metrics
    });
  }

  /**
   * Obtiene estadísticas completas del sistema
   */
  async getSystemStats(): Promise<SystemPerformanceStats> {
    return new Promise((resolve) => {
      const handler = (stats: SystemPerformanceStats) => {
        this.off('systemStats', handler);
        resolve(stats);
      };
      this.on('systemStats', handler);
      this.collectSystemStats();
    });
  }

  /**
   * Ejecuta optimización manual
   */
  async runOptimization(type: 'memory' | 'database' | 'network' | 'cache' | 'all'): Promise<void> {
    try {
      switch (type) {
        case 'memory':
          this.performMemoryCleanup();
          break;
        case 'database':
          await this.performDatabaseCleanup();
          break;
        case 'network':
          this.networkOptimizer.cleanup();
          break;
        case 'cache':
          this.performCacheCleanup();
          break;
        case 'all':
          this.performMemoryCleanup();
          await this.performDatabaseCleanup();
          this.networkOptimizer.cleanup();
          this.performCacheCleanup();
          break;
      }

      this.emit('manualOptimization', { type, success: true });
    } catch (error) {
      this.emit('manualOptimization', { type, success: false, error });
      throw error;
    }
  }

  /**
   * Obtiene recomendaciones de optimización
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    // Recomendaciones basadas en el estado actual
    const memStats = this.memoryOptimizer.getMemoryPerformanceStats();
    if (memStats.heapUsagePercentage > 80) {
      recommendations.push('Memory usage is high. Consider increasing heap size or optimizing data structures.');
    }

    const netStats = this.networkOptimizer.getNetworkPerformanceStats();
    if (netStats.averageResponseTime > 3000) {
      recommendations.push('Network response times are slow. Consider optimizing backend services.');
    }

    if (this.databaseOptimizer) {
      const dbStats = this.databaseOptimizer.getPerformanceStats();
      if (dbStats.slowQueries.length > 5) {
        recommendations.push('Multiple slow database queries detected. Consider adding indexes or optimizing queries.');
      }
    }

    return recommendations;
  }

  /**
   * Detiene el monitoreo y limpia recursos
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Limpiar intervalos de optimización
    for (const [name, interval] of this.optimizationIntervals.entries()) {
      clearInterval(interval);
    }
    this.optimizationIntervals.clear();

    // Limpiar optimizadores
    this.performanceOptimizer.cleanup();
    this.memoryOptimizer.cleanup();
    this.networkOptimizer.cleanup();
    this.databaseOptimizer?.cleanup();

    this.emit('monitoringStopped');
  }
}