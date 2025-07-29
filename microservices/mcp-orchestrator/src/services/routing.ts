import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
  ServiceRegistration, 
  RoutingRequest, 
  RoutingResponse, 
  ServiceStatus, 
  CircuitBreakerState,
  RoutingStrategy,
  MCPError
} from '../types/mcp';
import { logRouting, logLoadBalancer, logError } from '../utils/logger';

export class RoutingService {
  private services: Map<string, ServiceRegistration[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private loadBalancers: Map<string, LoadBalancer> = new Map();
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Orchestrator/1.0.0'
      }
    });

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        logRouting(response.config.data, response.data, Date.now() - response.config.metadata?.startTime);
        return response;
      },
      (error) => {
        logError(error, { 
          url: error.config?.url, 
          method: error.config?.method,
          service: error.config?.metadata?.service 
        });
        return Promise.reject(error);
      }
    );

    // Add request interceptor for timing
    this.httpClient.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() };
      return config;
    });
  }

  // Service Registration
  async registerService(registration: Omit<ServiceRegistration, 'status' | 'lastHealthCheck' | 'responseTime' | 'errorCount' | 'circuitBreakerState'>): Promise<void> {
    const serviceRegistration: ServiceRegistration = {
      ...registration,
      status: ServiceStatus.ACTIVE,
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
      circuitBreakerState: CircuitBreakerState.CLOSED
    };

    const serviceName = registration.name;
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, []);
    }

    this.services.get(serviceName)!.push(serviceRegistration);

    // Initialize circuit breaker and load balancer for this service
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker());
    }

    if (!this.loadBalancers.has(serviceName)) {
      this.loadBalancers.set(serviceName, new LoadBalancer());
    }

    // Perform initial health check
    await this.performHealthCheck(serviceRegistration);
  }

  // Service Discovery
  async discoverServices(): Promise<Map<string, ServiceRegistration[]>> {
    // In a real implementation, this would query a service registry
    // For now, return the current services
    return new Map(this.services);
  }

  // Main Routing Method
  async routeRequest(request: RoutingRequest): Promise<RoutingResponse> {
    const startTime = Date.now();
    const serviceName = request.service;

    try {
      // Get available services
      const availableServices = this.services.get(serviceName);
      if (!availableServices || availableServices.length === 0) {
        throw new Error(`No services available for: ${serviceName}`);
      }

      // Get healthy services
      const healthyServices = availableServices.filter(service => 
        service.status === ServiceStatus.ACTIVE && 
        service.circuitBreakerState !== CircuitBreakerState.OPEN
      );

      if (healthyServices.length === 0) {
        throw new Error(`No healthy services available for: ${serviceName}`);
      }

      // Get load balancer for this service
      const loadBalancer = this.loadBalancers.get(serviceName);
      if (!loadBalancer) {
        throw new Error(`Load balancer not found for service: ${serviceName}`);
      }

      // Select service using load balancer
      const selectedService = loadBalancer.selectService(healthyServices);
      logLoadBalancer(loadBalancer.getStrategy(), serviceName, selectedService.url);

      // Get circuit breaker
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      if (!circuitBreaker) {
        throw new Error(`Circuit breaker not found for service: ${serviceName}`);
      }

      // Execute request through circuit breaker
      const response = await circuitBreaker.execute(async () => {
        return this.executeRequest(selectedService, request);
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        serviceUrl: selectedService.url,
        response: response.data,
        responseTime,
        contextId: request.context
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        serviceUrl: '',
        response: null,
        responseTime,
        contextId: request.context,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Execute HTTP Request
  private async executeRequest(service: ServiceRegistration, request: RoutingRequest): Promise<AxiosResponse> {
    const url = `${service.url}/api/${request.action}`;
    
    const config = {
      metadata: { service: service.name }
    };

    return this.httpClient.post(url, request.data, config);
  }

  // Health Check
  async performHealthCheck(service: ServiceRegistration): Promise<void> {
    try {
      const startTime = Date.now();
      const healthUrl = service.healthCheckUrl || `${service.url}/api/health`;
      
      const response = await this.httpClient.get(healthUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      // Update service status
      service.status = ServiceStatus.ACTIVE;
      service.lastHealthCheck = new Date();
      service.responseTime = responseTime;
      service.errorCount = 0;

      // Update circuit breaker
      const circuitBreaker = this.circuitBreakers.get(service.name);
      if (circuitBreaker) {
        circuitBreaker.recordSuccess();
      }

    } catch (error) {
      // Update service status
      service.status = ServiceStatus.ERROR;
      service.lastHealthCheck = new Date();
      service.errorCount++;

      // Update circuit breaker
      const circuitBreaker = this.circuitBreakers.get(service.name);
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }
    }
  }

  // Batch Health Checks
  async performBatchHealthChecks(): Promise<void> {
    const promises = Array.from(this.services.values())
      .flat()
      .map(service => this.performHealthCheck(service));

    await Promise.allSettled(promises);
  }

  // Get Service Status
  getServiceStatus(serviceName: string): ServiceRegistration[] | undefined {
    return this.services.get(serviceName);
  }

  // Get All Services
  getAllServices(): Map<string, ServiceRegistration[]> {
    return new Map(this.services);
  }

  // Remove Service
  removeService(serviceName: string, serviceUrl: string): boolean {
    const services = this.services.get(serviceName);
    if (!services) return false;

    const initialLength = services.length;
    const filteredServices = services.filter(service => service.url !== serviceUrl);
    
    if (filteredServices.length !== initialLength) {
      this.services.set(serviceName, filteredServices);
      return true;
    }

    return false;
  }

  // Update Load Balancer Strategy
  updateLoadBalancerStrategy(serviceName: string, strategy: RoutingStrategy, weights?: Record<string, number>): void {
    const loadBalancer = this.loadBalancers.get(serviceName);
    if (loadBalancer) {
      loadBalancer.updateStrategy(strategy, weights);
    }
  }

  // Get Circuit Breaker Status
  getCircuitBreakerStatus(serviceName: string): CircuitBreakerState | undefined {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    return circuitBreaker?.getState();
  }

  // Reset Circuit Breaker
  resetCircuitBreaker(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly recoveryTimeout: number = 60000; // 1 minute
  private readonly halfOpenMaxRequests: number = 3;
  private halfOpenRequestCount: number = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenRequestCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.halfOpenRequestCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
    } else if (this.state === CircuitBreakerState.CLOSED && this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.recoveryTimeout;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.halfOpenRequestCount = 0;
    this.lastFailureTime = 0;
  }
}

// Load Balancer Implementation
class LoadBalancer {
  private strategy: RoutingStrategy = RoutingStrategy.ROUND_ROBIN;
  private weights: Record<string, number> = {};
  private currentIndex: number = 0;
  private connectionCounts: Map<string, number> = new Map();

  selectService(services: ServiceRegistration[]): ServiceRegistration {
    switch (this.strategy) {
      case RoutingStrategy.ROUND_ROBIN:
        return this.roundRobin(services);
      case RoutingStrategy.LEAST_CONNECTIONS:
        return this.leastConnections(services);
      case RoutingStrategy.WEIGHTED:
        return this.weighted(services);
      case RoutingStrategy.INTELLIGENT:
        return this.intelligent(services);
      default:
        return this.roundRobin(services);
    }
  }

  private roundRobin(services: ServiceRegistration[]): ServiceRegistration {
    const service = services[this.currentIndex % services.length];
    this.currentIndex = (this.currentIndex + 1) % services.length;
    return service;
  }

  private leastConnections(services: ServiceRegistration[]): ServiceRegistration {
    return services.reduce((min, service) => {
      const minConnections = this.connectionCounts.get(min.url) || 0;
      const currentConnections = this.connectionCounts.get(service.url) || 0;
      return currentConnections < minConnections ? service : min;
    });
  }

  private weighted(services: ServiceRegistration[]): ServiceRegistration {
    const totalWeight = services.reduce((sum, service) => sum + (this.weights[service.url] || 1), 0);
    let random = Math.random() * totalWeight;

    for (const service of services) {
      const weight = this.weights[service.url] || 1;
      random -= weight;
      if (random <= 0) {
        return service;
      }
    }

    return services[0];
  }

  private intelligent(services: ServiceRegistration[]): ServiceRegistration {
    // Intelligent selection based on response time and error rate
    return services.reduce((best, service) => {
      const bestScore = this.calculateScore(best);
      const currentScore = this.calculateScore(service);
      return currentScore > bestScore ? service : best;
    });
  }

  private calculateScore(service: ServiceRegistration): number {
    const responseTimeScore = Math.max(0, 1000 - service.responseTime) / 1000;
    const errorRateScore = Math.max(0, 1 - (service.errorCount / 100));
    return responseTimeScore * 0.7 + errorRateScore * 0.3;
  }

  updateStrategy(strategy: RoutingStrategy, weights?: Record<string, number>): void {
    this.strategy = strategy;
    if (weights) {
      this.weights = weights;
    }
  }

  getStrategy(): RoutingStrategy {
    return this.strategy;
  }

  incrementConnectionCount(serviceUrl: string): void {
    const current = this.connectionCounts.get(serviceUrl) || 0;
    this.connectionCounts.set(serviceUrl, current + 1);
  }

  decrementConnectionCount(serviceUrl: string): void {
    const current = this.connectionCounts.get(serviceUrl) || 0;
    this.connectionCounts.set(serviceUrl, Math.max(0, current - 1));
  }
}

// Export singleton instance
export const routingService = new RoutingService();