import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface NetworkConfig {
  enableConnectionPooling: boolean;
  enableRequestBatching: boolean;
  enableResponseCompression: boolean;
  enableRetryMechanism: boolean;
  enableCircuitBreaker: boolean;
  enableLoadBalancing: boolean;
  maxConnections: number;
  connectionTimeout: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
  batchTimeout: number;
  compressionThreshold: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface NetworkStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalBytesTransferred: number;
  activeConnections: number;
  connectionPoolSize: number;
  retryCount: number;
  circuitBreakerTrips: number;
  batchEfficiency: number;
  compressionRatio: number;
}

export interface RequestBatch {
  id: string;
  requests: Array<{ id: string; url: string; method: string; data?: any; resolve: Function; reject: Function }>;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  threshold: number;
  timeout: number;
}

export class NetworkOptimizer extends EventEmitter {
  private config: NetworkConfig;
  private stats: NetworkStats;
  private connectionPool: Map<string, http.Agent | https.Agent> = new Map();
  private requestBatches: Map<string, RequestBatch> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private pendingRequests: Map<string, { startTime: number; retries: number }> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<NetworkConfig> = {}) {
    super();
    this.config = {
      enableConnectionPooling: true,
      enableRequestBatching: true,
      enableResponseCompression: true,
      enableRetryMechanism: true,
      enableCircuitBreaker: true,
      enableLoadBalancing: true,
      maxConnections: 100,
      connectionTimeout: 5000,
      requestTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 10,
      batchTimeout: 100,
      compressionThreshold: 1024,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      ...config
    };

    this.stats = this.initializeStats();
    this.startBatchProcessor();
  }

  /**
   * Inicializa estadísticas
   */
  private initializeStats(): NetworkStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalBytesTransferred: 0,
      activeConnections: 0,
      connectionPoolSize: 0,
      retryCount: 0,
      circuitBreakerTrips: 0,
      batchEfficiency: 0,
      compressionRatio: 0
    };
  }

  /**
   * Realiza una request HTTP optimizada
   */
  async request(url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    data?: any;
    timeout?: number;
    retry?: boolean;
    batch?: boolean;
  } = {}): Promise<any> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    try {
      // Verificar circuit breaker
      if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen(url)) {
        throw new Error('Circuit breaker is open');
      }

      // Agregar a batch si está habilitado
      if (this.config.enableRequestBatching && options.batch !== false) {
        return await this.addToBatch(url, options, requestId);
      }

      // Realizar request individual
      const result = await this.performRequest(url, options, requestId);
      
      // Actualizar estadísticas
      this.updateStats(startTime, true, result.responseSize || 0);
      
      return result;

    } catch (error) {
      // Manejar reintentos
      if (this.config.enableRetryMechanism && options.retry !== false) {
        return await this.retryRequest(url, options, requestId, startTime);
      }

      // Actualizar estadísticas de error
      this.updateStats(startTime, false, 0);
      this.recordCircuitBreakerFailure(url);
      
      throw error;
    }
  }

  /**
   * Agrega una request a un batch
   */
  private async addToBatch(url: string, options: any, requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(url);
      let batch = this.requestBatches.get(batchKey);

      if (!batch) {
        batch = {
          id: batchKey,
          requests: [],
          timestamp: Date.now(),
          timeout: setTimeout(() => this.processBatch(batchKey), this.config.batchTimeout)
        };
        this.requestBatches.set(batchKey, batch);
      }

      batch.requests.push({
        id: requestId,
        url,
        method: options.method || 'GET',
        data: options.data,
        resolve,
        reject
      });

      // Procesar batch si está lleno
      if (batch.requests.length >= this.config.batchSize) {
        this.processBatch(batchKey);
      }
    });
  }

  /**
   * Procesa un batch de requests
   */
  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.requestBatches.get(batchKey);
    if (!batch) return;

    // Limpiar timeout
    clearTimeout(batch.timeout);
    this.requestBatches.delete(batchKey);

    // Procesar requests en paralelo
    const promises = batch.requests.map(req => 
      this.performRequest(req.url, {
        method: req.method,
        data: req.data
      }, req.id)
    );

    try {
      const results = await Promise.allSettled(promises);
      
      // Resolver/rechazar cada request individual
      results.forEach((result, index) => {
        const req = batch.requests[index];
        if (result.status === 'fulfilled') {
          req.resolve(result.value);
        } else {
          req.reject(result.reason);
        }
      });

      this.updateBatchEfficiency(batch.requests.length, results.length);

    } catch (error) {
      // Rechazar todas las requests en caso de error
      batch.requests.forEach(req => req.reject(error));
    }
  }

  /**
   * Realiza una request HTTP individual
   */
  private async performRequest(url: string, options: any, requestId: string): Promise<any> {
    const urlObj = new URL(url);
    const agent = this.getConnectionAgent(urlObj);
    
    const requestOptions: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NetworkOptimizer/1.0',
        'X-Request-ID': requestId,
        ...options.headers
      },
      timeout: options.timeout || this.config.requestTimeout,
      agent
    };

    // Agregar compresión si está habilitada
    if (this.config.enableResponseCompression) {
      requestOptions.headers['Accept-Encoding'] = 'gzip, deflate, br';
    }

    return new Promise((resolve, reject) => {
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request(requestOptions, (res) => {
        let data = '';
        let responseSize = 0;

        res.on('data', (chunk) => {
          data += chunk;
          responseSize += chunk.length;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedData,
              responseSize
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data,
              responseSize
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Enviar datos si existen
      if (options.data) {
        const jsonData = JSON.stringify(options.data);
        req.setHeader('Content-Length', Buffer.byteLength(jsonData));
        req.write(jsonData);
      }

      req.end();
    });
  }

  /**
   * Reintenta una request fallida
   */
  private async retryRequest(url: string, options: any, requestId: string, startTime: number): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Esperar antes del reintento
        if (attempt > 1) {
          await this.delay(this.config.retryDelay * attempt);
        }

        const result = await this.performRequest(url, options, requestId);
        this.stats.retryCount += attempt - 1;
        this.updateStats(startTime, true, result.responseSize || 0);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        
        // No reintentar en ciertos errores
        if (this.isNonRetryableError(error)) {
          break;
        }
      }
    }

    this.updateStats(startTime, false, 0);
    this.recordCircuitBreakerFailure(url);
    throw lastError!;
  }

  /**
   * Obtiene el agente de conexión para una URL
   */
  private getConnectionAgent(url: URL): http.Agent | https.Agent {
    const key = `${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'https:' ? 443 : 80)}`;
    
    if (!this.connectionPool.has(key)) {
      const agentOptions = {
        keepAlive: true,
        maxSockets: this.config.maxConnections,
        timeout: this.config.connectionTimeout
      };

      const agent = url.protocol === 'https:' 
        ? new https.Agent(agentOptions)
        : new http.Agent(agentOptions);

      this.connectionPool.set(key, agent);
      this.stats.connectionPoolSize = this.connectionPool.size;
    }

    return this.connectionPool.get(key)!;
  }

  /**
   * Verifica si el circuit breaker está abierto
   */
  private isCircuitBreakerOpen(url: string): boolean {
    const key = this.getCircuitBreakerKey(url);
    const circuitBreaker = this.circuitBreakers.get(key);

    if (!circuitBreaker) return false;

    if (circuitBreaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure > circuitBreaker.timeout) {
        circuitBreaker.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Registra un fallo en el circuit breaker
   */
  private recordCircuitBreakerFailure(url: string): void {
    const key = this.getCircuitBreakerKey(url);
    let circuitBreaker = this.circuitBreakers.get(key);

    if (!circuitBreaker) {
      circuitBreaker = {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        threshold: this.config.circuitBreakerThreshold,
        timeout: this.config.circuitBreakerTimeout
      };
      this.circuitBreakers.set(key, circuitBreaker);
    }

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();

    if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
      circuitBreaker.state = 'OPEN';
      this.stats.circuitBreakerTrips++;
      this.emit('circuitBreakerOpened', { url, key, failureCount: circuitBreaker.failureCount });
    }
  }

  /**
   * Registra un éxito en el circuit breaker
   */
  private recordCircuitBreakerSuccess(url: string): void {
    const key = this.getCircuitBreakerKey(url);
    const circuitBreaker = this.circuitBreakers.get(key);

    if (circuitBreaker) {
      circuitBreaker.successCount++;
      circuitBreaker.failureCount = 0;

      if (circuitBreaker.state === 'HALF_OPEN' && circuitBreaker.successCount >= 2) {
        circuitBreaker.state = 'CLOSED';
        this.emit('circuitBreakerClosed', { url, key });
      }
    }
  }

  /**
   * Obtiene la clave del circuit breaker
   */
  private getCircuitBreakerKey(url: string): string {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  }

  /**
   * Obtiene la clave del batch
   */
  private getBatchKey(url: string): string {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)}`;
  }

  /**
   * Actualiza estadísticas
   */
  private updateStats(startTime: number, success: boolean, responseSize: number): void {
    const duration = performance.now() - startTime;
    
    this.stats.totalRequests++;
    this.stats.totalBytesTransferred += responseSize;

    if (success) {
      this.stats.successfulRequests++;
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + duration) / this.stats.successfulRequests;
    } else {
      this.stats.failedRequests++;
    }
  }

  /**
   * Actualiza eficiencia del batch
   */
  private updateBatchEfficiency(totalRequests: number, successfulRequests: number): void {
    this.stats.batchEfficiency = successfulRequests / totalRequests;
  }

  /**
   * Verifica si un error no es reintentable
   */
  private isNonRetryableError(error: any): boolean {
    // Errores de autenticación, autorización, etc.
    return error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inicia el procesador de batches
   */
  private startBatchProcessor(): void {
    this.batchTimeout = setInterval(() => {
      // Procesar batches expirados
      const now = Date.now();
      for (const [key, batch] of this.requestBatches.entries()) {
        if (now - batch.timestamp > this.config.batchTimeout) {
          this.processBatch(key);
        }
      }
    }, this.config.batchTimeout);
  }

  /**
   * Obtiene estadísticas de rendimiento de red
   */
  getNetworkPerformanceStats(): any {
    return {
      ...this.stats,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([key, cb]) => ({
        key,
        state: cb.state,
        failureCount: cb.failureCount,
        successCount: cb.successCount
      })),
      activeBatches: this.requestBatches.size,
      connectionPools: Array.from(this.connectionPool.entries()).map(([key, agent]) => ({
        key,
        maxSockets: agent.maxSockets,
        sockets: (agent as any).sockets ? Object.keys((agent as any).sockets).length : 0
      })),
      recommendations: this.generateRecommendations(),
      alerts: this.generateAlerts()
    };
  }

  /**
   * Genera recomendaciones de optimización
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.stats.failedRequests / this.stats.totalRequests > 0.1) {
      recommendations.push('High failure rate detected. Consider increasing retry attempts or circuit breaker threshold.');
    }

    if (this.stats.averageResponseTime > 5000) {
      recommendations.push('High average response time. Consider optimizing backend services or increasing timeouts.');
    }

    if (this.stats.batchEfficiency < 0.8) {
      recommendations.push('Low batch efficiency. Consider adjusting batch size or timeout.');
    }

    return recommendations;
  }

  /**
   * Genera alertas de red
   */
  private generateAlerts(): Array<{ level: 'warning' | 'error'; message: string }> {
    const alerts: Array<{ level: 'warning' | 'error'; message: string }> = [];

    const errorRate = this.stats.failedRequests / this.stats.totalRequests;
    if (errorRate > 0.2) {
      alerts.push({
        level: 'error',
        message: `Critical error rate: ${(errorRate * 100).toFixed(1)}%`
      });
    } else if (errorRate > 0.1) {
      alerts.push({
        level: 'warning',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`
      });
    }

    if (this.stats.circuitBreakerTrips > 5) {
      alerts.push({
        level: 'error',
        message: `Multiple circuit breaker trips: ${this.stats.circuitBreakerTrips}`
      });
    }

    return alerts;
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    if (this.batchTimeout) {
      clearInterval(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Procesar batches pendientes
    for (const [key, batch] of this.requestBatches.entries()) {
      clearTimeout(batch.timeout);
      batch.requests.forEach(req => req.reject(new Error('Network optimizer shutdown')));
    }
    this.requestBatches.clear();

    // Cerrar conexiones
    for (const [key, agent] of this.connectionPool.entries()) {
      agent.destroy();
    }
    this.connectionPool.clear();

    this.emit('cleanupCompleted');
  }
}