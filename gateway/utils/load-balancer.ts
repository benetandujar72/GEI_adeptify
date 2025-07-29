interface ServiceInstance {
  id: string;
  url: string;
  weight: number;
  activeConnections: number;
  responseTime: number;
  lastResponseTime: number;
  healthScore: number;
  isHealthy: boolean;
}

interface LoadBalancerStats {
  totalRequests: number;
  activeConnections: number;
  averageResponseTime: number;
  healthScore: number;
}

type LoadBalancingAlgorithm = 'round-robin' | 'least-connections' | 'weighted-round-robin' | 'response-time' | 'health-score';

export class LoadBalancer {
  private instances: Map<string, ServiceInstance[]> = new Map();
  private currentIndex: Map<string, number> = new Map();
  private stats: Map<string, LoadBalancerStats> = new Map();

  constructor() {
    this.initializeServices();
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
      this.addServiceInstance(config.name, config.url);
      this.currentIndex.set(config.name, 0);
      this.stats.set(config.name, {
        totalRequests: 0,
        activeConnections: 0,
        averageResponseTime: 0,
        healthScore: 100
      });
    }
  }

  public addServiceInstance(serviceName: string, url: string, weight: number = 1): void {
    if (!this.instances.has(serviceName)) {
      this.instances.set(serviceName, []);
    }

    const instance: ServiceInstance = {
      id: `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      weight,
      activeConnections: 0,
      responseTime: 0,
      lastResponseTime: 0,
      healthScore: 100,
      isHealthy: true
    };

    this.instances.get(serviceName)!.push(instance);
  }

  public select(serviceName: string, defaultUrl: string, algorithm: LoadBalancingAlgorithm = 'round-robin'): string {
    const instances = this.instances.get(serviceName);
    
    if (!instances || instances.length === 0) {
      return defaultUrl;
    }

    // Filtrar solo instancias saludables
    const healthyInstances = instances.filter(instance => instance.isHealthy);
    
    if (healthyInstances.length === 0) {
      return defaultUrl;
    }

    let selectedInstance: ServiceInstance;

    switch (algorithm) {
      case 'round-robin':
        selectedInstance = this.roundRobin(serviceName, healthyInstances);
        break;
      
      case 'least-connections':
        selectedInstance = this.leastConnections(healthyInstances);
        break;
      
      case 'weighted-round-robin':
        selectedInstance = this.weightedRoundRobin(serviceName, healthyInstances);
        break;
      
      case 'response-time':
        selectedInstance = this.responseTime(healthyInstances);
        break;
      
      case 'health-score':
        selectedInstance = this.healthScore(healthyInstances);
        break;
      
      default:
        selectedInstance = this.roundRobin(serviceName, healthyInstances);
    }

    // Incrementar conexiones activas
    selectedInstance.activeConnections++;
    
    // Actualizar estadísticas
    this.updateStats(serviceName, selectedInstance);

    return selectedInstance.url;
  }

  private roundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const currentIndex = this.currentIndex.get(serviceName) || 0;
    const selectedInstance = instances[currentIndex % instances.length];
    
    this.currentIndex.set(serviceName, (currentIndex + 1) % instances.length);
    
    return selectedInstance;
  }

  private leastConnections(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, current) => 
      current.activeConnections < min.activeConnections ? current : min
    );
  }

  private weightedRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const currentIndex = this.currentIndex.get(serviceName) || 0;
    
    // Calcular peso total
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    
    // Encontrar la instancia basada en peso
    let weightSum = 0;
    for (let i = 0; i < instances.length; i++) {
      weightSum += instances[i].weight;
      if (currentIndex < weightSum) {
        this.currentIndex.set(serviceName, (currentIndex + 1) % totalWeight);
        return instances[i];
      }
    }
    
    // Fallback
    this.currentIndex.set(serviceName, (currentIndex + 1) % totalWeight);
    return instances[0];
  }

  private responseTime(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, current) => 
      current.responseTime < min.responseTime ? current : min
    );
  }

  private healthScore(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((max, current) => 
      current.healthScore > max.healthScore ? current : max
    );
  }

  public recordResponse(serviceName: string, statusCode: number, responseTime: number): void {
    const instances = this.instances.get(serviceName);
    if (!instances || instances.length === 0) return;

    // Encontrar la instancia que procesó la respuesta (simplificado)
    const instance = instances[0]; // En un caso real, necesitarías tracking por request
    
    // Actualizar métricas de la instancia
    instance.lastResponseTime = responseTime;
    instance.responseTime = this.calculateAverageResponseTime(instance.responseTime, responseTime);
    instance.activeConnections = Math.max(0, instance.activeConnections - 1);
    
    // Actualizar health score basado en el status code
    if (statusCode >= 500) {
      instance.healthScore = Math.max(0, instance.healthScore - 10);
    } else if (statusCode >= 400) {
      instance.healthScore = Math.max(0, instance.healthScore - 5);
    } else {
      instance.healthScore = Math.min(100, instance.healthScore + 2);
    }
    
    // Marcar como no saludable si el health score es muy bajo
    instance.isHealthy = instance.healthScore > 20;
    
    // Actualizar estadísticas del servicio
    this.updateServiceStats(serviceName);
  }

  private calculateAverageResponseTime(currentAvg: number, newResponseTime: number): number {
    const alpha = 0.1; // Factor de suavizado
    return currentAvg * (1 - alpha) + newResponseTime * alpha;
  }

  private updateStats(serviceName: string, instance: ServiceInstance): void {
    const stats = this.stats.get(serviceName);
    if (stats) {
      stats.totalRequests++;
      stats.activeConnections = Math.max(stats.activeConnections, instance.activeConnections);
    }
  }

  private updateServiceStats(serviceName: string): void {
    const instances = this.instances.get(serviceName);
    const stats = this.stats.get(serviceName);
    
    if (!instances || !stats) return;

    const healthyInstances = instances.filter(instance => instance.isHealthy);
    
    if (healthyInstances.length > 0) {
      const avgResponseTime = healthyInstances.reduce((sum, instance) => 
        sum + instance.responseTime, 0) / healthyInstances.length;
      
      const avgHealthScore = healthyInstances.reduce((sum, instance) => 
        sum + instance.healthScore, 0) / healthyInstances.length;
      
      stats.averageResponseTime = avgResponseTime;
      stats.healthScore = avgHealthScore;
      stats.activeConnections = healthyInstances.reduce((sum, instance) => 
        sum + instance.activeConnections, 0);
    }
  }

  public getServiceInstances(serviceName: string): ServiceInstance[] {
    return this.instances.get(serviceName)?.map(instance => ({ ...instance })) || [];
  }

  public getServiceStats(serviceName: string): LoadBalancerStats | null {
    const stats = this.stats.get(serviceName);
    return stats ? { ...stats } : null;
  }

  public getAllStats(): Record<string, LoadBalancerStats> {
    const result: Record<string, LoadBalancerStats> = {};
    for (const [serviceName, stats] of this.stats.entries()) {
      result[serviceName] = { ...stats };
    }
    return result;
  }

  public removeInstance(serviceName: string, instanceId: string): boolean {
    const instances = this.instances.get(serviceName);
    if (!instances) return false;

    const initialLength = instances.length;
    const filteredInstances = instances.filter(instance => instance.id !== instanceId);
    
    if (filteredInstances.length !== initialLength) {
      this.instances.set(serviceName, filteredInstances);
      this.updateServiceStats(serviceName);
      return true;
    }
    
    return false;
  }

  public updateInstanceHealth(serviceName: string, instanceId: string, isHealthy: boolean): void {
    const instances = this.instances.get(serviceName);
    if (!instances) return;

    const instance = instances.find(inst => inst.id === instanceId);
    if (instance) {
      instance.isHealthy = isHealthy;
      if (!isHealthy) {
        instance.healthScore = Math.max(0, instance.healthScore - 20);
      }
      this.updateServiceStats(serviceName);
    }
  }

  public getLoadBalancingMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [serviceName, instances] of this.instances.entries()) {
      const healthyInstances = instances.filter(instance => instance.isHealthy);
      const totalInstances = instances.length;
      
      metrics[serviceName] = {
        totalInstances,
        healthyInstances: healthyInstances.length,
        healthRate: totalInstances > 0 ? `${((healthyInstances.length / totalInstances) * 100).toFixed(1)}%` : '0%',
        totalActiveConnections: instances.reduce((sum, instance) => sum + instance.activeConnections, 0),
        averageResponseTime: healthyInstances.length > 0 
          ? `${(healthyInstances.reduce((sum, instance) => sum + instance.responseTime, 0) / healthyInstances.length).toFixed(2)}ms`
          : 'N/A',
        averageHealthScore: healthyInstances.length > 0
          ? `${(healthyInstances.reduce((sum, instance) => sum + instance.healthScore, 0) / healthyInstances.length).toFixed(1)}`
          : 'N/A'
      };
    }
    
    return metrics;
  }
}