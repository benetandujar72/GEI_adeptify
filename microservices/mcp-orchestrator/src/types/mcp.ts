export interface MCPRequest {
  capability: string;
  parameters: Record<string, any>;
  context?: MCPContext;
  sessionId?: string;
  userId?: string;
  timestamp?: string;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  contextUpdates?: Record<string, any>;
  executionTimeMs: number;
  serverId: string;
  timestamp: string;
}

export interface MCPContext {
  sessionId: string;
  userId: string;
  institutionId?: string;
  conversationHistory: MCPConversationEntry[];
  sharedData: Record<string, any>;
  lastUpdated: string;
  ttlSeconds: number;
}

export interface MCPConversationEntry {
  timestamp: string;
  request: MCPRequest;
  response: MCPResponse;
  metadata?: Record<string, any>;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  domain: string;
  endpoint: string;
  capabilities: string[];
  status: MCPServerStatus;
  lastHealthCheck?: string;
  responseTimeMs: number;
  errorCount: number;
  successCount: number;
  metadata?: Record<string, any>;
}

export enum MCPServerStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  OFFLINE = 'offline'
}

export interface MCPCapability {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  examples: MCPExample[];
  metadata?: Record<string, any>;
}

export interface MCPExample {
  input: Record<string, any>;
  output: Record<string, any>;
  description?: string;
}

export interface MCPLoadBalancerConfig {
  algorithm: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'random';
  weights?: Record<string, number>;
  healthCheckInterval: number;
  maxRetries: number;
  timeout: number;
}

export interface MCPHealthCheck {
  serverId: string;
  status: MCPServerStatus;
  responseTimeMs: number;
  lastCheck: string;
  error?: string;
}

export interface MCPMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeServers: number;
  totalServers: number;
  lastUpdated: string;
}

export interface MCPError extends Error {
  code: string;
  serverId?: string;
  capability?: string;
  context?: Record<string, any>;
}

export class MCPRoutingError extends Error implements MCPError {
  code = 'MCP_ROUTING_ERROR';
  
  constructor(message: string, public serverId?: string, public capability?: string) {
    super(message);
    this.name = 'MCPRoutingError';
  }
}

export class MCPExecutionError extends Error implements MCPError {
  code = 'MCP_EXECUTION_ERROR';
  
  constructor(message: string, public serverId?: string, public capability?: string) {
    super(message);
    this.name = 'MCPExecutionError';
  }
}

export class MCPContextError extends Error implements MCPError {
  code = 'MCP_CONTEXT_ERROR';
  
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'MCPContextError';
  }
} 