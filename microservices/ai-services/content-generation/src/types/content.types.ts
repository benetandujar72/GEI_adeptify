export interface ContentGenerationRequest {
  type: 'lesson' | 'quiz' | 'assignment' | 'summary' | 'explanation' | 'custom';
  subject: string;
  grade: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  format: 'text' | 'markdown' | 'html' | 'pdf' | 'json';
  length: 'short' | 'medium' | 'long';
  style: 'formal' | 'casual' | 'academic' | 'conversational';
  includeExamples: boolean;
  includeExercises: boolean;
  includeImages: boolean;
  customPrompt?: string;
  metadata?: Record<string, any>;
}

export interface ContentGenerationResponse {
  id: string;
  content: string;
  title: string;
  summary: string;
  keywords: string[];
  estimatedReadingTime: number;
  difficulty: string;
  grade: string;
  subject: string;
  topic: string;
  format: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface QuizGenerationRequest {
  subject: string;
  topic: string;
  grade: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: ('multiple-choice' | 'true-false' | 'short-answer' | 'essay')[];
  numberOfQuestions: number;
  language: string;
  includeExplanations: boolean;
  timeLimit?: number;
  customPrompt?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  difficulty: string;
}

export interface QuizGenerationResponse {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  grade: string;
  difficulty: string;
  questions: QuizQuestion[];
  totalPoints: number;
  estimatedTime: number;
  instructions: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AssignmentGenerationRequest {
  subject: string;
  topic: string;
  grade: string;
  type: 'homework' | 'project' | 'research' | 'presentation' | 'lab';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: 'short' | 'medium' | 'long';
  groupSize?: number;
  includeRubric: boolean;
  includeResources: boolean;
  language: string;
  customPrompt?: string;
}

export interface AssignmentGenerationResponse {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  instructions: string;
  requirements: string[];
  rubric?: RubricCriteria[];
  resources?: string[];
  estimatedDuration: number;
  groupSize?: number;
  subject: string;
  topic: string;
  grade: string;
  difficulty: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface RubricCriteria {
  criterion: string;
  excellent: string;
  good: string;
  fair: string;
  poor: string;
  points: number;
}

export interface SummaryGenerationRequest {
  content: string;
  type: 'text' | 'document' | 'url';
  format: 'bullet-points' | 'paragraph' | 'key-points';
  length: 'short' | 'medium' | 'long';
  language: string;
  includeKeyPoints: boolean;
  includeQuestions: boolean;
  customPrompt?: string;
}

export interface SummaryGenerationResponse {
  id: string;
  originalContent: string;
  summary: string;
  keyPoints: string[];
  questions?: string[];
  wordCount: number;
  readingTime: number;
  format: string;
  language: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ExplanationGenerationRequest {
  concept: string;
  subject: string;
  grade: string;
  style: 'simple' | 'detailed' | 'step-by-step' | 'visual';
  includeExamples: boolean;
  includeAnalogies: boolean;
  includeVisualAids: boolean;
  language: string;
  customPrompt?: string;
}

export interface ExplanationGenerationResponse {
  id: string;
  concept: string;
  explanation: string;
  examples: string[];
  analogies?: string[];
  visualAids?: string[];
  relatedConcepts: string[];
  difficulty: string;
  grade: string;
  subject: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  template: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentGenerationJob {
  id: string;
  userId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request: ContentGenerationRequest | QuizGenerationRequest | AssignmentGenerationRequest | SummaryGenerationRequest | ExplanationGenerationRequest;
  response?: ContentGenerationResponse | QuizGenerationResponse | AssignmentGenerationResponse | SummaryGenerationResponse | ExplanationGenerationResponse;
  error?: string;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentGenerationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  requestsByType: Record<string, number>;
  requestsBySubject: Record<string, number>;
  requestsByGrade: Record<string, number>;
  popularTopics: string[];
  errorRate: number;
  lastUpdated: string;
}

export interface ContentQualityCheck {
  id: string;
  contentId: string;
  readabilityScore: number;
  grammarScore: number;
  relevanceScore: number;
  accuracyScore: number;
  suggestions: string[];
  overallScore: number;
  checkedAt: string;
}

export interface ContentTranslationRequest {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting: boolean;
  includeGlossary: boolean;
  customInstructions?: string;
}

export interface ContentTranslationResponse {
  id: string;
  originalContent: string;
  translatedContent: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ContentAdaptationRequest {
  content: string;
  targetAudience: string;
  adaptationType: 'simplify' | 'expand' | 'localize' | 'personalize';
  parameters: Record<string, any>;
  preserveOriginal: boolean;
  customInstructions?: string;
}

export interface ContentAdaptationResponse {
  id: string;
  originalContent: string;
  adaptedContent: string;
  adaptationType: string;
  changes: string[];
  confidence: number;
  metadata: Record<string, any>;
  createdAt: string;
}

// Enums
export enum ContentType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  SUMMARY = 'summary',
  EXPLANATION = 'explanation',
  CUSTOM = 'custom'
}

export enum ContentFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  JSON = 'json'
}

export enum ContentDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum ContentLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long'
}

export enum ContentStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  ACADEMIC = 'academic',
  CONVERSATIONAL = 'conversational'
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
} 