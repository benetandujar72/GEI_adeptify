import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIAnalyticsService } from '../../../server/services/ai-analytics-service.js';
import { cacheService } from '../../../server/services/cache-service.js';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

// Mock cache service
vi.mock('../../../server/services/cache-service.js', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    clear: vi.fn()
  }
}));

describe('AIAnalyticsService', () => {
  let analyticsService: AIAnalyticsService;

  beforeEach(() => {
    analyticsService = new AIAnalyticsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid configuration', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const result = await analyticsService.initialize();
      
      expect(result).toBe(true);
      expect(analyticsService.isInitialized).toBe(true);
    });

    it('should throw error when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      
      await expect(analyticsService.initialize()).rejects.toThrow(
        'OpenAI API key is required'
      );
    });
  });

  describe('predictStudentPerformance', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should predict student performance successfully', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              prediction: 'high',
              confidence: 0.85,
              reasoning: 'Student shows consistent improvement',
              recommendations: ['Continue current study habits', 'Focus on weak areas']
            })
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const predictionData = {
        studentId: 'student123',
        academicData: {
          grades: [85, 88, 92, 90],
          attendance: [95, 98, 92, 96],
          behavior: [90, 88, 92, 94]
        },
        timeframe: 'next_semester'
      };

      const result = await analyticsService.predictStudentPerformance(predictionData);

      expect(result).toBeDefined();
      expect(result.prediction).toBe('high');
      expect(result.confidence).toBe(0.85);
      expect(result.reasoning).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle invalid student data', async () => {
      const predictionData = {
        studentId: 'invalid-student',
        academicData: {
          grades: [],
          attendance: [],
          behavior: []
        },
        timeframe: 'next_semester'
      };

      await expect(
        analyticsService.predictStudentPerformance(predictionData)
      ).rejects.toThrow('Insufficient data for prediction');
    });
  });

  describe('predictBatchPerformance', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should predict performance for multiple students', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                studentId: 'student1',
                prediction: 'high',
                confidence: 0.85
              },
              {
                studentId: 'student2',
                prediction: 'medium',
                confidence: 0.72
              }
            ])
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const batchData = [
        {
          studentId: 'student1',
          academicData: { grades: [85, 88, 92], attendance: [95, 98, 92] }
        },
        {
          studentId: 'student2',
          academicData: { grades: [75, 78, 82], attendance: [85, 88, 82] }
        }
      ];

      const results = await analyticsService.predictBatchPerformance(batchData);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].studentId).toBe('student1');
      expect(results[1].studentId).toBe('student2');
    });

    it('should handle empty batch data', async () => {
      const results = await analyticsService.predictBatchPerformance([]);
      expect(results).toEqual([]);
    });
  });

  describe('detectPatterns', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should detect patterns in academic data', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              patterns: [
                {
                  type: 'grade_decline',
                  description: 'Grades declining over time',
                  severity: 'medium',
                  affectedStudents: ['student1', 'student2']
                }
              ],
              insights: 'Students showing consistent decline in performance'
            })
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const patternData = {
        dataset: 'class_performance',
        timeframe: 'last_semester',
        filters: { grade: '10th' }
      };

      const result = await analyticsService.detectPatterns(patternData);

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(result.insights).toBeDefined();
    });
  });

  describe('generateEarlyWarnings', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should generate early warnings for at-risk students', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                studentId: 'student1',
                warning: 'Declining attendance',
                severity: 'high',
                action: 'Contact parents'
              }
            ])
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const warnings = await analyticsService.generateEarlyWarnings();

      expect(warnings).toBeDefined();
      expect(Array.isArray(warnings)).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toHaveProperty('studentId');
      expect(warnings[0]).toHaveProperty('warning');
      expect(warnings[0]).toHaveProperty('severity');
    });
  });

  describe('generatePersonalizedRecommendations', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should generate personalized recommendations for a student', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendations: [
                {
                  category: 'study_habits',
                  suggestion: 'Study in shorter, focused sessions',
                  priority: 'high'
                },
                {
                  category: 'time_management',
                  suggestion: 'Create a daily study schedule',
                  priority: 'medium'
                }
              ],
              reasoning: 'Based on current performance patterns'
            })
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const recommendations = await analyticsService.generatePersonalizedRecommendations('student123');

      expect(recommendations).toBeDefined();
      expect(recommendations.recommendations).toBeDefined();
      expect(Array.isArray(recommendations.recommendations)).toBe(true);
      expect(recommendations.reasoning).toBeDefined();
    });

    it('should handle student not found', async () => {
      await expect(
        analyticsService.generatePersonalizedRecommendations('invalid-student')
      ).rejects.toThrow('Student not found');
    });
  });

  describe('getAnalyticsInsights', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should return overall analytics insights', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              overallPerformance: 'improving',
              keyTrends: ['Grade improvement', 'Better attendance'],
              recommendations: ['Continue current strategies'],
              confidence: 0.88
            })
          }
        }]
      });
      
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }));

      const insights = await analyticsService.getAnalyticsInsights();

      expect(insights).toBeDefined();
      expect(insights.overallPerformance).toBeDefined();
      expect(insights.keyTrends).toBeDefined();
      expect(Array.isArray(insights.keyTrends)).toBe(true);
      expect(insights.recommendations).toBeDefined();
      expect(insights.confidence).toBeDefined();
    });
  });

  describe('getPredictionAccuracy', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should return prediction accuracy metrics', async () => {
      const accuracy = await analyticsService.getPredictionAccuracy();

      expect(accuracy).toBeDefined();
      expect(accuracy.overallAccuracy).toBeDefined();
      expect(typeof accuracy.overallAccuracy).toBe('number');
      expect(accuracy.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy.overallAccuracy).toBeLessThanOrEqual(1);
      expect(accuracy.totalPredictions).toBeDefined();
      expect(accuracy.correctPredictions).toBeDefined();
    });
  });

  describe('analyzeAttendanceTrends', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should analyze attendance trends correctly', async () => {
      const attendanceData = [
        { studentId: 'student1', attendance: [95, 98, 92, 96] },
        { studentId: 'student2', attendance: [85, 88, 82, 86] }
      ];

      const trends = await analyticsService['analyzeAttendanceTrends'](attendanceData);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeGradeTrends', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should analyze grade trends correctly', async () => {
      const gradeData = [
        { studentId: 'student1', grades: [85, 88, 92, 90] },
        { studentId: 'student2', grades: [75, 78, 82, 80] }
      ];

      const trends = await analyticsService['analyzeGradeTrends'](gradeData);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeBehaviorTrends', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await analyticsService.initialize();
    });

    it('should analyze behavior trends correctly', async () => {
      const behaviorData = [
        { studentId: 'student1', behavior: [90, 88, 92, 94] },
        { studentId: 'student2', behavior: [80, 78, 82, 84] }
      ];

      const trends = await analyticsService['analyzeBehaviorTrends'](behaviorData);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
    });
  });
}); 