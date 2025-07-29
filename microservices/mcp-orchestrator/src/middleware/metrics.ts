import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';
import { logMetrics } from '../utils/logger';

// Create Prometheus registry
const register = new Registry();

// HTTP request metrics
const httpRequestsTotal = new Counter({
  name: 'mcp_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new Histogram({
  name: 'mcp_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// MCP specific metrics
const mcpRequestsTotal = new Counter({
  name: 'mcp_requests_total',
  help: 'Total number of MCP requests',
  labelNames: ['service', 'action', 'status']
});

const mcpRequestDuration = new Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'MCP request duration in seconds',
  labelNames: ['service', 'action'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const mcpServicesRegistered = new Gauge({
  name: 'mcp_services_registered',
  help: 'Number of registered services'
});

const mcpContextsActive = new Gauge({
  name: 'mcp_contexts_active',
  help: 'Number of active contexts'
});

const mcpAgentsActive = new Gauge({
  name: 'mcp_agents_active',
  help: 'Number of active agents'
});

const mcpTasksPending = new Gauge({
  name: 'mcp_tasks_pending',
  help: 'Number of pending tasks'
});

const mcpTasksRunning = new Gauge({
  name: 'mcp_tasks_running',
  help: 'Number of running tasks'
});

const mcpTasksCompleted = new Gauge({
  name: 'mcp_tasks_completed',
  help: 'Number of completed tasks'
});

const mcpTasksFailed = new Gauge({
  name: 'mcp_tasks_failed',
  help: 'Number of failed tasks'
});

const mcpCircuitBreakerState = new Gauge({
  name: 'mcp_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
  labelNames: ['service']
});

const mcpLoadBalancerDecisions = new Counter({
  name: 'mcp_load_balancer_decisions_total',
  help: 'Total number of load balancer decisions',
  labelNames: ['service', 'strategy', 'selected_url']
});

// Error metrics
const mcpErrorsTotal = new Counter({
  name: 'mcp_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'service', 'operation']
});

// System metrics
const mcpSystemMemoryUsage = new Gauge({
  name: 'mcp_system_memory_usage_bytes',
  help: 'System memory usage in bytes'
});

const mcpSystemCpuUsage = new Gauge({
  name: 'mcp_system_cpu_usage_percent',
  help: 'System CPU usage percentage'
});

const mcpSystemUptime = new Gauge({
  name: 'mcp_system_uptime_seconds',
  help: 'System uptime in seconds'
});

// Register all metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(mcpRequestsTotal);
register.registerMetric(mcpRequestDuration);
register.registerMetric(mcpServicesRegistered);
register.registerMetric(mcpContextsActive);
register.registerMetric(mcpAgentsActive);
register.registerMetric(mcpTasksPending);
register.registerMetric(mcpTasksRunning);
register.registerMetric(mcpTasksCompleted);
register.registerMetric(mcpTasksFailed);
register.registerMetric(mcpCircuitBreakerState);
register.registerMetric(mcpLoadBalancerDecisions);
register.registerMetric(mcpErrorsTotal);
register.registerMetric(mcpSystemMemoryUsage);
register.registerMetric(mcpSystemCpuUsage);
register.registerMetric(mcpSystemUptime);

// Metrics middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response data
  res.send = function(data: any) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record HTTP metrics
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

    // Record MCP specific metrics if it's an MCP request
    if (req.path.startsWith('/api/mcp')) {
      const service = req.body?.service || 'unknown';
      const action = req.body?.action || 'unknown';
      const status = statusCode < 400 ? 'success' : 'error';

      mcpRequestsTotal.inc({ service, action, status });
      mcpRequestDuration.observe({ service, action }, duration);
    }

    // Log metrics
    logMetrics({
      type: 'http_request',
      method,
      route,
      statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    return originalSend.call(this, data);
  };

  next();
};

// Utility functions to update metrics
export const updateServicesRegistered = (count: number): void => {
  mcpServicesRegistered.set(count);
};

export const updateContextsActive = (count: number): void => {
  mcpContextsActive.set(count);
};

export const updateAgentsActive = (count: number): void => {
  mcpAgentsActive.set(count);
};

export const updateTasksPending = (count: number): void => {
  mcpTasksPending.set(count);
};

export const updateTasksRunning = (count: number): void => {
  mcpTasksRunning.set(count);
};

export const updateTasksCompleted = (count: number): void => {
  mcpTasksCompleted.set(count);
};

export const updateTasksFailed = (count: number): void => {
  mcpTasksFailed.set(count);
};

export const updateCircuitBreakerState = (service: string, state: string): void => {
  const stateValue = state === 'closed' ? 0 : state === 'half_open' ? 1 : 2;
  mcpCircuitBreakerState.set({ service }, stateValue);
};

export const recordLoadBalancerDecision = (service: string, strategy: string, selectedUrl: string): void => {
  mcpLoadBalancerDecisions.inc({ service, strategy, selected_url: selectedUrl });
};

export const recordError = (type: string, service: string, operation: string): void => {
  mcpErrorsTotal.inc({ type, service, operation });
};

export const updateSystemMetrics = (): void => {
  // Memory usage
  const memUsage = process.memoryUsage();
  mcpSystemMemoryUsage.set(memUsage.heapUsed);

  // CPU usage (simplified - in production you'd want more sophisticated CPU monitoring)
  const startUsage = process.cpuUsage();
  setTimeout(() => {
    const endUsage = process.cpuUsage(startUsage);
    const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
    mcpSystemCpuUsage.set(cpuPercent);
  }, 100);

  // Uptime
  mcpSystemUptime.set(process.uptime());
};

// Get metrics endpoint
export const getMetrics = async (): Promise<string> => {
  return await register.metrics();
};

export const getMetricsJson = async (): Promise<any> => {
  const metrics = await register.getMetricsAsJSON();
  return {
    timestamp: new Date().toISOString(),
    metrics
  };
};

// Reset metrics (for testing)
export const resetMetrics = (): void => {
  register.clear();
};

// Helper functions for specific metric types
export const getLLMType = (service: string): string => {
  if (service.includes('openai')) return 'openai';
  if (service.includes('anthropic')) return 'anthropic';
  if (service.includes('google')) return 'google';
  return 'other';
};

export const getErrorType = (error: Error): string => {
  if (error.name === 'ValidationError') return 'validation';
  if (error.name === 'AuthenticationError') return 'authentication';
  if (error.name === 'AuthorizationError') return 'authorization';
  if (error.name === 'TimeoutError') return 'timeout';
  if (error.name === 'ServiceUnavailableError') return 'service_unavailable';
  return 'unknown';
};

// Start periodic metric updates
export const startMetricsCollection = (): void => {
  // Update system metrics every 30 seconds
  setInterval(updateSystemMetrics, 30000);
  
  // Initial update
  updateSystemMetrics();
};

// Export registry for external access
export { register };