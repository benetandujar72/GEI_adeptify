import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';
import {
  MCPRequest,
  MCPResponse,
  ServiceRegistry,
  ServiceInfo,
  ServiceHealth,
  LoadBalancer,
  CircuitBreaker,
  HealthStatus,
  LoadBalancingStrategy,
  CircuitBreakerState,
  RequestPriority,
  ResponseMetadata,
  ProcessingStep
} from '../types/orchestrator.types.js';

export class MCPRouterService {
  private serviceRegistry: ServiceRegistry;
  private httpClient: AxiosInstance;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, any>;
  private cache: Map<string, any>;
  private requestQueue: Map<string, MCPRequest[]>;

  constructor() {
    this.serviceRegistry = {
      services: new Map(),
      health: new Map(),
      loadBalancers: new Map(),
      circuitBreakers: new Map()
    };

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Orchestrator/1.0.0'
      }
    });

    this.metrics = new Map();
    this.cache = new Map();
    this.requestQueue = new Map();

    this.initializeDefaultServices();
    this.startHealthChecks();
  }

  /**
   * Procesa una solicitud MCP y la enruta al servicio apropiado
   */
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];

    try {
      logger.info(`Procesando solicitud MCP: ${request.id}`, {
        service: request.service,
        action: request.action,
        userId: request.userId,
        priority: request.priority
      });

      // Paso 1: Validar solicitud
      processingSteps.push({
        name: 'request_validation',
        duration: 0,
        success: true
      });

      // Paso 2: Verificar disponibilidad del servicio
      const serviceInfo = this.getServiceInfo(request.service);
      if (!serviceInfo) {
        throw new Error(`Servicio no encontrado: ${request.service}`);
      }

      processingSteps.push({
        name: 'service_discovery',
        duration: Date.now() - startTime,
        success: true
      });

      // Paso 3: Verificar circuit breaker
      const circuitBreaker = this.getCircuitBreaker(request.service);
      if (circuitBreaker.state === CircuitBreakerState.OPEN) {
        throw new Error(`Circuit breaker abierto para servicio: ${request.service}`);
      }

      processingSteps.push({
        name: 'circuit_breaker_check',
        duration: Date.now() - startTime,
        success: true
      });

      // Paso 4: Seleccionar endpoint usando load balancer
      const endpoint = this.selectEndpoint(request.service, request);
      if (!endpoint) {
        throw new Error(`No hay endpoints disponibles para servicio: ${request.service}`);
      }

      processingSteps.push({
        name: 'load_balancer_selection',
        duration: Date.now() - startTime,
        success: true
      });

      // Paso 5: Ejecutar solicitud
      const response = await this.executeRequest(request, endpoint);
      const processingTime = Date.now() - startTime;

      // Paso 6: Actualizar métricas
      this.updateMetrics(request.service, processingTime, true);

      // Paso 7: Actualizar circuit breaker
      this.updateCircuitBreaker(request.service, true);

      processingSteps.push({
        name: 'request_execution',
        duration: processingTime,
        success: true
      });

      // Construir respuesta
      const mcpResponse: MCPResponse = {
        id: uuidv4(),
        requestId: request.id,
        success: true,
        data: response.data,
        metadata: {
          service: request.service,
          version: serviceInfo.version,
          cacheHit: false,
          upstreamServices: [request.service],
          processingSteps
        },
        timestamp: new Date(),
        processingTime
      };

      logger.info(`Solicitud MCP completada exitosamente: ${request.id}`, {
        processingTime,
        service: request.service
      });

      return mcpResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Actualizar métricas de error
      this.updateMetrics(request.service, processingTime, false);
      
      // Actualizar circuit breaker
      this.updateCircuitBreaker(request.service, false);

      processingSteps.push({
        name: 'error_handling',
        duration: processingTime,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      logger.error(`Error procesando solicitud MCP: ${request.id}`, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        service: request.service,
        processingTime
      });

      return {
        id: uuidv4(),
        requestId: request.id,
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido',
        metadata: {
          service: request.service,
          version: 'unknown',
          cacheHit: false,
          upstreamServices: [request.service],
          processingSteps
        },
        timestamp: new Date(),
        processingTime
      };
    }
  }

  /**
   * Registra un nuevo servicio en el registry
   */
  registerService(serviceInfo: ServiceInfo): void {
    this.serviceRegistry.services.set(serviceInfo.id, serviceInfo);
    
    // Inicializar health check
    this.serviceRegistry.health.set(serviceInfo.id, {
      status: HealthStatus.UNKNOWN,
      lastCheck: new Date(),
      responseTime: 0,
      uptime: 0,
      errors: [],
      metrics: {
        requestsPerSecond: 0,
        errorRate: 0,
        averageResponseTime: 0,
        activeConnections: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    });

    // Inicializar load balancer
    this.serviceRegistry.loadBalancers.set(serviceInfo.id, {
      strategy: LoadBalancingStrategy.ROUND_ROBIN,
      endpoints: serviceInfo.endpoints,
      weights: new Map(),
      healthChecks: serviceInfo.endpoints.map(endpoint => endpoint.healthCheck),
      failover: {
        enabled: true,
        maxFailures: 3,
        recoveryTime: 60000,
        backupServices: []
      }
    });

    // Inicializar circuit breaker
    this.serviceRegistry.circuitBreakers.set(serviceInfo.id, {
      state: CircuitBreakerState.CLOSED,
      failureThreshold: 5,
      recoveryTimeout: 30000,
      failureCount: 0
    });

    logger.info(`Servicio registrado: ${serviceInfo.name}`, {
      serviceId: serviceInfo.id,
      endpoints: serviceInfo.endpoints.length,
      capabilities: serviceInfo.capabilities
    });
  }

  /**
   * Obtiene información de un servicio
   */
  getServiceInfo(serviceId: string): ServiceInfo | undefined {
    return this.serviceRegistry.services.get(serviceId);
  }

  /**
   * Obtiene el estado de salud de un servicio
   */
  getServiceHealth(serviceId: string): ServiceHealth | undefined {
    return this.serviceRegistry.health.get(serviceId);
  }

  /**
   * Obtiene el circuit breaker de un servicio
   */
  getCircuitBreaker(serviceId: string): CircuitBreaker | undefined {
    return this.serviceRegistry.circuitBreakers.get(serviceId);
  }

  /**
   * Selecciona un endpoint usando el load balancer
   */
  selectEndpoint(serviceId: string, request: MCPRequest): any {
    const loadBalancer = this.serviceRegistry.loadBalancers.get(serviceId);
    if (!loadBalancer || loadBalancer.endpoints.length === 0) {
      return null;
    }

    // Filtrar endpoints saludables
    const healthyEndpoints = loadBalancer.endpoints.filter(endpoint => {
      const health = this.serviceRegistry.health.get(serviceId);
      return health && health.status !== HealthStatus.UNHEALTHY;
    });

    if (healthyEndpoints.length === 0) {
      return null;
    }

    // Aplicar estrategia de load balancing
    switch (loadBalancer.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.roundRobinSelection(healthyEndpoints);
      
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.leastConnectionsSelection(healthyEndpoints, serviceId);
      
      case LoadBalancingStrategy.WEIGHTED:
        return this.weightedSelection(healthyEndpoints, loadBalancer.weights);
      
      case LoadBalancingStrategy.LEAST_RESPONSE_TIME:
        return this.leastResponseTimeSelection(healthyEndpoints, serviceId);
      
      default:
        return healthyEndpoints[0];
    }
  }

  /**
   * Ejecuta una solicitud HTTP al servicio
   */
  private async executeRequest(request: MCPRequest, endpoint: any): Promise<AxiosResponse> {
    const url = `${endpoint.url}${endpoint.path}`;
    const method = endpoint.method.toLowerCase();
    const timeout = endpoint.timeout || 30000;

    const requestConfig = {
      method,
      url,
      data: request.data,
      timeout,
      headers: {
        'X-Request-ID': request.id,
        'X-User-ID': request.userId,
        'X-Session-ID': request.sessionId,
        'X-Priority': request.priority,
        'Content-Type': 'application/json'
      }
    };

    try {
      const response = await this.httpClient.request(requestConfig);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Error HTTP ${error.response?.status}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Actualiza las métricas del servicio
   */
  private updateMetrics(serviceId: string, processingTime: number, success: boolean): void {
    const metrics = this.metrics.get(serviceId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      lastUpdated: new Date()
    };

    metrics.totalRequests++;
    metrics.totalProcessingTime += processingTime;
    metrics.averageProcessingTime = metrics.totalProcessingTime / metrics.totalRequests;

    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    metrics.lastUpdated = new Date();
    this.metrics.set(serviceId, metrics);
  }

  /**
   * Actualiza el circuit breaker
   */
  private updateCircuitBreaker(serviceId: string, success: boolean): void {
    const circuitBreaker = this.serviceRegistry.circuitBreakers.get(serviceId);
    if (!circuitBreaker) return;

    if (success) {
      if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
        circuitBreaker.state = CircuitBreakerState.CLOSED;
        circuitBreaker.failureCount = 0;
        circuitBreaker.lastFailureTime = undefined;
        circuitBreaker.nextAttemptTime = undefined;
      }
    } else {
      circuitBreaker.failureCount++;
      
      if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
        circuitBreaker.state = CircuitBreakerState.OPEN;
        circuitBreaker.lastFailureTime = new Date();
        circuitBreaker.nextAttemptTime = new Date(
          circuitBreaker.lastFailureTime.getTime() + circuitBreaker.recoveryTimeout
        );
      }
    }
  }

  /**
   * Estrategias de load balancing
   */
  private roundRobinSelection(endpoints: any[]): any {
    const index = Math.floor(Math.random() * endpoints.length);
    return endpoints[index];
  }

  private leastConnectionsSelection(endpoints: any[], serviceId: string): any {
    const health = this.serviceRegistry.health.get(serviceId);
    if (!health) return endpoints[0];

    // Simular selección basada en conexiones activas
    return endpoints.reduce((min, endpoint) => {
      const endpointConnections = health.metrics.activeConnections / endpoints.length;
      return endpointConnections < min ? endpointConnections : min;
    }, Infinity);
  }

  private weightedSelection(endpoints: any[], weights: Map<string, number>): any {
    const totalWeight = Array.from(weights.values()).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      const weight = weights.get(endpoint.url) || 1;
      random -= weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return endpoints[0];
  }

  private leastResponseTimeSelection(endpoints: any[], serviceId: string): any {
    const health = this.serviceRegistry.health.get(serviceId);
    if (!health) return endpoints[0];

    return endpoints.reduce((fastest, endpoint) => {
      return health.metrics.averageResponseTime < fastest.metrics?.averageResponseTime ? endpoint : fastest;
    }, endpoints[0]);
  }

  /**
   * Inicializa servicios por defecto
   */
  private initializeDefaultServices(): void {
    const defaultServices = [
      {
        id: 'user-service',
        name: 'User Service',
        version: '1.0.0',
        endpoints: [
          {
            url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
            method: 'POST',
            path: '/api/users',
            timeout: 5000,
            retries: 3,
            healthCheck: {
              url: '/health',
              method: 'GET',
              timeout: 3000,
              interval: 30000,
              expectedStatus: 200
            }
          }
        ],
        capabilities: ['authentication', 'authorization', 'user-management'],
        dependencies: [],
        health: {
          status: HealthStatus.UNKNOWN,
          lastCheck: new Date(),
          responseTime: 0,
          uptime: 0,
          errors: [],
          metrics: {
            requestsPerSecond: 0,
            errorRate: 0,
            averageResponseTime: 0,
            activeConnections: 0,
            memoryUsage: 0,
            cpuUsage: 0
          }
        },
        loadBalancer: {
          strategy: LoadBalancingStrategy.ROUND_ROBIN,
          endpoints: [],
          weights: new Map(),
          healthChecks: [],
          failover: {
            enabled: true,
            maxFailures: 3,
            recoveryTime: 60000,
            backupServices: []
          }
        },
        circuitBreaker: {
          state: CircuitBreakerState.CLOSED,
          failureThreshold: 5,
          recoveryTimeout: 30000,
          failureCount: 0
        },
        metadata: {}
      },
      {
        id: 'student-service',
        name: 'Student Service',
        version: '1.0.0',
        endpoints: [
          {
            url: process.env.STUDENT_SERVICE_URL || 'http://localhost:3002',
            method: 'POST',
            path: '/api/students',
            timeout: 5000,
            retries: 3,
            healthCheck: {
              url: '/health',
              method: 'GET',
              timeout: 3000,
              interval: 30000,
              expectedStatus: 200
            }
          }
        ],
        capabilities: ['student-management', 'academic-records', 'attendance'],
        dependencies: ['user-service'],
        health: {
          status: HealthStatus.UNKNOWN,
          lastCheck: new Date(),
          responseTime: 0,
          uptime: 0,
          errors: [],
          metrics: {
            requestsPerSecond: 0,
            errorRate: 0,
            averageResponseTime: 0,
            activeConnections: 0,
            memoryUsage: 0,
            cpuUsage: 0
          }
        },
        loadBalancer: {
          strategy: LoadBalancingStrategy.ROUND_ROBIN,
          endpoints: [],
          weights: new Map(),
          healthChecks: [],
          failover: {
            enabled: true,
            maxFailures: 3,
            recoveryTime: 60000,
            backupServices: []
          }
        },
        circuitBreaker: {
          state: CircuitBreakerState.CLOSED,
          failureThreshold: 5,
          recoveryTimeout: 30000,
          failureCount: 0
        },
        metadata: {}
      },
      {
        id: 'course-service',
        name: 'Course Service',
        version: '1.0.0',
        endpoints: [
          {
            url: process.env.COURSE_SERVICE_URL || 'http://localhost:3003',
            method: 'POST',
            path: '/api/courses',
            timeout: 5000,
            retries: 3,
            healthCheck: {
              url: '/health',
              method: 'GET',
              timeout: 3000,
              interval: 30000,
              expectedStatus: 200
            }
          }
        ],
        capabilities: ['course-management', 'curriculum', 'scheduling'],
        dependencies: ['user-service'],
        health: {
          status: HealthStatus.UNKNOWN,
          lastCheck: new Date(),
          responseTime: 0,
          uptime: 0,
          errors: [],
          metrics: {
            requestsPerSecond: 0,
            errorRate: 0,
            averageResponseTime: 0,
            activeConnections: 0,
            memoryUsage: 0,
            cpuUsage: 0
          }
        },
        loadBalancer: {
          strategy: LoadBalancingStrategy.ROUND_ROBIN,
          endpoints: [],
          weights: new Map(),
          healthChecks: [],
          failover: {
            enabled: true,
            maxFailures: 3,
            recoveryTime: 60000,
            backupServices: []
          }
        },
        circuitBreaker: {
          state: CircuitBreakerState.CLOSED,
          failureThreshold: 5,
          recoveryTimeout: 30000,
          failureCount: 0
        },
        metadata: {}
      },
      {
        id: 'llm-gateway',
        name: 'LLM Gateway',
        version: '1.0.0',
        endpoints: [
          {
            url: process.env.LLM_GATEWAY_URL || 'http://localhost:3004',
            method: 'POST',
            path: '/api/llm/chat',
            timeout: 30000,
            retries: 2,
            healthCheck: {
              url: '/health',
              method: 'GET',
              timeout: 5000,
              interval: 30000,
              expectedStatus: 200
            }
          }
        ],
        capabilities: ['ai-chat', 'content-generation', 'text-processing'],
        dependencies: [],
        health: {
          status: HealthStatus.UNKNOWN,
          lastCheck: new Date(),
          responseTime: 0,
          uptime: 0,
          errors: [],
          metrics: {
            requestsPerSecond: 0,
            errorRate: 0,
            averageResponseTime: 0,
            activeConnections: 0,
            memoryUsage: 0,
            cpuUsage: 0
          }
        },
        loadBalancer: {
          strategy: LoadBalancingStrategy.ROUND_ROBIN,
          endpoints: [],
          weights: new Map(),
          healthChecks: [],
          failover: {
            enabled: true,
            maxFailures: 3,
            recoveryTime: 60000,
            backupServices: []
          }
        },
        circuitBreaker: {
          state: CircuitBreakerState.CLOSED,
          failureThreshold: 3,
          recoveryTimeout: 60000,
          failureCount: 0
        },
        metadata: {}
      }
    ];

    defaultServices.forEach(service => this.registerService(service));
  }

  /**
   * Inicia los health checks periódicos
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Cada 30 segundos
  }

  /**
   * Realiza health checks de todos los servicios
   */
  private async performHealthChecks(): Promise<void> {
    for (const [serviceId, serviceInfo] of this.serviceRegistry.services) {
      try {
        await this.checkServiceHealth(serviceId, serviceInfo);
      } catch (error) {
        logger.error(`Error en health check para servicio ${serviceId}`, {
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
  }

  /**
   * Verifica la salud de un servicio específico
   */
  private async checkServiceHealth(serviceId: string, serviceInfo: ServiceInfo): Promise<void> {
    const health = this.serviceRegistry.health.get(serviceId);
    if (!health) return;

    const startTime = Date.now();
    let success = false;

    try {
      for (const endpoint of serviceInfo.endpoints) {
        const healthCheckUrl = `${endpoint.url}${endpoint.healthCheck.url}`;
        
        const response = await this.httpClient.get(healthCheckUrl, {
          timeout: endpoint.healthCheck.timeout
        });

        if (response.status === endpoint.healthCheck.expectedStatus) {
          success = true;
          break;
        }
      }

      const responseTime = Date.now() - startTime;

      // Actualizar métricas de salud
      health.status = success ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY;
      health.lastCheck = new Date();
      health.responseTime = responseTime;

      if (success) {
        health.uptime = Date.now() - health.lastCheck.getTime();
        health.errors = [];
      } else {
        health.errors.push({
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
          timestamp: new Date(),
          count: 1
        });
      }

      logger.debug(`Health check completado para ${serviceId}`, {
        status: health.status,
        responseTime,
        success
      });

    } catch (error) {
      health.status = HealthStatus.UNHEALTHY;
      health.lastCheck = new Date();
      health.errors.push({
        code: 'HEALTH_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date(),
        count: 1
      });

      logger.warn(`Health check falló para ${serviceId}`, {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtiene métricas del router
   */
  getMetrics(): any {
    return {
      totalServices: this.serviceRegistry.services.size,
      healthyServices: Array.from(this.serviceRegistry.health.values())
        .filter(h => h.status === HealthStatus.HEALTHY).length,
      totalRequests: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.totalRequests, 0),
      averageResponseTime: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.averageProcessingTime, 0) / this.metrics.size,
      cacheHitRate: 0, // Implementar cuando se agregue caché
      circuitBreakers: Array.from(this.serviceRegistry.circuitBreakers.values())
        .filter(cb => cb.state === CircuitBreakerState.OPEN).length
    };
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
} 