interface ServiceInfo {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: number;
  responseTime: number;
  uptime: number;
  version?: string;
  endpoints?: string[];
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  error?: string;
  timestamp: number;
}

export class ServiceDiscovery {
  private services: Map<string, ServiceInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 segundos

  constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices(): void {
    const serviceConfigs = [
      { name: 'users', url: process.env.USER_SERVICE_URL || 'http://localhost:3001' },
      { name: 'students', url: process.env.STUDENT_SERVICE_URL || 'http://localhost:3002' },
      { name: 'courses', url: process.env.COURSE_SERVICE_URL || 'http://localhost:3003' },
      { name: 'resources', url: process.env.RESOURCE_SERVICE_URL || 'http://localhost:3004' },
      { name: 'communications', url: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3005' },
      { name: 'analytics', url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006' },
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3007' },
      { name: 'notifications', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008' },
      { name: 'files', url: process.env.FILE_SERVICE_URL || 'http://localhost:3009' },
      { name: 'search', url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3010' },
      { name: 'llm', url: process.env.LLM_GATEWAY_URL || 'http://localhost:3011' },
      { name: 'ai', url: process.env.AI_SERVICES_URL || 'http://localhost:3012' },
      { name: 'mcp', url: process.env.MCP_ORCHESTRATOR_URL || 'http://localhost:3013' },
      { name: 'mcpServers', url: process.env.MCP_SERVERS_URL || 'http://localhost:3014' }
    ];

    for (const config of serviceConfigs) {
      this.services.set(config.name, {
        name: config.name,
        url: config.url,
        status: 'unknown',
        lastCheck: 0,
        responseTime: 0,
        uptime: 0
      });
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.services.keys()).map(serviceName => 
      this.checkServiceHealth(serviceName)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error during health checks:', error);
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${service.url}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Gateway-Health-Check/1.0'
        },
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const healthData = await response.json();
        
        service.status = 'healthy';
        service.responseTime = responseTime;
        service.lastCheck = Date.now();
        service.uptime = healthData.uptime || 0;
        service.version = healthData.version;
        service.endpoints = healthData.endpoints;
        
        console.log(`✅ ${serviceName} is healthy (${responseTime}ms)`);
      } else {
        service.status = 'unhealthy';
        service.responseTime = responseTime;
        service.lastCheck = Date.now();
        console.log(`❌ ${serviceName} is unhealthy (${response.status})`);
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.responseTime = Date.now() - startTime;
      service.lastCheck = Date.now();
      console.log(`❌ ${serviceName} health check failed: ${error.message}`);
    }
  }

  public async checkAllServices(): Promise<Record<string, ServiceInfo>> {
    // Realizar health checks inmediatos
    await this.performHealthChecks();
    
    // Retornar estado actual
    const result: Record<string, ServiceInfo> = {};
    for (const [name, service] of this.services.entries()) {
      result[name] = { ...service };
    }
    
    return result;
  }

  public getAllServices(): Record<string, ServiceInfo> {
    const result: Record<string, ServiceInfo> = {};
    for (const [name, service] of this.services.entries()) {
      result[name] = { ...service };
    }
    return result;
  }

  public getServiceInfo(serviceName: string): ServiceInfo | null {
    const service = this.services.get(serviceName);
    return service ? { ...service } : null;
  }

  public isServiceHealthy(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service?.status === 'healthy';
  }

  public getHealthyServices(): string[] {
    return Array.from(this.services.entries())
      .filter(([_, service]) => service.status === 'healthy')
      .map(([name, _]) => name);
  }

  public getUnhealthyServices(): string[] {
    return Array.from(this.services.entries())
      .filter(([_, service]) => service.status === 'unhealthy')
      .map(([name, _]) => name);
  }

  public getServiceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [serviceName, service] of this.services.entries()) {
      const lastCheckDate = service.lastCheck > 0 
        ? new Date(service.lastCheck).toISOString() 
        : null;
      
      metrics[serviceName] = {
        status: service.status,
        responseTime: `${service.responseTime}ms`,
        lastCheck: lastCheckDate,
        uptime: service.uptime > 0 ? `${Math.floor(service.uptime / 3600)}h ${Math.floor((service.uptime % 3600) / 60)}m` : 'unknown',
        version: service.version || 'unknown',
        url: service.url
      };
    }
    
    return metrics;
  }

  public addService(name: string, url: string): void {
    this.services.set(name, {
      name,
      url,
      status: 'unknown',
      lastCheck: 0,
      responseTime: 0,
      uptime: 0
    });
  }

  public removeService(name: string): boolean {
    return this.services.delete(name);
  }

  public updateServiceUrl(name: string, url: string): boolean {
    const service = this.services.get(name);
    if (service) {
      service.url = url;
      service.status = 'unknown'; // Reset status for new URL
      service.lastCheck = 0;
      return true;
    }
    return false;
  }

  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  public getHealthCheckStats(): Record<string, any> {
    const totalServices = this.services.size;
    const healthyServices = this.getHealthyServices().length;
    const unhealthyServices = this.getUnhealthyServices().length;
    
    return {
      total: totalServices,
      healthy: healthyServices,
      unhealthy: unhealthyServices,
      healthRate: totalServices > 0 ? `${((healthyServices / totalServices) * 100).toFixed(1)}%` : '0%',
      checkInterval: `${this.checkInterval / 1000}s`
    };
  }
}