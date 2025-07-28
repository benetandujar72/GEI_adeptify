// MCP Types
export interface MCPRequest {
  service: string;
  action: string;
  data: any;
  context?: any;
}

export interface MCPResponse {
  success: boolean;
  data: any;
  metadata?: {
    processingTime: number;
    tokensUsed?: number;
    model?: string;
  };
}

// Personalization Types
export interface UserPreferences {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pace: 'slow' | 'normal' | 'fast';
  interests: string[];
  goals: string[];
}

export interface ContentRecommendation {
  id: string;
  type: 'course' | 'resource' | 'video' | 'article';
  title: string;
  confidence: number;
  reason: string;
}

export interface LearningPath {
  userId: string;
  goals: string[];
  steps: any[];
  estimatedDuration: string;
  difficulty: string;
}

// ML Pipeline Types
export interface PipelineConfig {
  modelType: string;
  hyperparameters: Record<string, any>;
  trainingData: string;
  validationData: string;
}

export interface TrainingJob {
  id: string;
  config: PipelineConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  progress: number;
  result: any;
}

export interface ModelResult {
  modelId: string;
  prediction: any;
  confidence: number;
  timestamp: string;
}
