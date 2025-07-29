import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum ContentType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
  EXERCISE = 'exercise',
  SUMMARY = 'summary',
  EXPLANATION = 'explanation',
  TRANSCRIPT = 'transcript'
}

export enum AnalyticsType {
  PERFORMANCE = 'performance',
  ENGAGEMENT = 'engagement',
  PROGRESS = 'progress',
  PREDICTION = 'prediction',
  RECOMMENDATION = 'recommendation'
}

export enum PersonalizationType {
  CONTENT = 'content',
  DIFFICULTY = 'difficulty',
  PACE = 'pace',
  STYLE = 'style',
  RECOMMENDATION = 'recommendation'
}

export enum MLModelType {
  REGRESSION = 'regression',
  CLASSIFICATION = 'classification',
  CLUSTERING = 'clustering',
  NLP = 'nlp',
  RECOMMENDATION = 'recommendation'
}

export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  CSV = 'csv',
  XLSX = 'xlsx',
  IMAGE = 'image'
}

// ============================================================================
// CONTENT GENERATION SCHEMAS
// ============================================================================

export const ContentGenerationRequestSchema = z.object({
  type: z.nativeEnum(ContentType),
  topic: z.string().min(1).max(500),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.string().default('es'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  style: z.enum(['formal', 'casual', 'academic', 'conversational']).default('formal'),
  includeExamples: z.boolean().default(true),
  includeExercises: z.boolean().default(false),
  targetAudience: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  context: z.string().optional()
});

export const ContentGenerationResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.object({
    type: z.nativeEnum(ContentType),
    topic: z.string(),
    level: z.string(),
    language: z.string(),
    length: z.string(),
    wordCount: z.number(),
    estimatedReadingTime: z.number(),
    keywords: z.array(z.string()),
    generatedAt: z.string()
  }),
  examples: z.array(z.string()).optional(),
  exercises: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).optional(),
    answer: z.string().optional(),
    explanation: z.string().optional()
  })).optional()
});

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const AnalyticsRequestSchema = z.object({
  type: z.nativeEnum(AnalyticsType),
  userId: z.string().optional(),
  courseId: z.string().optional(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  metrics: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional()
});

export const PerformanceMetricsSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  score: z.number(),
  completionRate: z.number(),
  timeSpent: z.number(),
  attempts: z.number(),
  lastActivity: z.string(),
  progress: z.number()
});

export const EngagementMetricsSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  sessionDuration: z.number(),
  pageViews: z.number(),
  interactions: z.number(),
  returnRate: z.number(),
  satisfaction: z.number()
});

export const PredictionSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  prediction: z.string(),
  confidence: z.number(),
  factors: z.array(z.string()),
  recommendations: z.array(z.string())
});

export const AnalyticsResponseSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AnalyticsType),
  data: z.union([
    z.array(PerformanceMetricsSchema),
    z.array(EngagementMetricsSchema),
    z.array(PredictionSchema),
    z.record(z.any())
  ]),
  summary: z.object({
    totalRecords: z.number(),
    averageScore: z.number().optional(),
    trend: z.string().optional(),
    insights: z.array(z.string())
  }),
  generatedAt: z.string()
});

// ============================================================================
// PERSONALIZATION SCHEMAS
// ============================================================================

export const PersonalizationRequestSchema = z.object({
  type: z.nativeEnum(PersonalizationType),
  userId: z.string(),
  courseId: z.string().optional(),
  context: z.object({
    currentLevel: z.string().optional(),
    learningStyle: z.string().optional(),
    preferences: z.record(z.any()).optional(),
    history: z.array(z.any()).optional()
  }).optional(),
  content: z.any().optional()
});

export const ContentPersonalizationSchema = z.object({
  userId: z.string(),
  contentId: z.string(),
  adaptations: z.array(z.object({
    type: z.string(),
    description: z.string(),
    changes: z.record(z.any())
  })),
  difficulty: z.enum(['easier', 'same', 'harder']),
  estimatedTime: z.number(),
  recommendations: z.array(z.string())
});

export const RecommendationSchema = z.object({
  userId: z.string(),
  recommendations: z.array(z.object({
    type: z.string(),
    itemId: z.string(),
    score: z.number(),
    reason: z.string(),
    metadata: z.record(z.any()).optional()
  })),
  nextBestAction: z.string().optional()
});

export const PersonalizationResponseSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(PersonalizationType),
  userId: z.string(),
  result: z.union([
    ContentPersonalizationSchema,
    RecommendationSchema,
    z.record(z.any())
  ]),
  confidence: z.number(),
  generatedAt: z.string()
});

// ============================================================================
// ML PIPELINE SCHEMAS
// ============================================================================

export const MLModelConfigSchema = z.object({
  type: z.nativeEnum(MLModelType),
  name: z.string(),
  version: z.string(),
  parameters: z.record(z.any()),
  features: z.array(z.string()),
  target: z.string().optional(),
  hyperparameters: z.record(z.any()).optional()
});

export const TrainingRequestSchema = z.object({
  modelId: z.string(),
  dataset: z.object({
    source: z.string(),
    format: z.string(),
    features: z.array(z.string()),
    target: z.string().optional(),
    split: z.object({
      train: z.number(),
      validation: z.number(),
      test: z.number()
    }).default({ train: 0.7, validation: 0.15, test: 0.15 })
  }),
  config: MLModelConfigSchema,
  options: z.object({
    epochs: z.number().optional(),
    batchSize: z.number().optional(),
    learningRate: z.number().optional(),
    earlyStopping: z.boolean().optional(),
    crossValidation: z.boolean().optional()
  }).optional()
});

export const PredictionRequestSchema = z.object({
  modelId: z.string(),
  data: z.union([z.array(z.any()), z.record(z.any())]),
  options: z.object({
    returnProbabilities: z.boolean().optional(),
    returnFeatures: z.boolean().optional(),
    threshold: z.number().optional()
  }).optional()
});

export const ModelEvaluationSchema = z.object({
  modelId: z.string(),
  metrics: z.record(z.number()),
  confusionMatrix: z.array(z.array(z.number())).optional(),
  featureImportance: z.record(z.number()).optional(),
  predictions: z.array(z.any()).optional(),
  actual: z.array(z.any()).optional()
});

export const MLPipelineResponseSchema = z.object({
  id: z.string(),
  operation: z.enum(['training', 'prediction', 'evaluation', 'deployment']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.union([
    ModelEvaluationSchema,
    z.array(z.any()),
    z.record(z.any())
  ]).optional(),
  metadata: z.object({
    startTime: z.string(),
    endTime: z.string().optional(),
    duration: z.number().optional(),
    modelId: z.string().optional(),
    datasetSize: z.number().optional()
  }),
  error: z.string().optional()
});

// ============================================================================
// DOCUMENT PROCESSING SCHEMAS
// ============================================================================

export const DocumentProcessingRequestSchema = z.object({
  document: z.object({
    type: z.nativeEnum(DocumentType),
    content: z.string().optional(),
    file: z.any().optional(),
    url: z.string().url().optional()
  }),
  operations: z.array(z.enum([
    'extract_text',
    'extract_entities',
    'summarize',
    'classify',
    'sentiment_analysis',
    'keyword_extraction',
    'translation'
  ])),
  options: z.record(z.any()).optional()
});

export const DocumentProcessingResponseSchema = z.object({
  id: z.string(),
  originalDocument: z.object({
    type: z.nativeEnum(DocumentType),
    size: z.number(),
    pages: z.number().optional()
  }),
  results: z.record(z.any()),
  metadata: z.object({
    processingTime: z.number(),
    operations: z.array(z.string()),
    language: z.string().optional(),
    confidence: z.number().optional()
  }),
  processedAt: z.string()
});

// ============================================================================
// VECTOR STORE SCHEMAS
// ============================================================================

export const VectorSearchRequestSchema = z.object({
  query: z.string(),
  collection: z.string(),
  limit: z.number().min(1).max(100).default(10),
  filters: z.record(z.any()).optional(),
  similarity: z.enum(['cosine', 'euclidean', 'dot']).default('cosine')
});

export const VectorDocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.any()),
  embedding: z.array(z.number()).optional(),
  score: z.number().optional()
});

export const VectorSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(VectorDocumentSchema),
  total: z.number(),
  searchTime: z.number(),
  metadata: z.object({
    collection: z.string(),
    similarity: z.string(),
    filters: z.record(z.any()).optional()
  })
});

// ============================================================================
// QUEUE SCHEMAS
// ============================================================================

export const QueueJobSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.any()),
  priority: z.number().min(1).max(10).default(5),
  delay: z.number().optional(),
  attempts: z.number().default(3),
  timeout: z.number().optional()
});

export const QueueStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']),
  progress: z.number().min(0).max(100),
  result: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional()
});

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface AIServiceConfig {
  port: number;
  environment: string;
  logLevel: string;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  vectorStore: {
    type: 'chroma' | 'pgvector';
    url: string;
    apiKey?: string;
  };
  mlModels: {
    storage: string;
    defaultModels: string[];
  };
  queue: {
    redis: string;
    concurrency: number;
    retryAttempts: number;
  };
  llm: {
    gatewayUrl: string;
    apiKey: string;
  };
}

export interface ModelConfig {
  id: string;
  name: string;
  type: MLModelType;
  version: string;
  path: string;
  parameters: Record<string, any>;
  metadata: Record<string, any>;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface VectorStoreConfig {
  type: 'chroma' | 'pgvector';
  url: string;
  apiKey?: string;
  collections: string[];
  dimensions: number;
}

export interface QueueConfig {
  redis: string;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  jobTimeout: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface AIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ProcessingError {
  operation: string;
  error: string;
  context?: any;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface AIMetrics {
  requests: {
    total: number;
    byType: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  processing: {
    averageTime: number;
    successRate: number;
    errorRate: number;
  };
  models: {
    active: number;
    predictions: number;
    accuracy: Record<string, number>;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  queue: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ContentGenerationRequest = z.infer<typeof ContentGenerationRequestSchema>;
export type ContentGenerationResponse = z.infer<typeof ContentGenerationResponseSchema>;
export type AnalyticsRequest = z.infer<typeof AnalyticsRequestSchema>;
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
export type PersonalizationRequest = z.infer<typeof PersonalizationRequestSchema>;
export type PersonalizationResponse = z.infer<typeof PersonalizationResponseSchema>;
export type TrainingRequest = z.infer<typeof TrainingRequestSchema>;
export type PredictionRequest = z.infer<typeof PredictionRequestSchema>;
export type MLPipelineResponse = z.infer<typeof MLPipelineResponseSchema>;
export type DocumentProcessingRequest = z.infer<typeof DocumentProcessingRequestSchema>;
export type DocumentProcessingResponse = z.infer<typeof DocumentProcessingResponseSchema>;
export type VectorSearchRequest = z.infer<typeof VectorSearchRequestSchema>;
export type VectorSearchResponse = z.infer<typeof VectorSearchResponseSchema>;
export type QueueJob = z.infer<typeof QueueJobSchema>;
export type QueueStatus = z.infer<typeof QueueStatusSchema>;