import { z } from 'zod';

// Enums
export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEGRADED = 'degraded',
  ERROR = 'error'
}

export enum ContextType {
  USER_SESSION = 'user_session',
  LEARNING_SESSION = 'learning_session',
  AI_INTERACTION = 'ai_interaction',
  SYSTEM_OPERATION = 'system_operation'
}

export enum AgentType {
  ROUTING = 'routing',
  CONTEXT = 'context',
  AI_COORDINATOR = 'ai_coordinator',
  LOAD_BALANCER = 'load_balancer'
}

export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED = 'weighted',
  INTELLIGENT = 'intelligent'
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

// Zod Schemas
export const ServiceRegistrationSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  port: z.number().int().positive(),
  capabilities: z.array(z.string()),
  version: z.string().optional(),
  healthCheckUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

export const ContextSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(ContextType),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.record(z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().optional()
});

export const RoutingRequestSchema = z.object({
  service: z.string(),
  action: z.string(),
  data: z.record(z.any()),
  context: z.string().uuid().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  timeout: z.number().int().positive().optional()
});

export const AgentConfigSchema = z.object({
  type: z.nativeEnum(AgentType),
  enabled: z.boolean(),
  config: z.record(z.any()),
  maxConcurrency: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional()
});

export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().int().positive(),
  recoveryTimeout: z.number().int().positive(),
  halfOpenMaxRequests: z.number().int().positive().optional()
});

export const LoadBalancerConfigSchema = z.object({
  strategy: z.nativeEnum(RoutingStrategy),
  weights: z.record(z.number()).optional(),
  healthCheckInterval: z.number().int().positive().optional()
});

// TypeScript Interfaces
export interface ServiceRegistration extends z.infer<typeof ServiceRegistrationSchema> {
  status: ServiceStatus;
  lastHealthCheck: Date;
  responseTime: number;
  errorCount: number;
  circuitBreakerState: CircuitBreakerState;
}

export interface Context extends z.infer<typeof ContextSchema> {}

export interface RoutingRequest extends z.infer<typeof RoutingRequestSchema> {}

export interface RoutingResponse {
  success: boolean;
  serviceUrl: string;
  response: any;
  responseTime: number;
  contextId?: string;
  error?: string;
}

export interface AgentConfig extends z.infer<typeof AgentConfigSchema> {}

export interface CircuitBreakerConfig extends z.infer<typeof CircuitBreakerConfigSchema> {}

export interface LoadBalancerConfig extends z.infer<typeof LoadBalancerConfigSchema> {}

export interface MCPMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeConnections: number;
  servicesRegistered: number;
  contextsActive: number;
  agentsActive: number;
}

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime: number;
  lastCheck: Date;
  errorRate: number;
  uptime: number;
}

export interface ContextSummary {
  total: number;
  byType: Record<ContextType, number>;
  active: number;
  expired: number;
}

export interface AgentStatus {
  type: AgentType;
  enabled: boolean;
  status: ServiceStatus;
  metrics: {
    requestsProcessed: number;
    averageProcessingTime: number;
    errors: number;
  };
}

export interface MCPConfig {
  port: number;
  environment: string;
  logLevel: string;
  services: {
    maxRetries: number;
    timeout: number;
    circuitBreaker: CircuitBreakerConfig;
  };
  loadBalancer: LoadBalancerConfig;
  context: {
    maxAge: number;
    cleanupInterval: number;
  };
  agents: AgentConfig[];
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
  };
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  contextId?: string;
}

export interface MCPEvent {
  type: string;
  data: any;
  timestamp: Date;
  contextId?: string;
  userId?: string;
}

// Utility types
export type ServiceCapability = 'user_management' | 'course_management' | 'ai_services' | 'analytics' | 'communication' | 'file_storage' | 'search' | 'notifications';

export type ContextData = Record<string, any>;

export type AgentProcessor = (request: RoutingRequest, context?: Context) => Promise<RoutingResponse>; 