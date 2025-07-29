import { z } from 'zod';

// Enums
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google'
}

export enum ModelType {
  CHAT = 'chat',
  COMPLETION = 'completion',
  EMBEDDING = 'embedding',
  IMAGE = 'image'
}

export enum ResponseFormat {
  TEXT = 'text',
  JSON = 'json',
  STREAM = 'stream'
}

// Schemas de validación
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  name: z.string().optional(),
  function_call: z.object({
    name: z.string(),
    arguments: z.string()
  }).optional()
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  model: z.string(),
  provider: z.nativeEnum(LLMProvider).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  response_format: z.nativeEnum(ResponseFormat).optional(),
  stream: z.boolean().optional(),
  functions: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.any())
  })).optional(),
  function_call: z.union([
    z.literal('auto'),
    z.literal('none'),
    z.object({ name: z.string() })
  ]).optional(),
  user: z.string().optional(),
  cache: z.boolean().optional(),
  cost_tracking: z.boolean().optional()
});

export const CompletionRequestSchema = z.object({
  prompt: z.string(),
  model: z.string(),
  provider: z.nativeEnum(LLMProvider).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  stream: z.boolean().optional(),
  user: z.string().optional(),
  cache: z.boolean().optional(),
  cost_tracking: z.boolean().optional()
});

export const EmbeddingRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string(),
  provider: z.nativeEnum(LLMProvider).optional(),
  user: z.string().optional(),
  cache: z.boolean().optional(),
  cost_tracking: z.boolean().optional()
});

export const BatchRequestSchema = z.object({
  requests: z.array(z.union([
    ChatRequestSchema,
    CompletionRequestSchema,
    EmbeddingRequestSchema
  ])),
  parallel: z.boolean().optional(),
  cache: z.boolean().optional(),
  cost_tracking: z.boolean().optional()
});

// Tipos derivados
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type BatchRequest = z.infer<typeof BatchRequestSchema>;

// Tipos de respuesta
export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  provider: LLMProvider;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: {
    amount: number;
    currency: string;
    provider: LLMProvider;
  };
  cached: boolean;
  response_time: number;
}

export interface CompletionResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  provider: LLMProvider;
  choices: Array<{
    text: string;
    index: number;
    logprobs: any;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: {
    amount: number;
    currency: string;
    provider: LLMProvider;
  };
  cached: boolean;
  response_time: number;
}

export interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  provider: LLMProvider;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  cost: {
    amount: number;
    currency: string;
    provider: LLMProvider;
  };
  cached: boolean;
  response_time: number;
}

export interface BatchResponse {
  responses: Array<ChatResponse | CompletionResponse | EmbeddingResponse>;
  total_cost: {
    amount: number;
    currency: string;
  };
  total_tokens: number;
  response_time: number;
}

// Tipos de configuración
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

export interface ModelConfig {
  name: string;
  provider: LLMProvider;
  type: ModelType;
  maxTokens: number;
  costPerToken: {
    input: number;
    output: number;
  };
  supportedFeatures: string[];
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'ttl' | 'hybrid';
}

export interface CostTrackingConfig {
  enabled: boolean;
  currency: string;
  budget: {
    daily: number;
    monthly: number;
  };
  alerts: {
    threshold: number;
    email?: string;
  };
}

// Tipos de métricas
export interface LLMMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  requestsByProvider: Record<LLMProvider, number>;
  requestsByModel: Record<string, number>;
  costByProvider: Record<LLMProvider, number>;
  costByModel: Record<string, number>;
}

// Tipos de error
export interface LLMError extends Error {
  provider: LLMProvider;
  model?: string;
  code: string;
  statusCode: number;
  retryable: boolean;
  cost?: {
    amount: number;
    currency: string;
  };
}

// Tipos de eventos
export interface LLMEvent {
  type: 'request' | 'response' | 'error' | 'cache_hit' | 'cost_exceeded';
  timestamp: number;
  provider: LLMProvider;
  model: string;
  userId?: string;
  requestId: string;
  data: any;
}