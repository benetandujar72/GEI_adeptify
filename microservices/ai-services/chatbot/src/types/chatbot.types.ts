export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
  attachments?: ChatAttachment[];
  context?: ChatContext;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface ChatContext {
  courseId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  educationalLevel?: 'primary' | 'secondary' | 'university' | 'adult';
  learningObjectives?: string[];
  previousMessages?: ChatMessage[];
  userPreferences?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  context?: ChatContext;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  sessionId: string;
  userId: string;
  message: string;
  context?: ChatContext;
  attachments?: ChatAttachment[];
  options?: ChatOptions;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  id: string;
  sessionId: string;
  message: string;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  tokensUsed: number;
  cost: number;
  suggestions?: string[];
  followUpQuestions?: string[];
  educationalInsights?: EducationalInsight[];
  metadata?: Record<string, any>;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'markdown' | 'html';
  includeContext?: boolean;
  includeSuggestions?: boolean;
  includeFollowUp?: boolean;
  includeInsights?: boolean;
  language?: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  educationalLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface EducationalInsight {
  type: 'concept' | 'misconception' | 'suggestion' | 'resource' | 'practice';
  title: string;
  description: string;
  relevance: number;
  resources?: string[];
  relatedTopics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ChatbotPersonality {
  id: string;
  name: string;
  description: string;
  role: 'tutor' | 'mentor' | 'assistant' | 'expert';
  subject?: string;
  tone: 'formal' | 'casual' | 'friendly' | 'professional';
  expertise: string[];
  language: string;
  educationalLevel: 'primary' | 'secondary' | 'university' | 'adult';
  systemPrompt: string;
  metadata?: Record<string, any>;
}

export interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  steps: ConversationStep[];
  triggers: string[];
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConversationStep {
  id: string;
  order: number;
  type: 'question' | 'explanation' | 'exercise' | 'assessment' | 'feedback';
  content: string;
  options?: string[];
  expectedResponse?: string;
  nextStep?: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ChatbotMetrics {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageSessionLength: number;
  averageResponseTime: number;
  userSatisfaction: number;
  commonTopics: Record<string, number>;
  popularPersonalities: Record<string, number>;
  errorRate: number;
  costPerSession: number;
  lastUpdated: string;
}

export interface ChatbotConfiguration {
  defaultModel: string;
  fallbackModel: string;
  maxTokensPerResponse: number;
  maxSessionLength: number;
  sessionTimeout: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
  };
  monitoring: {
    enabled: boolean;
    logLevel: string;
  };
  personalities: ChatbotPersonality[];
  flows: ConversationFlow[];
}

export interface ChatbotHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number;
  };
  connections: {
    active: number;
    total: number;
  };
  models: {
    available: string[];
    active: string;
    status: 'online' | 'offline' | 'error';
  };
  lastCheck: string;
}

export interface ChatbotError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

export interface ChatbotAnalytics {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  messageCount: number;
  topics: string[];
  satisfaction?: number;
  completionRate?: number;
  learningOutcomes?: string[];
  metadata?: Record<string, any>;
}

export interface ChatbotFeedback {
  id: string;
  sessionId: string;
  userId: string;
  rating: number;
  comment?: string;
  category: 'helpful' | 'unhelpful' | 'confusing' | 'technical' | 'other';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatbotIntegration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'websocket' | 'sdk';
  endpoint: string;
  authentication: {
    type: 'api_key' | 'oauth' | 'jwt' | 'none';
    credentials?: Record<string, any>;
  };
  events: string[];
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
  metadata?: Record<string, any>;
}

// Enums
export enum ChatStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum AttachmentType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum PersonalityRole {
  TUTOR = 'tutor',
  MENTOR = 'mentor',
  ASSISTANT = 'assistant',
  EXPERT = 'expert'
}

export enum ConversationStepType {
  QUESTION = 'question',
  EXPLANATION = 'explanation',
  EXERCISE = 'exercise',
  ASSESSMENT = 'assessment',
  FEEDBACK = 'feedback'
}

export enum EducationalLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  UNIVERSITY = 'university',
  ADULT = 'adult'
}

export enum InsightType {
  CONCEPT = 'concept',
  MISCONCEPTION = 'misconception',
  SUGGESTION = 'suggestion',
  RESOURCE = 'resource',
  PRACTICE = 'practice'
}

export enum FeedbackCategory {
  HELPFUL = 'helpful',
  UNHELPFUL = 'unhelpful',
  CONFUSING = 'confusing',
  TECHNICAL = 'technical',
  OTHER = 'other'
} 