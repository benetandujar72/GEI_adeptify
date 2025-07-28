// Tipos principales para el MCP Orchestrator
export interface MCPRequest {
  id: string;
  userId: string;
  sessionId: string;
  service: string;
  action: string;
  data: any;
  context: RequestContext;
  priority: RequestPriority;
  timestamp: Date;
  timeout?: number;
  retries?: number;
}

export interface MCPResponse {
  id: string;
  requestId: string;
  success: boolean;
  data: any;
  error?: string;
  metadata: ResponseMetadata;
  timestamp: Date;
  processingTime: number;
}

export interface RequestContext {
  user: UserContext;
  session: SessionContext;
  environment: EnvironmentContext;
  preferences: UserPreferences;
  history: RequestHistory[];
}

export interface UserContext {
  id: string;
  role: UserRole;
  permissions: string[];
  preferences: UserPreferences;
  lastActivity: Date;
}

export interface SessionContext {
  id: string;
  startTime: Date;
  lastActivity: Date;
  data: Record<string, any>;
  state: SessionState;
}

export interface EnvironmentContext {
  platform: string;
  version: string;
  locale: string;
  timezone: string;
  device: DeviceInfo;
}

export interface UserPreferences {
  language: string;
  theme: string;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
}

export interface RequestHistory {
  id: string;
  service: string;
  action: string;
  timestamp: Date;
  success: boolean;
  processingTime: number;
}

export interface ResponseMetadata {
  service: string;
  version: string;
  cacheHit: boolean;
  cacheTime?: number;
  upstreamServices: string[];
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ServiceRegistry {
  services: Map<string, ServiceInfo>;
  health: Map<string, ServiceHealth>;
  loadBalancers: Map<string, LoadBalancer>;
  circuitBreakers: Map<string, CircuitBreaker>;
}

export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  endpoints: ServiceEndpoint[];
  capabilities: string[];
  dependencies: string[];
  health: ServiceHealth;
  loadBalancer: LoadBalancer;
  circuitBreaker: CircuitBreaker;
  metadata: Record<string, any>;
}

export interface ServiceEndpoint {
  url: string;
  method: string;
  path: string;
  timeout: number;
  retries: number;
  healthCheck: HealthCheck;
}

export interface ServiceHealth {
  status: HealthStatus;
  lastCheck: Date;
  responseTime: number;
  uptime: number;
  errors: HealthError[];
  metrics: HealthMetrics;
}

export interface HealthError {
  code: string;
  message: string;
  timestamp: Date;
  count: number;
}

export interface HealthMetrics {
  requestsPerSecond: number;
  errorRate: number;
  averageResponseTime: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface LoadBalancer {
  strategy: LoadBalancingStrategy;
  endpoints: ServiceEndpoint[];
  weights: Map<string, number>;
  healthChecks: HealthCheck[];
  failover: FailoverConfig;
}

export interface CircuitBreaker {
  state: CircuitBreakerState;
  failureThreshold: number;
  recoveryTimeout: number;
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export interface FailoverConfig {
  enabled: boolean;
  maxFailures: number;
  recoveryTime: number;
  backupServices: string[];
}

export interface HealthCheck {
  url: string;
  method: string;
  timeout: number;
  interval: number;
  expectedStatus: number;
  expectedResponse?: string;
}

export interface ContextManager {
  contexts: Map<string, ContextData>;
  cache: Map<string, CachedContext>;
  policies: ContextPolicy[];
  cleanup: CleanupConfig;
}

export interface ContextData {
  id: string;
  userId: string;
  sessionId: string;
  data: Record<string, any>;
  metadata: ContextMetadata;
  created: Date;
  updated: Date;
  expires: Date;
  accessCount: number;
}

export interface CachedContext {
  key: string;
  data: ContextData;
  ttl: number;
  created: Date;
  lastAccess: Date;
  accessCount: number;
}

export interface ContextMetadata {
  source: string;
  version: string;
  tags: string[];
  priority: number;
  size: number;
}

export interface ContextPolicy {
  name: string;
  rules: ContextRule[];
  actions: ContextAction[];
  priority: number;
  enabled: boolean;
}

export interface ContextRule {
  field: string;
  operator: RuleOperator;
  value: any;
  condition: RuleCondition;
}

export interface ContextAction {
  type: ActionType;
  target: string;
  parameters: Record<string, any>;
  conditions: ContextRule[];
}

export interface CleanupConfig {
  enabled: boolean;
  interval: number;
  maxAge: number;
  maxSize: number;
  strategy: CleanupStrategy;
}

export interface AIAgentCoordinator {
  agents: Map<string, AIAgent>;
  tasks: Map<string, AgentTask>;
  workflows: Map<string, AgentWorkflow>;
  policies: AgentPolicy[];
  metrics: AgentMetrics;
}

export interface AIAgent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  status: AgentStatus;
  health: AgentHealth;
  configuration: AgentConfig;
  metadata: Record<string, any>;
}

export interface AgentCapability {
  name: string;
  version: string;
  parameters: Record<string, any>;
  constraints: AgentConstraint[];
  performance: CapabilityPerformance;
}

export interface AgentConstraint {
  type: ConstraintType;
  field: string;
  operator: ConstraintOperator;
  value: any;
  description: string;
}

export interface CapabilityPerformance {
  averageResponseTime: number;
  successRate: number;
  throughput: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  data: any;
  result?: any;
  error?: string;
  created: Date;
  started?: Date;
  completed?: Date;
  timeout: number;
  retries: number;
  maxRetries: number;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: WorkflowStatus;
  execution: WorkflowExecution;
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  agentId: string;
  parameters: Record<string, any>;
  conditions: WorkflowCondition[];
  timeout: number;
  retries: number;
  dependencies: string[];
}

export interface WorkflowTrigger {
  type: TriggerType;
  condition: TriggerCondition;
  action: TriggerAction;
  enabled: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logic: ConditionLogic;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  currentStep: string;
  steps: ExecutionStep[];
  data: Record<string, any>;
  started: Date;
  completed?: Date;
  error?: string;
}

export interface ExecutionStep {
  stepId: string;
  status: StepStatus;
  started: Date;
  completed?: Date;
  result?: any;
  error?: string;
  duration: number;
}

export interface AgentPolicy {
  name: string;
  description: string;
  rules: PolicyRule[];
  actions: PolicyAction[];
  priority: number;
  enabled: boolean;
}

export interface PolicyRule {
  condition: PolicyCondition;
  operator: PolicyOperator;
  value: any;
}

export interface PolicyAction {
  type: PolicyActionType;
  target: string;
  parameters: Record<string, any>;
}

export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
}

export interface OrchestratorConfig {
  routing: RoutingConfig;
  context: ContextConfig;
  agents: AgentConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
}

export interface RoutingConfig {
  strategy: RoutingStrategy;
  loadBalancing: LoadBalancingConfig;
  failover: FailoverConfig;
  caching: CachingConfig;
  rateLimiting: RateLimitingConfig;
}

export interface ContextConfig {
  storage: StorageConfig;
  caching: CachingConfig;
  policies: PolicyConfig;
  cleanup: CleanupConfig;
}

export interface AgentConfig {
  discovery: DiscoveryConfig;
  health: HealthConfig;
  scaling: ScalingConfig;
  policies: PolicyConfig;
}

export interface MonitoringConfig {
  metrics: MetricsConfig;
  logging: LoggingConfig;
  alerting: AlertingConfig;
  tracing: TracingConfig;
}

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthConfig;
  encryption: EncryptionConfig;
  audit: AuditConfig;
}

export interface PerformanceConfig {
  optimization: OptimizationConfig;
  caching: CachingConfig;
  compression: CompressionConfig;
  connection: ConnectionConfig;
}

// Enums
export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

export enum SessionState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED = 'weighted',
  IP_HASH = 'ip_hash',
  LEAST_RESPONSE_TIME = 'least_response_time'
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  REGEX = 'regex'
}

export enum RuleCondition {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MERGE = 'merge',
  TRANSFORM = 'transform',
  VALIDATE = 'validate'
}

export enum CleanupStrategy {
  LRU = 'lru',
  TTL = 'ttl',
  SIZE = 'size',
  HYBRID = 'hybrid'
}

export enum AgentType {
  CHATBOT = 'chatbot',
  ANALYTICS = 'analytics',
  CONTENT_GENERATION = 'content_generation',
  RECOMMENDATION = 'recommendation',
  MONITORING = 'monitoring',
  AUTOMATION = 'automation'
}

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export enum TaskType {
  PREDICTION = 'prediction',
  ANALYSIS = 'analysis',
  GENERATION = 'generation',
  RECOMMENDATION = 'recommendation',
  MONITORING = 'monitoring',
  AUTOMATION = 'automation'
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum StepType {
  AGENT_TASK = 'agent_task',
  CONDITION = 'condition',
  DELAY = 'delay',
  TRANSFORM = 'transform',
  VALIDATE = 'validate'
}

export enum WorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated'
}

export enum TriggerType {
  SCHEDULE = 'schedule',
  EVENT = 'event',
  CONDITION = 'condition',
  MANUAL = 'manual'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

export enum ConditionLogic {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum PolicyActionType {
  ALLOW = 'allow',
  DENY = 'deny',
  RATE_LIMIT = 'rate_limit',
  THROTTLE = 'throttle',
  LOG = 'log',
  ALERT = 'alert'
}

export enum RoutingStrategy {
  DIRECT = 'direct',
  INTELLIGENT = 'intelligent',
  ADAPTIVE = 'adaptive',
  CONTEXT_AWARE = 'context_aware'
}

// Interfaces adicionales para configuración
export interface DeviceInfo {
  type: string;
  os: string;
  browser: string;
  screen: ScreenInfo;
}

export interface ScreenInfo {
  width: number;
  height: number;
  colorDepth: number;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: number;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface PrivacySettings {
  dataSharing: boolean;
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
}

export interface LoadBalancingConfig {
  algorithm: LoadBalancingStrategy;
  healthCheck: HealthCheck;
  failover: FailoverConfig;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: string;
}

export interface RateLimitingConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burstSize: number;
  windowMs: number;
}

export interface StorageConfig {
  type: 'memory' | 'redis' | 'database';
  connection: Record<string, any>;
  options: Record<string, any>;
}

export interface PolicyConfig {
  rules: PolicyRule[];
  actions: PolicyAction[];
  priority: number;
}

export interface DiscoveryConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
}

export interface HealthConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  threshold: number;
}

export interface ScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  exporters: string[];
}

export interface LoggingConfig {
  level: string;
  format: string;
  destination: string;
  rotation: boolean;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  rules: AlertRule[];
}

export interface TracingConfig {
  enabled: boolean;
  sampler: number;
  exporter: string;
}

export interface AuthConfig {
  enabled: boolean;
  method: string;
  options: Record<string, any>;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keySize: number;
}

export interface AuditConfig {
  enabled: boolean;
  events: string[];
  retention: number;
}

export interface OptimizationConfig {
  enabled: boolean;
  strategies: string[];
  targets: string[];
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: string;
  level: number;
}

export interface ConnectionConfig {
  poolSize: number;
  timeout: number;
  keepAlive: boolean;
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  duration: number;
  action: string;
} 