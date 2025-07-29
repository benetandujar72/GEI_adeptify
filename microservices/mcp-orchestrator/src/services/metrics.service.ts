import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response } from 'express';

export interface MetricsConfig {
  enableDefaultMetrics?: boolean;
  prefix?: string;
  labels?: string[];
}

export class MetricsService {
  private static instance: MetricsService;
  private config: MetricsConfig;

  // Métricas HTTP
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestsInProgress: Gauge<string>;
  public httpRequestsFailed: Counter<string>;

  // Métricas MCP
  public mcpRequestsTotal: Counter<string>;
  public mcpRequestDuration: Histogram<string>;
  public mcpRequestsInProgress: Gauge<string>;
  public mcpRequestsFailed: Counter<string>;
  public mcpServicesRegistered: Gauge<string>;
  public mcpServicesActive: Gauge<string>;
  public mcpServicesUnhealthy: Gauge<string>;

  // Métricas de Routing
  public routingRequestsTotal: Counter<string>;
  public routingRequestDuration: Histogram<string>;
  public routingRequestsFailed: Counter<string>;
  public routingCacheHits: Counter<string>;
  public routingCacheMisses: Counter<string>;

  // Métricas de Context Management
  public contextOperationsTotal: Counter<string>;
  public contextOperationDuration: Histogram<string>;
  public contextOperationsFailed: Counter<string>;
  public contextsActive: Gauge<string>;
  public contextsCreated: Counter<string>;
  public contextsDeleted: Counter<string>;
  public contextsUpdated: Counter<string>;

  // Métricas de Agent Coordination
  public agentOperationsTotal: Counter<string>;
  public agentOperationDuration: Histogram<string>;
  public agentOperationsFailed: Counter<string>;
  public agentsActive: Gauge<string>;
  public agentsRegistered: Counter<string>;
  public agentsUnregistered: Counter<string>;
  public agentTasksTotal: Counter<string>;
  public agentTasksCompleted: Counter<string>;
  public agentTasksFailed: Counter<string>;
  public agentTasksInProgress: Gauge<string>;

  // Métricas de Workflows
  public workflowOperationsTotal: Counter<string>;
  public workflowOperationDuration: Histogram<string>;
  public workflowOperationsFailed: Counter<string>;
  public workflowsActive: Gauge<string>;
  public workflowsCreated: Counter<string>;
  public workflowsCompleted: Counter<string>;
  public workflowsFailed: Counter<string>;
  public workflowStepsTotal: Counter<string>;
  public workflowStepsCompleted: Counter<string>;
  public workflowStepsFailed: Counter<string>;

  // Métricas de Performance
  public memoryUsage: Gauge<string>;
  public cpuUsage: Gauge<string>;
  public eventLoopLag: Histogram<string>;
  public activeConnections: Gauge<string>;

  // Métricas de Redis
  public redisOperationsTotal: Counter<string>;
  public redisOperationDuration: Histogram<string>;
  public redisOperationsFailed: Counter<string>;
  public redisConnections: Gauge<string>;

  // Métricas de Database
  public dbOperationsTotal: Counter<string>;
  public dbOperationDuration: Histogram<string>;
  public dbOperationsFailed: Counter<string>;
  public dbConnections: Gauge<string>;

  // Métricas de AI Services
  public aiRequestsTotal: Counter<string>;
  public aiRequestDuration: Histogram<string>;
  public aiRequestsFailed: Counter<string>;
  public aiTokensUsed: Counter<string>;
  public aiCostTotal: Counter<string>;

  // Métricas de Circuit Breaker
  public circuitBreakerTrips: Counter<string>;
  public circuitBreakerResets: Counter<string>;
  public circuitBreakerState: Gauge<string>;

  private constructor(config: MetricsConfig = {}) {
    this.config = {
      enableDefaultMetrics: true,
      prefix: 'mcp_orchestrator',
      labels: ['service', 'method', 'endpoint', 'status_code'],
      ...config
    };
    this.initializeMetrics();
  }

  public static getInstance(config?: MetricsConfig): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(config);
    }
    return MetricsService.instance;
  }

  private initializeMetrics(): void {
    // Habilitar métricas por defecto de Node.js
    if (this.config.enableDefaultMetrics) {
      collectDefaultMetrics({ prefix: this.config.prefix });
    }

    // Métricas HTTP
    this.httpRequestsTotal = new Counter({
      name: `${this.config.prefix}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status_code']
    });

    this.httpRequestDuration = new Histogram({
      name: `${this.config.prefix}_http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.httpRequestsInProgress = new Gauge({
      name: `${this.config.prefix}_http_requests_in_progress`,
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method', 'endpoint']
    });

    this.httpRequestsFailed = new Counter({
      name: `${this.config.prefix}_http_requests_failed_total`,
      help: 'Total number of failed HTTP requests',
      labelNames: ['method', 'endpoint', 'error_type']
    });

    // Métricas MCP
    this.mcpRequestsTotal = new Counter({
      name: `${this.config.prefix}_mcp_requests_total`,
      help: 'Total number of MCP requests',
      labelNames: ['service', 'action', 'status']
    });

    this.mcpRequestDuration = new Histogram({
      name: `${this.config.prefix}_mcp_request_duration_seconds`,
      help: 'MCP request duration in seconds',
      labelNames: ['service', 'action'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.mcpRequestsInProgress = new Gauge({
      name: `${this.config.prefix}_mcp_requests_in_progress`,
      help: 'Number of MCP requests currently in progress',
      labelNames: ['service']
    });

    this.mcpRequestsFailed = new Counter({
      name: `${this.config.prefix}_mcp_requests_failed_total`,
      help: 'Total number of failed MCP requests',
      labelNames: ['service', 'action', 'error_type']
    });

    this.mcpServicesRegistered = new Gauge({
      name: `${this.config.prefix}_mcp_services_registered`,
      help: 'Number of registered MCP services',
      labelNames: ['service_type']
    });

    this.mcpServicesActive = new Gauge({
      name: `${this.config.prefix}_mcp_services_active`,
      help: 'Number of active MCP services',
      labelNames: ['service_type']
    });

    this.mcpServicesUnhealthy = new Gauge({
      name: `${this.config.prefix}_mcp_services_unhealthy`,
      help: 'Number of unhealthy MCP services',
      labelNames: ['service_type']
    });

    // Métricas de Routing
    this.routingRequestsTotal = new Counter({
      name: `${this.config.prefix}_routing_requests_total`,
      help: 'Total number of routing requests',
      labelNames: ['service', 'action']
    });

    this.routingRequestDuration = new Histogram({
      name: `${this.config.prefix}_routing_request_duration_seconds`,
      help: 'Routing request duration in seconds',
      labelNames: ['service', 'action'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.routingRequestsFailed = new Counter({
      name: `${this.config.prefix}_routing_requests_failed_total`,
      help: 'Total number of failed routing requests',
      labelNames: ['service', 'action', 'error_type']
    });

    this.routingCacheHits = new Counter({
      name: `${this.config.prefix}_routing_cache_hits_total`,
      help: 'Total number of routing cache hits',
      labelNames: ['cache_type']
    });

    this.routingCacheMisses = new Counter({
      name: `${this.config.prefix}_routing_cache_misses_total`,
      help: 'Total number of routing cache misses',
      labelNames: ['cache_type']
    });

    // Métricas de Context Management
    this.contextOperationsTotal = new Counter({
      name: `${this.config.prefix}_context_operations_total`,
      help: 'Total number of context operations',
      labelNames: ['operation', 'status']
    });

    this.contextOperationDuration = new Histogram({
      name: `${this.config.prefix}_context_operation_duration_seconds`,
      help: 'Context operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.contextOperationsFailed = new Counter({
      name: `${this.config.prefix}_context_operations_failed_total`,
      help: 'Total number of failed context operations',
      labelNames: ['operation', 'error_type']
    });

    this.contextsActive = new Gauge({
      name: `${this.config.prefix}_contexts_active`,
      help: 'Number of active contexts',
      labelNames: ['context_type']
    });

    this.contextsCreated = new Counter({
      name: `${this.config.prefix}_contexts_created_total`,
      help: 'Total number of contexts created',
      labelNames: ['context_type']
    });

    this.contextsDeleted = new Counter({
      name: `${this.config.prefix}_contexts_deleted_total`,
      help: 'Total number of contexts deleted',
      labelNames: ['context_type']
    });

    this.contextsUpdated = new Counter({
      name: `${this.config.prefix}_contexts_updated_total`,
      help: 'Total number of contexts updated',
      labelNames: ['context_type']
    });

    // Métricas de Agent Coordination
    this.agentOperationsTotal = new Counter({
      name: `${this.config.prefix}_agent_operations_total`,
      help: 'Total number of agent operations',
      labelNames: ['operation', 'agent_type', 'status']
    });

    this.agentOperationDuration = new Histogram({
      name: `${this.config.prefix}_agent_operation_duration_seconds`,
      help: 'Agent operation duration in seconds',
      labelNames: ['operation', 'agent_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.agentOperationsFailed = new Counter({
      name: `${this.config.prefix}_agent_operations_failed_total`,
      help: 'Total number of failed agent operations',
      labelNames: ['operation', 'agent_type', 'error_type']
    });

    this.agentsActive = new Gauge({
      name: `${this.config.prefix}_agents_active`,
      help: 'Number of active agents',
      labelNames: ['agent_type']
    });

    this.agentsRegistered = new Counter({
      name: `${this.config.prefix}_agents_registered_total`,
      help: 'Total number of agents registered',
      labelNames: ['agent_type']
    });

    this.agentsUnregistered = new Counter({
      name: `${this.config.prefix}_agents_unregistered_total`,
      help: 'Total number of agents unregistered',
      labelNames: ['agent_type']
    });

    this.agentTasksTotal = new Counter({
      name: `${this.config.prefix}_agent_tasks_total`,
      help: 'Total number of agent tasks',
      labelNames: ['agent_type', 'task_type']
    });

    this.agentTasksCompleted = new Counter({
      name: `${this.config.prefix}_agent_tasks_completed_total`,
      help: 'Total number of completed agent tasks',
      labelNames: ['agent_type', 'task_type']
    });

    this.agentTasksFailed = new Counter({
      name: `${this.config.prefix}_agent_tasks_failed_total`,
      help: 'Total number of failed agent tasks',
      labelNames: ['agent_type', 'task_type', 'error_type']
    });

    this.agentTasksInProgress = new Gauge({
      name: `${this.config.prefix}_agent_tasks_in_progress`,
      help: 'Number of agent tasks currently in progress',
      labelNames: ['agent_type', 'task_type']
    });

    // Métricas de Workflows
    this.workflowOperationsTotal = new Counter({
      name: `${this.config.prefix}_workflow_operations_total`,
      help: 'Total number of workflow operations',
      labelNames: ['operation', 'workflow_type', 'status']
    });

    this.workflowOperationDuration = new Histogram({
      name: `${this.config.prefix}_workflow_operation_duration_seconds`,
      help: 'Workflow operation duration in seconds',
      labelNames: ['operation', 'workflow_type'],
      buckets: [1, 5, 10, 30, 60, 300, 600, 1800]
    });

    this.workflowOperationsFailed = new Counter({
      name: `${this.config.prefix}_workflow_operations_failed_total`,
      help: 'Total number of failed workflow operations',
      labelNames: ['operation', 'workflow_type', 'error_type']
    });

    this.workflowsActive = new Gauge({
      name: `${this.config.prefix}_workflows_active`,
      help: 'Number of active workflows',
      labelNames: ['workflow_type']
    });

    this.workflowsCreated = new Counter({
      name: `${this.config.prefix}_workflows_created_total`,
      help: 'Total number of workflows created',
      labelNames: ['workflow_type']
    });

    this.workflowsCompleted = new Counter({
      name: `${this.config.prefix}_workflows_completed_total`,
      help: 'Total number of completed workflows',
      labelNames: ['workflow_type']
    });

    this.workflowsFailed = new Counter({
      name: `${this.config.prefix}_workflows_failed_total`,
      help: 'Total number of failed workflows',
      labelNames: ['workflow_type', 'error_type']
    });

    this.workflowStepsTotal = new Counter({
      name: `${this.config.prefix}_workflow_steps_total`,
      help: 'Total number of workflow steps',
      labelNames: ['workflow_type', 'step_type']
    });

    this.workflowStepsCompleted = new Counter({
      name: `${this.config.prefix}_workflow_steps_completed_total`,
      help: 'Total number of completed workflow steps',
      labelNames: ['workflow_type', 'step_type']
    });

    this.workflowStepsFailed = new Counter({
      name: `${this.config.prefix}_workflow_steps_failed_total`,
      help: 'Total number of failed workflow steps',
      labelNames: ['workflow_type', 'step_type', 'error_type']
    });

    // Métricas de Performance
    this.memoryUsage = new Gauge({
      name: `${this.config.prefix}_memory_usage_bytes`,
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    this.cpuUsage = new Gauge({
      name: `${this.config.prefix}_cpu_usage_percent`,
      help: 'CPU usage percentage',
      labelNames: ['type']
    });

    this.eventLoopLag = new Histogram({
      name: `${this.config.prefix}_event_loop_lag_seconds`,
      help: 'Event loop lag in seconds',
      buckets: [0.001, 0.01, 0.1, 1, 10]
    });

    this.activeConnections = new Gauge({
      name: `${this.config.prefix}_active_connections`,
      help: 'Number of active connections',
      labelNames: ['connection_type']
    });

    // Métricas de Redis
    this.redisOperationsTotal = new Counter({
      name: `${this.config.prefix}_redis_operations_total`,
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status']
    });

    this.redisOperationDuration = new Histogram({
      name: `${this.config.prefix}_redis_operation_duration_seconds`,
      help: 'Redis operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.01, 0.1, 1, 10]
    });

    this.redisOperationsFailed = new Counter({
      name: `${this.config.prefix}_redis_operations_failed_total`,
      help: 'Total number of failed Redis operations',
      labelNames: ['operation', 'error_type']
    });

    this.redisConnections = new Gauge({
      name: `${this.config.prefix}_redis_connections`,
      help: 'Number of Redis connections',
      labelNames: ['status']
    });

    // Métricas de Database
    this.dbOperationsTotal = new Counter({
      name: `${this.config.prefix}_db_operations_total`,
      help: 'Total number of database operations',
      labelNames: ['operation', 'table', 'status']
    });

    this.dbOperationDuration = new Histogram({
      name: `${this.config.prefix}_db_operation_duration_seconds`,
      help: 'Database operation duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.1, 1, 10]
    });

    this.dbOperationsFailed = new Counter({
      name: `${this.config.prefix}_db_operations_failed_total`,
      help: 'Total number of failed database operations',
      labelNames: ['operation', 'table', 'error_type']
    });

    this.dbConnections = new Gauge({
      name: `${this.config.prefix}_db_connections`,
      help: 'Number of database connections',
      labelNames: ['status']
    });

    // Métricas de AI Services
    this.aiRequestsTotal = new Counter({
      name: `${this.config.prefix}_ai_requests_total`,
      help: 'Total number of AI service requests',
      labelNames: ['provider', 'model', 'status']
    });

    this.aiRequestDuration = new Histogram({
      name: `${this.config.prefix}_ai_request_duration_seconds`,
      help: 'AI service request duration in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.aiRequestsFailed = new Counter({
      name: `${this.config.prefix}_ai_requests_failed_total`,
      help: 'Total number of failed AI service requests',
      labelNames: ['provider', 'model', 'error_type']
    });

    this.aiTokensUsed = new Counter({
      name: `${this.config.prefix}_ai_tokens_used_total`,
      help: 'Total number of AI tokens used',
      labelNames: ['provider', 'model', 'token_type']
    });

    this.aiCostTotal = new Counter({
      name: `${this.config.prefix}_ai_cost_total`,
      help: 'Total AI service cost',
      labelNames: ['provider', 'model', 'currency']
    });

    // Métricas de Circuit Breaker
    this.circuitBreakerTrips = new Counter({
      name: `${this.config.prefix}_circuit_breaker_trips_total`,
      help: 'Total number of circuit breaker trips',
      labelNames: ['service', 'reason']
    });

    this.circuitBreakerResets = new Counter({
      name: `${this.config.prefix}_circuit_breaker_resets_total`,
      help: 'Total number of circuit breaker resets',
      labelNames: ['service']
    });

    this.circuitBreakerState = new Gauge({
      name: `${this.config.prefix}_circuit_breaker_state`,
      help: 'Circuit breaker state (0=closed, 1=open, 2=half_open)',
      labelNames: ['service']
    });
  }

  // Métodos para registrar métricas HTTP
  public recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, endpoint, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, endpoint }, duration / 1000);
    
    if (statusCode >= 400) {
      this.httpRequestsFailed.inc({ method, endpoint, error_type: 'http_error' });
    }
  }

  public recordHttpRequestStart(method: string, endpoint: string): void {
    this.httpRequestsInProgress.inc({ method, endpoint });
  }

  public recordHttpRequestEnd(method: string, endpoint: string): void {
    this.httpRequestsInProgress.dec({ method, endpoint });
  }

  // Métodos para registrar métricas MCP
  public recordMCPRequest(service: string, action: string, status: string, duration: number): void {
    this.mcpRequestsTotal.inc({ service, action, status });
    this.mcpRequestDuration.observe({ service, action }, duration / 1000);
    
    if (status === 'failed') {
      this.mcpRequestsFailed.inc({ service, action, error_type: 'mcp_error' });
    }
  }

  public recordMCPRequestStart(service: string): void {
    this.mcpRequestsInProgress.inc({ service });
  }

  public recordMCPRequestEnd(service: string): void {
    this.mcpRequestsInProgress.dec({ service });
  }

  public setMCPServicesRegistered(count: number, serviceType: string): void {
    this.mcpServicesRegistered.set({ service_type: serviceType }, count);
  }

  public setMCPServicesActive(count: number, serviceType: string): void {
    this.mcpServicesActive.set({ service_type: serviceType }, count);
  }

  public setMCPServicesUnhealthy(count: number, serviceType: string): void {
    this.mcpServicesUnhealthy.set({ service_type: serviceType }, count);
  }

  // Métodos para registrar métricas de Routing
  public recordRoutingRequest(service: string, action: string, duration: number): void {
    this.routingRequestsTotal.inc({ service, action });
    this.routingRequestDuration.observe({ service, action }, duration / 1000);
  }

  public recordRoutingRequestFailed(service: string, action: string, errorType: string): void {
    this.routingRequestsFailed.inc({ service, action, error_type: errorType });
  }

  public recordRoutingCacheHit(cacheType: string): void {
    this.routingCacheHits.inc({ cache_type: cacheType });
  }

  public recordRoutingCacheMiss(cacheType: string): void {
    this.routingCacheMisses.inc({ cache_type: cacheType });
  }

  // Métodos para registrar métricas de Context Management
  public recordContextOperation(operation: string, status: string, duration: number): void {
    this.contextOperationsTotal.inc({ operation, status });
    this.contextOperationDuration.observe({ operation }, duration / 1000);
    
    if (status === 'failed') {
      this.contextOperationsFailed.inc({ operation, error_type: 'context_error' });
    }
  }

  public setContextsActive(count: number, contextType: string): void {
    this.contextsActive.set({ context_type: contextType }, count);
  }

  public recordContextCreated(contextType: string): void {
    this.contextsCreated.inc({ context_type: contextType });
  }

  public recordContextDeleted(contextType: string): void {
    this.contextsDeleted.inc({ context_type: contextType });
  }

  public recordContextUpdated(contextType: string): void {
    this.contextsUpdated.inc({ context_type: contextType });
  }

  // Métodos para registrar métricas de Agent Coordination
  public recordAgentOperation(operation: string, agentType: string, status: string, duration: number): void {
    this.agentOperationsTotal.inc({ operation, agent_type: agentType, status });
    this.agentOperationDuration.observe({ operation, agent_type: agentType }, duration / 1000);
    
    if (status === 'failed') {
      this.agentOperationsFailed.inc({ operation, agent_type: agentType, error_type: 'agent_error' });
    }
  }

  public setAgentsActive(count: number, agentType: string): void {
    this.agentsActive.set({ agent_type: agentType }, count);
  }

  public recordAgentRegistered(agentType: string): void {
    this.agentsRegistered.inc({ agent_type: agentType });
  }

  public recordAgentUnregistered(agentType: string): void {
    this.agentsUnregistered.inc({ agent_type: agentType });
  }

  public recordAgentTask(agentType: string, taskType: string): void {
    this.agentTasksTotal.inc({ agent_type: agentType, task_type: taskType });
  }

  public recordAgentTaskCompleted(agentType: string, taskType: string): void {
    this.agentTasksCompleted.inc({ agent_type: agentType, task_type: taskType });
  }

  public recordAgentTaskFailed(agentType: string, taskType: string, errorType: string): void {
    this.agentTasksFailed.inc({ agent_type: agentType, task_type: taskType, error_type: errorType });
  }

  public setAgentTasksInProgress(count: number, agentType: string, taskType: string): void {
    this.agentTasksInProgress.set({ agent_type: agentType, task_type: taskType }, count);
  }

  // Métodos para registrar métricas de Workflows
  public recordWorkflowOperation(operation: string, workflowType: string, status: string, duration: number): void {
    this.workflowOperationsTotal.inc({ operation, workflow_type: workflowType, status });
    this.workflowOperationDuration.observe({ operation, workflow_type: workflowType }, duration / 1000);
    
    if (status === 'failed') {
      this.workflowOperationsFailed.inc({ operation, workflow_type: workflowType, error_type: 'workflow_error' });
    }
  }

  public setWorkflowsActive(count: number, workflowType: string): void {
    this.workflowsActive.set({ workflow_type: workflowType }, count);
  }

  public recordWorkflowCreated(workflowType: string): void {
    this.workflowsCreated.inc({ workflow_type: workflowType });
  }

  public recordWorkflowCompleted(workflowType: string): void {
    this.workflowsCompleted.inc({ workflow_type: workflowType });
  }

  public recordWorkflowFailed(workflowType: string, errorType: string): void {
    this.workflowsFailed.inc({ workflow_type: workflowType, error_type: errorType });
  }

  public recordWorkflowStep(workflowType: string, stepType: string): void {
    this.workflowStepsTotal.inc({ workflow_type: workflowType, step_type: stepType });
  }

  public recordWorkflowStepCompleted(workflowType: string, stepType: string): void {
    this.workflowStepsCompleted.inc({ workflow_type: workflowType, step_type: stepType });
  }

  public recordWorkflowStepFailed(workflowType: string, stepType: string, errorType: string): void {
    this.workflowStepsFailed.inc({ workflow_type: workflowType, step_type: stepType, error_type: errorType });
  }

  // Métodos para registrar métricas de Performance
  public updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);
  }

  public setCpuUsage(usage: number): void {
    this.cpuUsage.set({ type: 'process' }, usage);
  }

  public recordEventLoopLag(lag: number): void {
    this.eventLoopLag.observe(lag / 1000);
  }

  public setActiveConnections(count: number, connectionType: string): void {
    this.activeConnections.set({ connection_type: connectionType }, count);
  }

  // Métodos para registrar métricas de Redis
  public recordRedisOperation(operation: string, status: string, duration: number): void {
    this.redisOperationsTotal.inc({ operation, status });
    this.redisOperationDuration.observe({ operation }, duration / 1000);
    
    if (status === 'failed') {
      this.redisOperationsFailed.inc({ operation, error_type: 'redis_error' });
    }
  }

  public setRedisConnections(count: number, status: string): void {
    this.redisConnections.set({ status }, count);
  }

  // Métodos para registrar métricas de Database
  public recordDbOperation(operation: string, table: string, status: string, duration: number): void {
    this.dbOperationsTotal.inc({ operation, table, status });
    this.dbOperationDuration.observe({ operation, table }, duration / 1000);
    
    if (status === 'failed') {
      this.dbOperationsFailed.inc({ operation, table, error_type: 'db_error' });
    }
  }

  public setDbConnections(count: number, status: string): void {
    this.dbConnections.set({ status }, count);
  }

  // Métodos para registrar métricas de AI Services
  public recordAIRequest(provider: string, model: string, status: string, duration: number): void {
    this.aiRequestsTotal.inc({ provider, model, status });
    this.aiRequestDuration.observe({ provider, model }, duration / 1000);
    
    if (status === 'failed') {
      this.aiRequestsFailed.inc({ provider, model, error_type: 'ai_error' });
    }
  }

  public recordAITokensUsed(provider: string, model: string, tokenType: string, count: number): void {
    this.aiTokensUsed.inc({ provider, model, token_type: tokenType }, count);
  }

  public recordAICost(provider: string, model: string, currency: string, cost: number): void {
    this.aiCostTotal.inc({ provider, model, currency }, cost);
  }

  // Métodos para registrar métricas de Circuit Breaker
  public recordCircuitBreakerTrip(service: string, reason: string): void {
    this.circuitBreakerTrips.inc({ service, reason });
  }

  public recordCircuitBreakerReset(service: string): void {
    this.circuitBreakerResets.inc({ service });
  }

  public setCircuitBreakerState(service: string, state: number): void {
    this.circuitBreakerState.set({ service }, state);
  }

  // Método para obtener métricas en formato Prometheus
  public async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  // Método para limpiar métricas
  public clearMetrics(): void {
    register.clear();
  }
}

export const metrics = MetricsService.getInstance();