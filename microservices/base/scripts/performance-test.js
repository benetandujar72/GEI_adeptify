#!/usr/bin/env node

const { PerformanceManager } = require('../dist/performance-manager');
const { DatabaseOptimizer } = require('../dist/database-optimizer');
const { MemoryOptimizer } = require('../dist/memory-optimizer');
const { NetworkOptimizer } = require('../dist/network-optimizer');

class PerformanceTestSuite {
  constructor() {
    this.results = {
      memory: {},
      database: {},
      network: {},
      overall: {}
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Iniciando pruebas de rendimiento...\n');

    try {
      await this.testMemoryOptimization();
      await this.testDatabaseOptimization();
      await this.testNetworkOptimization();
      await this.testOverallPerformance();

      this.generateReport();
    } catch (error) {
      console.error('❌ Error durante las pruebas:', error);
      process.exit(1);
    }
  }

  async testMemoryOptimization() {
    console.log('🧠 Probando optimización de memoria...');
    
    const memoryOptimizer = new MemoryOptimizer({
      maxHeapSize: 256,
      gcThreshold: 70,
      memoryCheckInterval: 5000,
      enableGarbageCollection: true,
      enableMemoryMonitoring: true,
      enableLeakDetection: true
    });

    // Simular uso de memoria
    const testData = [];
    for (let i = 0; i < 10000; i++) {
      testData.push({
        id: i,
        name: `Test Object ${i}`,
        data: new Array(100).fill('test data'),
        timestamp: Date.now()
      });
    }

    const startMemory = process.memoryUsage();
    const startTime = Date.now();

    // Simular operaciones intensivas
    for (let i = 0; i < 100; i++) {
      memoryOptimizer.setCache(`test-key-${i}`, testData.slice(0, 1000));
      await this.delay(10);
    }

    const endMemory = process.memoryUsage();
    const endTime = Date.now();

    const stats = memoryOptimizer.getMemoryPerformanceStats();
    
    this.results.memory = {
      duration: endTime - startTime,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapUsagePercentage: stats.heapUsagePercentage,
      cacheSize: stats.cacheSize,
      cacheHitRate: stats.cacheHitRate,
      memoryLeaks: stats.memoryLeaks.length,
      recommendations: stats.recommendations.length,
      alerts: stats.alerts.length
    };

    memoryOptimizer.cleanup();
    console.log('✅ Pruebas de memoria completadas');
  }

  async testDatabaseOptimization() {
    console.log('🗄️  Probando optimización de base de datos...');

    const dbConfig = {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
      maxConnections: 10,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      queryTimeout: 30000,
      enableQueryCache: true,
      enableConnectionPooling: true,
      enableQueryOptimization: true,
      enableIndexing: true,
      enableSlowQueryLogging: true,
      slowQueryThreshold: 100
    };

    const dbOptimizer = new DatabaseOptimizer(dbConfig);

    // Simular queries
    const queries = [
      'SELECT * FROM users WHERE id = ?',
      'SELECT * FROM students WHERE grade = ?',
      'SELECT * FROM courses WHERE status = ?',
      'SELECT * FROM resources WHERE course_id = ?',
      'SELECT COUNT(*) FROM users WHERE created_at > ?'
    ];

    const startTime = Date.now();
    let totalQueries = 0;
    let successfulQueries = 0;

    for (let i = 0; i < 50; i++) {
      try {
        const query = queries[i % queries.length];
        const params = [i, 'A', 'active', i, new Date()];
        
        // Simular query (sin conexión real)
        await this.simulateDatabaseQuery(query, params);
        successfulQueries++;
      } catch (error) {
        console.log(`Query failed: ${error.message}`);
      }
      totalQueries++;
      await this.delay(20);
    }

    const endTime = Date.now();
    const stats = dbOptimizer.getPerformanceStats();

    this.results.database = {
      duration: endTime - startTime,
      totalQueries,
      successfulQueries,
      avgQueryTime: stats.avgQueryTime,
      cacheHitRate: stats.cacheStats.hitRate,
      slowQueries: stats.slowQueries.length,
      errorRate: stats.errorRate,
      connectionPoolSize: stats.connectionPool.isConnected ? 1 : 0
    };

    await dbOptimizer.cleanup();
    console.log('✅ Pruebas de base de datos completadas');
  }

  async testNetworkOptimization() {
    console.log('🌐 Probando optimización de red...');

    const networkOptimizer = new NetworkOptimizer({
      enableConnectionPooling: true,
      enableRequestBatching: true,
      enableResponseCompression: true,
      enableRetryMechanism: true,
      enableCircuitBreaker: true,
      maxConnections: 20,
      connectionTimeout: 5000,
      requestTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 5,
      batchTimeout: 100
    });

    const urls = [
      'https://httpbin.org/get',
      'https://httpbin.org/post',
      'https://httpbin.org/status/200',
      'https://httpbin.org/status/404',
      'https://httpbin.org/delay/1'
    ];

    const startTime = Date.now();
    let totalRequests = 0;
    let successfulRequests = 0;

    // Simular requests en batch
    for (let i = 0; i < 30; i++) {
      try {
        const url = urls[i % urls.length];
        const result = await networkOptimizer.request(url, {
          method: i % 2 === 0 ? 'GET' : 'POST',
          data: i % 2 === 0 ? undefined : { test: i },
          batch: true
        });
        successfulRequests++;
      } catch (error) {
        console.log(`Request failed: ${error.message}`);
      }
      totalRequests++;
      await this.delay(50);
    }

    const endTime = Date.now();
    const stats = networkOptimizer.getNetworkPerformanceStats();

    this.results.network = {
      duration: endTime - startTime,
      totalRequests,
      successfulRequests,
      averageResponseTime: stats.averageResponseTime,
      totalBytesTransferred: stats.totalBytesTransferred,
      connectionPoolSize: stats.connectionPoolSize,
      retryCount: stats.retryCount,
      circuitBreakerTrips: stats.circuitBreakerTrips,
      batchEfficiency: stats.batchEfficiency,
      compressionRatio: stats.compressionRatio
    };

    networkOptimizer.cleanup();
    console.log('✅ Pruebas de red completadas');
  }

  async testOverallPerformance() {
    console.log('📊 Probando rendimiento general del sistema...');

    const performanceManager = new PerformanceManager({
      enablePerformanceOptimization: true,
      enableDatabaseOptimization: true,
      enableMemoryOptimization: true,
      enableNetworkOptimization: true,
      monitoringInterval: 10000,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        responseTime: 5000,
        errorRate: 10,
        databaseQueryTime: 1000
      }
    });

    // Configurar optimizador de base de datos
    const dbConfig = {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
      maxConnections: 10,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      queryTimeout: 30000,
      enableQueryCache: true,
      enableConnectionPooling: true,
      enableQueryOptimization: true,
      enableIndexing: true,
      enableSlowQueryLogging: true,
      slowQueryThreshold: 100
    };

    performanceManager.setDatabaseOptimizer(dbConfig);

    // Simular carga del sistema
    const startTime = Date.now();
    
    // Simular múltiples servicios
    const services = ['user-service', 'student-service', 'course-service', 'resource-service'];
    
    for (let i = 0; i < 20; i++) {
      const service = services[i % services.length];
      const metrics = {
        responseTime: Math.random() * 2000 + 100,
        errorRate: Math.random() * 0.05,
        throughput: Math.random() * 100 + 10
      };
      
      performanceManager.registerServiceMetrics(service, metrics);
      await this.delay(100);
    }

    // Obtener estadísticas del sistema
    const systemStats = await performanceManager.getSystemStats();
    const endTime = Date.now();

    this.results.overall = {
      duration: endTime - startTime,
      overallHealth: systemStats.overall.health,
      overallScore: systemStats.overall.score,
      recommendations: systemStats.overall.recommendations.length,
      alerts: systemStats.overall.alerts.length,
      services: systemStats.services.length,
      healthyServices: systemStats.services.filter(s => s.health === 'healthy').length,
      degradedServices: systemStats.services.filter(s => s.health === 'degraded').length,
      unhealthyServices: systemStats.services.filter(s => s.health === 'unhealthy').length
    };

    performanceManager.stop();
    console.log('✅ Pruebas generales completadas');
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n📋 REPORTE DE RENDIMIENTO');
    console.log('=' .repeat(50));
    console.log(`⏱️  Duración total: ${totalDuration}ms`);
    console.log(`📅 Fecha: ${new Date().toISOString()}\n`);

    // Memoria
    console.log('🧠 OPTIMIZACIÓN DE MEMORIA');
    console.log('-'.repeat(30));
    console.log(`Duración: ${this.results.memory.duration}ms`);
    console.log(`Uso de heap: ${(this.results.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Porcentaje de uso: ${this.results.memory.heapUsagePercentage.toFixed(1)}%`);
    console.log(`Tamaño de caché: ${(this.results.memory.cacheSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Tasa de aciertos: ${(this.results.memory.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Memory leaks: ${this.results.memory.memoryLeaks}`);
    console.log(`Recomendaciones: ${this.results.memory.recommendations}`);
    console.log(`Alertas: ${this.results.memory.alerts}\n`);

    // Base de datos
    console.log('🗄️  OPTIMIZACIÓN DE BASE DE DATOS');
    console.log('-'.repeat(30));
    console.log(`Duración: ${this.results.database.duration}ms`);
    console.log(`Queries totales: ${this.results.database.totalQueries}`);
    console.log(`Queries exitosas: ${this.results.database.successfulQueries}`);
    console.log(`Tiempo promedio: ${this.results.database.avgQueryTime.toFixed(0)}ms`);
    console.log(`Tasa de aciertos: ${(this.results.database.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Queries lentas: ${this.results.database.slowQueries}`);
    console.log(`Tasa de errores: ${(this.results.database.errorRate * 100).toFixed(1)}%`);
    console.log(`Pool de conexiones: ${this.results.database.connectionPoolSize}\n`);

    // Red
    console.log('🌐 OPTIMIZACIÓN DE RED');
    console.log('-'.repeat(30));
    console.log(`Duración: ${this.results.network.duration}ms`);
    console.log(`Requests totales: ${this.results.network.totalRequests}`);
    console.log(`Requests exitosos: ${this.results.network.successfulRequests}`);
    console.log(`Tiempo promedio: ${this.results.network.averageResponseTime.toFixed(0)}ms`);
    console.log(`Bytes transferidos: ${(this.results.network.totalBytesTransferred / 1024).toFixed(2)}KB`);
    console.log(`Pool de conexiones: ${this.results.network.connectionPoolSize}`);
    console.log(`Reintentos: ${this.results.network.retryCount}`);
    console.log(`Circuit breaker trips: ${this.results.network.circuitBreakerTrips}`);
    console.log(`Eficiencia de batch: ${(this.results.network.batchEfficiency * 100).toFixed(1)}%`);
    console.log(`Ratio de compresión: ${(this.results.network.compressionRatio * 100).toFixed(1)}%\n`);

    // General
    console.log('📊 RENDIMIENTO GENERAL');
    console.log('-'.repeat(30));
    console.log(`Duración: ${this.results.overall.duration}ms`);
    console.log(`Salud general: ${this.results.overall.overallHealth}`);
    console.log(`Puntuación: ${this.results.overall.overallScore}/100`);
    console.log(`Recomendaciones: ${this.results.overall.recommendations}`);
    console.log(`Alertas: ${this.results.overall.alerts}`);
    console.log(`Servicios totales: ${this.results.overall.services}`);
    console.log(`Servicios saludables: ${this.results.overall.healthyServices}`);
    console.log(`Servicios degradados: ${this.results.overall.degradedServices}`);
    console.log(`Servicios no saludables: ${this.results.overall.unhealthyServices}\n`);

    // Resumen
    console.log('🎯 RESUMEN');
    console.log('-'.repeat(30));
    
    const memoryScore = this.calculateMemoryScore();
    const databaseScore = this.calculateDatabaseScore();
    const networkScore = this.calculateNetworkScore();
    const overallScore = this.results.overall.overallScore;

    console.log(`Memoria: ${memoryScore}/100`);
    console.log(`Base de datos: ${databaseScore}/100`);
    console.log(`Red: ${networkScore}/100`);
    console.log(`General: ${overallScore}/100`);
    
    const averageScore = (memoryScore + databaseScore + networkScore + overallScore) / 4;
    console.log(`Promedio: ${averageScore.toFixed(1)}/100`);

    if (averageScore >= 90) {
      console.log('🏆 Excelente rendimiento!');
    } else if (averageScore >= 75) {
      console.log('✅ Buen rendimiento');
    } else if (averageScore >= 60) {
      console.log('⚠️  Rendimiento aceptable');
    } else {
      console.log('❌ Rendimiento deficiente - se requieren optimizaciones');
    }

    console.log('\n' + '='.repeat(50));
  }

  calculateMemoryScore() {
    const memory = this.results.memory;
    let score = 100;

    if (memory.heapUsagePercentage > 90) score -= 30;
    else if (memory.heapUsagePercentage > 80) score -= 20;
    else if (memory.heapUsagePercentage > 70) score -= 10;

    if (memory.memoryLeaks > 5) score -= 20;
    else if (memory.memoryLeaks > 2) score -= 10;

    if (memory.cacheHitRate < 0.7) score -= 15;
    else if (memory.cacheHitRate < 0.8) score -= 10;

    return Math.max(0, score);
  }

  calculateDatabaseScore() {
    const db = this.results.database;
    let score = 100;

    const successRate = db.successfulQueries / db.totalQueries;
    if (successRate < 0.9) score -= 25;
    else if (successRate < 0.95) score -= 15;

    if (db.avgQueryTime > 1000) score -= 20;
    else if (db.avgQueryTime > 500) score -= 10;

    if (db.errorRate > 0.1) score -= 20;
    else if (db.errorRate > 0.05) score -= 10;

    if (db.slowQueries > 10) score -= 15;
    else if (db.slowQueries > 5) score -= 10;

    return Math.max(0, score);
  }

  calculateNetworkScore() {
    const network = this.results.network;
    let score = 100;

    const successRate = network.successfulRequests / network.totalRequests;
    if (successRate < 0.9) score -= 25;
    else if (successRate < 0.95) score -= 15;

    if (network.averageResponseTime > 3000) score -= 20;
    else if (network.averageResponseTime > 1500) score -= 10;

    if (network.circuitBreakerTrips > 5) score -= 20;
    else if (network.circuitBreakerTrips > 2) score -= 10;

    if (network.batchEfficiency < 0.8) score -= 15;
    else if (network.batchEfficiency < 0.9) score -= 10;

    return Math.max(0, score);
  }

  async simulateDatabaseQuery(query, params) {
    // Simular tiempo de query
    const queryTime = Math.random() * 500 + 50;
    await this.delay(queryTime);
    
    // Simular errores ocasionales
    if (Math.random() < 0.05) {
      throw new Error('Database connection error');
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Ejecutar pruebas
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = PerformanceTestSuite;