export interface StudentPerformancePrediction {
  studentId: string;
  courseId: string;
  predictedGrade: number;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
  predictedCompletionDate?: string;
  successProbability: number;
  metadata: Record<string, any>;
}

export interface CourseSuccessPrediction {
  courseId: string;
  predictedSuccessRate: number;
  predictedDropoutRate: number;
  averagePredictedGrade: number;
  riskFactors: string[];
  recommendations: string[];
  studentSegmentations: StudentSegmentation[];
  metadata: Record<string, any>;
}

export interface StudentSegmentation {
  segmentId: string;
  segmentName: string;
  criteria: string[];
  studentCount: number;
  averagePerformance: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface LearningPathRecommendation {
  studentId: string;
  currentLevel: string;
  recommendedPath: LearningStep[];
  estimatedDuration: number;
  successProbability: number;
  prerequisites: string[];
  alternatives: string[];
  metadata: Record<string, any>;
}

export interface LearningStep {
  stepId: string;
  title: string;
  description: string;
  type: 'course' | 'module' | 'assessment' | 'practice';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  prerequisites: string[];
  resources: string[];
  order: number;
}

export interface EarlyWarningSystem {
  studentId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  interventions: Intervention[];
  lastUpdated: string;
  nextReviewDate: string;
  metadata: Record<string, any>;
}

export interface RiskFactor {
  factorId: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  weight: number;
  evidence: string[];
  recommendations: string[];
}

export interface Intervention {
  interventionId: string;
  type: 'academic' | 'behavioral' | 'social' | 'technical';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  outcome?: string;
}

export interface PredictiveModel {
  modelId: string;
  name: string;
  type: 'regression' | 'classification' | 'clustering' | 'time-series';
  target: string;
  features: string[];
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrained: string;
  nextTrainingDate: string;
  status: 'active' | 'training' | 'inactive' | 'error';
  metadata: Record<string, any>;
}

export interface ModelTrainingRequest {
  modelType: 'performance' | 'dropout' | 'engagement' | 'completion';
  targetVariable: string;
  features: string[];
  trainingData: {
    startDate: string;
    endDate: string;
    filters?: Record<string, any>;
  };
  hyperparameters?: Record<string, any>;
  validationSplit: number;
  crossValidation: boolean;
  metadata?: Record<string, any>;
}

export interface ModelTrainingResponse {
  modelId: string;
  status: 'training' | 'completed' | 'failed';
  progress: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  trainingTime?: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface DataAnalysisRequest {
  analysisType: 'descriptive' | 'correlation' | 'trend' | 'comparison';
  variables: string[];
  filters?: Record<string, any>;
  timeRange?: {
    startDate: string;
    endDate: string;
  };
  groupBy?: string[];
  aggregations?: string[];
  metadata?: Record<string, any>;
}

export interface DataAnalysisResponse {
  analysisId: string;
  type: string;
  results: AnalysisResult[];
  insights: string[];
  recommendations: string[];
  visualizations: Visualization[];
  metadata: Record<string, any>;
}

export interface AnalysisResult {
  metric: string;
  value: number | string;
  unit?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  significance?: 'high' | 'medium' | 'low';
  confidence?: number;
}

export interface Visualization {
  type: 'chart' | 'table' | 'heatmap' | 'scatter';
  title: string;
  data: any[];
  config: Record<string, any>;
}

export interface EngagementAnalysis {
  studentId: string;
  engagementScore: number;
  factors: EngagementFactor[];
  trends: EngagementTrend[];
  recommendations: string[];
  metadata: Record<string, any>;
}

export interface EngagementFactor {
  factor: string;
  weight: number;
  currentValue: number;
  targetValue: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface EngagementTrend {
  period: string;
  score: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface PredictiveAnalyticsMetrics {
  totalPredictions: number;
  accuratePredictions: number;
  averageAccuracy: number;
  modelsActive: number;
  predictionsByType: Record<string, number>;
  predictionsByModel: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: string;
}

export interface BatchPredictionRequest {
  predictionType: 'performance' | 'dropout' | 'engagement' | 'completion';
  studentIds: string[];
  courseIds?: string[];
  parameters?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface BatchPredictionResponse {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  results?: any[];
  error?: string;
  estimatedCompletion?: string;
  metadata: Record<string, any>;
}

export interface RealTimePredictionRequest {
  predictionType: 'performance' | 'dropout' | 'engagement' | 'completion';
  studentId: string;
  courseId?: string;
  currentData: Record<string, any>;
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RealTimePredictionResponse {
  predictionId: string;
  type: string;
  result: any;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  metadata: Record<string, any>;
}

// Enums
export enum PredictionType {
  PERFORMANCE = 'performance',
  DROPOUT = 'dropout',
  ENGAGEMENT = 'engagement',
  COMPLETION = 'completion'
}

export enum ModelType {
  REGRESSION = 'regression',
  CLASSIFICATION = 'classification',
  CLUSTERING = 'clustering',
  TIME_SERIES = 'time-series'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InterventionType {
  ACADEMIC = 'academic',
  BEHAVIORAL = 'behavioral',
  SOCIAL = 'social',
  TECHNICAL = 'technical'
}

export enum AnalysisType {
  DESCRIPTIVE = 'descriptive',
  CORRELATION = 'correlation',
  TREND = 'trend',
  COMPARISON = 'comparison'
}

export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
} 