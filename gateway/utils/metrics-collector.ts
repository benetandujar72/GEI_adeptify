interface RequestMetric {
  method: string;
  path: string;
  count: number;
  totalResponseTime: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorCount: number;
  successCount: number;
  lastRequest: number;
}

interface ResponseMetric {
  statusCode: number;
  count: number;
  averageResponseTime: number;
  lastOccurrence: number;
}

interface ServiceMetric {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastRequest: number;
  errorRate: number;
}

interface SystemMetric {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  totalRequests: number;
  requestsPerSecond: number;
}

export class MetricsCollector {
  private requestMetrics: Map<string, RequestMetric> = new Map();
  private responseMetrics: Map<number, ResponseMetric> = new Map();
  private serviceMetrics: Map<string, ServiceMetric> = new Map();
  private systemMetrics: SystemMetric = {
    uptime: 0,
    memoryUsage: process.memoryUsage(),
    cpuUsage: 0,
    activeConnections: 0,
    totalRequests: 0,
    requestsPerSecond: 0
  };

  private startTime: number = Date.now();
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private requestTimes: number[] = [];
  private readonly maxRequestTimes = 1000; // Mantener solo los últimos 1000 requests para RPS

  constructor() {
    this.initializeMetrics();
    this.startPeriodicUpdates();
  }

  private initializeMetrics(): void {
    // Inicializar métricas para servicios conocidos
    const services = [
      'users', 'students', 'courses', 'resources', 'communications', 
      'analytics', 'auth', 'notifications', 'files', 'search', 
      'llm', 'ai', 'mcp', 'mcpServers'
    ];

    for (const service of services) {
      this.serviceMetrics.set(service, {
        serviceName: service,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        lastRequest: 0,
        errorRate: 0
      });
    }
  }

  public recordRequest(method: string, path: string): void {
    const key = `${method}:${path}`;
    const now = Date.now();

    // Actualizar métricas de request
    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, {
        method,
        path,
        count: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        errorCount: 0,
        successCount: 0,
        lastRequest: 0
      });
    }

    const metric = this.requestMetrics.get(key)!;
    metric.count++;
    metric.lastRequest = now;

    // Actualizar métricas del sistema
    this.requestCount++;
    this.lastRequestTime = now;
    this.requestTimes.push(now);

    // Mantener solo los últimos requests para calcular RPS
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }

    this.systemMetrics.totalRequests = this.requestCount;
  }

  public recordResponse(method: string, path: string, statusCode: number, responseTime: number): void {
    const key = `${method}:${path}`;
    const now = Date.now();

    // Actualizar métricas de request
    const requestMetric = this.requestMetrics.get(key);
    if (requestMetric) {
      requestMetric.totalResponseTime += responseTime;
      requestMetric.averageResponseTime = requestMetric.totalResponseTime / requestMetric.count;
      requestMetric.minResponseTime = Math.min(requestMetric.minResponseTime, responseTime);
      requestMetric.maxResponseTime = Math.max(requestMetric.maxResponseTime, responseTime);

      if (statusCode >= 400) {
        requestMetric.errorCount++;
      } else {
        requestMetric.successCount++;
      }
    }

    // Actualizar métricas de response
    if (!this.responseMetrics.has(statusCode)) {
      this.responseMetrics.set(statusCode, {
        statusCode,
        count: 0,
        averageResponseTime: 0,
        lastOccurrence: 0
      });
    }

    const responseMetric = this.responseMetrics.get(statusCode)!;
    responseMetric.count++;
    responseMetric.lastOccurrence = now;
    
    // Calcular promedio de tiempo de respuesta para este status code
    const totalTime = responseMetric.averageResponseTime * (responseMetric.count - 1) + responseTime;
    responseMetric.averageResponseTime = totalTime / responseMetric.count;

    // Actualizar métricas del sistema
    this.systemMetrics.uptime = now - this.startTime;
  }

  public recordServiceResponse(serviceName: string, statusCode: number, responseTime: number): void {
    const serviceMetric = this.serviceMetrics.get(serviceName);
    if (!serviceMetric) return;

    const now = Date.now();
    
    serviceMetric.totalRequests++;
    serviceMetric.lastRequest = now;
    serviceMetric.totalResponseTime += responseTime;
    serviceMetric.averageResponseTime = serviceMetric.totalResponseTime / serviceMetric.totalRequests;
    serviceMetric.minResponseTime = Math.min(serviceMetric.minResponseTime, responseTime);
    serviceMetric.maxResponseTime = Math.max(serviceMetric.maxResponseTime, responseTime);

    if (statusCode >= 400) {
      serviceMetric.failedRequests++;
    } else {
      serviceMetric.successfulRequests++;
    }

    serviceMetric.errorRate = (serviceMetric.failedRequests / serviceMetric.totalRequests) * 100;
  }

  public getMetrics(): Record<string, any> {
    this.updateSystemMetrics();

    return {
      timestamp: new Date().toISOString(),
      system: this.systemMetrics,
      requests: this.getRequestMetrics(),
      responses: this.getResponseMetrics(),
      services: this.getServiceMetrics(),
      summary: this.getSummaryMetrics()
    };
  }

  private getRequestMetrics(): Record<string, RequestMetric> {
    const result: Record<string, RequestMetric> = {};
    for (const [key, metric] of this.requestMetrics.entries()) {
      result[key] = { ...metric };
    }
    return result;
  }

  private getResponseMetrics(): Record<string, ResponseMetric> {
    const result: Record<string, ResponseMetric> = {};
    for (const [statusCode, metric] of this.responseMetrics.entries()) {
      result[statusCode.toString()] = { ...metric };
    }
    return result;
  }

  private getServiceMetrics(): Record<string, ServiceMetric> {
    const result: Record<string, ServiceMetric> = {};
    for (const [serviceName, metric] of this.serviceMetrics.entries()) {
      result[serviceName] = { ...metric };
    }
    return result;
  }

  private getSummaryMetrics(): Record<string, any> {
    const totalRequests = this.requestCount;
    const totalResponses = Array.from(this.responseMetrics.values()).reduce((sum, metric) => sum + metric.count, 0);
    const successfulResponses = Array.from(this.responseMetrics.entries())
      .filter(([statusCode]) => parseInt(statusCode) < 400)
      .reduce((sum, [, metric]) => sum + metric.count, 0);
    
    const errorResponses = totalResponses - successfulResponses;
    const successRate = totalResponses > 0 ? (successfulResponses / totalResponses) * 100 : 0;

    const allResponseTimes = Array.from(this.requestMetrics.values())
      .map(metric => metric.averageResponseTime)
      .filter(time => time > 0);

    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
      : 0;

    return {
      totalRequests,
      totalResponses,
      successfulResponses,
      errorResponses,
      successRate: `${successRate.toFixed(2)}%`,
      averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
      requestsPerSecond: this.systemMetrics.requestsPerSecond.toFixed(2),
      uptime: this.formatUptime(this.systemMetrics.uptime)
    };
  }

  private updateSystemMetrics(): void {
    const now = Date.now();
    
    // Actualizar métricas del sistema
    this.systemMetrics.uptime = now - this.startTime;
    this.systemMetrics.memoryUsage = process.memoryUsage();
    
    // Calcular requests por segundo
    if (this.requestTimes.length > 1) {
      const timeWindow = 60 * 1000; // 60 segundos
      const recentRequests = this.requestTimes.filter(time => now - time <= timeWindow);
      this.systemMetrics.requestsPerSecond = recentRequests.length / 60;
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private startPeriodicUpdates(): void {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Actualizar cada 5 segundos
  }

  public getTopRequests(limit: number = 10): RequestMetric[] {
    return Array.from(this.requestMetrics.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  public getSlowestRequests(limit: number = 10): RequestMetric[] {
    return Array.from(this.requestMetrics.values())
      .filter(metric => metric.averageResponseTime > 0)
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }

  public getErrorRequests(limit: number = 10): RequestMetric[] {
    return Array.from(this.requestMetrics.values())
      .filter(metric => metric.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, limit);
  }

  public getServicePerformance(): ServiceMetric[] {
    return Array.from(this.serviceMetrics.values())
      .filter(metric => metric.totalRequests > 0)
      .sort((a, b) => b.totalRequests - a.totalRequests);
  }

  public resetMetrics(): void {
    this.requestMetrics.clear();
    this.responseMetrics.clear();
    this.initializeMetrics();
    this.requestCount = 0;
    this.requestTimes = [];
    this.startTime = Date.now();
  }

  public getMetricsSnapshot(): Record<string, any> {
    this.updateSystemMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSummaryMetrics(),
      topRequests: this.getTopRequests(5),
      slowestRequests: this.getSlowestRequests(5),
      errorRequests: this.getErrorRequests(5),
      servicePerformance: this.getServicePerformance(),
      system: {
        uptime: this.formatUptime(this.systemMetrics.uptime),
        memoryUsage: {
          rss: `${(this.systemMetrics.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(this.systemMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(this.systemMetrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
        },
        requestsPerSecond: this.systemMetrics.requestsPerSecond.toFixed(2)
      }
    };
  }
}