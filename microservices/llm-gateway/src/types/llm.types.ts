// Tipos para el LLM Gateway

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'custom';

export type ModelType = 'chat' | 'completion' | 'embedding' | 'image';

export interface LLMRequest {
  provider: LLMProvider;
  model: string;
  type: ModelType;
  prompt?: string;
  messages?: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  systemPrompt?: string;
  context?: any;
  metadata?: Record<string, any>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  id: string;
  provider: LLMProvider;
  model: string;
  type: ModelType;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    promptCost: number;
    completionCost: number;
    totalCost: number;
    currency: string;
  };
  metadata: {
    finishReason: string;
    modelResponse: any;
    timestamp: Date;
    requestId: string;
  };
}

export interface LLMError {
  code: string;
  message: string;
  provider: LLMProvider;
  model?: string;
  requestId?: string;
  timestamp: Date;
  details?: any;
}

export interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  models: string[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  pricing: {
    input: number; // cost per 1K tokens
    output: number; // cost per 1K tokens
    currency: string;
  };
  enabled: boolean;
  priority: number; // 1 = highest priority
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // number of entries
  strategy: 'exact' | 'semantic' | 'hybrid';
}

export interface CostTracking {
  requestId: string;
  provider: LLMProvider;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
    currency: string;
  };
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface RateLimitInfo {
  provider: LLMProvider;
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: Date;
}

export interface HealthCheck {
  provider: LLMProvider;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

export interface Metrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  providerUsage: Record<LLMProvider, {
    requests: number;
    tokens: number;
    cost: number;
    errors: number;
  }>;
  modelUsage: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

// Tipos específicos para cada proveedor

export interface OpenAIRequest extends LLMRequest {
  provider: 'openai';
  functions?: Array<{
    name: string;
    description?: string;
    parameters: any;
  }>;
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface AnthropicRequest extends LLMRequest {
  provider: 'anthropic';
  maxTokensToSample?: number;
  topK?: number;
  topP?: number;
  temperature?: number;
}

export interface GoogleRequest extends LLMRequest {
  provider: 'google';
  candidateCount?: number;
  stopSequences?: string[];
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

// Tipos para el sistema de caché

export interface CacheEntry {
  key: string;
  value: LLMResponse;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}

// Tipos para el sistema de fallback

export interface FallbackConfig {
  enabled: boolean;
  strategy: 'round-robin' | 'priority' | 'cost-optimized';
  maxRetries: number;
  retryDelay: number;
  providers: LLMProvider[];
}

export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  provider: LLMProvider;
  error: LLMError;
  nextRetryDelay: number;
} 