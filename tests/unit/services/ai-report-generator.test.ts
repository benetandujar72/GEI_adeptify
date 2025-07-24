import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIReportGeneratorService } from '../../../server/services/ai-report-generator.js';
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

describe('AIReportGeneratorService', () => {
  let reportService: AIReportGeneratorService;

  beforeEach(() => {
    reportService = new AIReportGeneratorService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid configuration', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const result = await reportService.initialize();
      
      expect(result).toBe(true);
      expect(reportService.isInitialized).toBe(true);
    });

    it('should throw error when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      
      await expect(reportService.initialize()).rejects.toThrow(
        'OpenAI API key is required'
      );
    });
  });

  describe('generateReport', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate a comprehensive report successfully', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Academic Performance Report',
              summary: 'Overall improvement in student performance',
              sections: [
                {
                  title: 'Executive Summary',
                  content: 'Students showing positive trends',
                  type: 'summary'
                },
                {
                  title: 'Performance Analysis',
                  content: 'Detailed analysis of grades and attendance',
                  type: 'analysis'
                }
              ],
              insights: ['Improved attendance', 'Better study habits'],
              recommendations: ['Continue current strategies', 'Focus on weak areas'],
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

      const reportData = {
        type: 'academic_performance',
        timeframe: 'last_semester',
        filters: { grade: '10th', subject: 'math' },
        includeCharts: true,
        includePredictions: true
      };

      const report = await reportService.generateReport(reportData);

      expect(report).toBeDefined();
      expect(report.title).toBe('Academic Performance Report');
      expect(report.summary).toBeDefined();
      expect(report.sections).toBeDefined();
      expect(Array.isArray(report.sections)).toBe(true);
      expect(report.insights).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.confidence).toBe(0.88);
    });

    it('should handle invalid report type', async () => {
      const reportData = {
        type: 'invalid_type',
        timeframe: 'last_semester'
      };

      await expect(
        reportService.generateReport(reportData)
      ).rejects.toThrow('Invalid report type');
    });
  });

  describe('generateTrendAnalysis', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate trend analysis report', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Trend Analysis Report',
              trends: [
                {
                  metric: 'grades',
                  direction: 'increasing',
                  change: '+5%',
                  confidence: 0.85
                },
                {
                  metric: 'attendance',
                  direction: 'stable',
                  change: '0%',
                  confidence: 0.92
                }
              ],
              insights: 'Overall positive trend in academic performance',
              recommendations: ['Maintain current strategies']
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

      const trendData = {
        metrics: ['grades', 'attendance', 'behavior'],
        timeframe: 'last_year',
        granularity: 'monthly'
      };

      const analysis = await reportService.generateTrendAnalysis(trendData);

      expect(analysis).toBeDefined();
      expect(analysis.title).toBe('Trend Analysis Report');
      expect(analysis.trends).toBeDefined();
      expect(Array.isArray(analysis.trends)).toBe(true);
      expect(analysis.insights).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });
  });

  describe('generateComparativeReport', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate comparative report between groups', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Comparative Analysis Report',
              comparisons: [
                {
                  metric: 'average_grade',
                  groupA: { name: 'Class A', value: 85 },
                  groupB: { name: 'Class B', value: 82 },
                  difference: '+3',
                  significance: 'high'
                }
              ],
              insights: 'Class A performs better in most metrics',
              recommendations: ['Share best practices from Class A']
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

      const comparativeData = {
        groupA: { name: 'Class A', filters: { grade: '10th', section: 'A' } },
        groupB: { name: 'Class B', filters: { grade: '10th', section: 'B' } },
        metrics: ['average_grade', 'attendance_rate', 'behavior_score']
      };

      const report = await reportService.generateComparativeReport(comparativeData);

      expect(report).toBeDefined();
      expect(report.title).toBe('Comparative Analysis Report');
      expect(report.comparisons).toBeDefined();
      expect(Array.isArray(report.comparisons)).toBe(true);
      expect(report.insights).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('generatePredictiveReport', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate predictive report with future projections', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Predictive Analysis Report',
              predictions: [
                {
                  metric: 'graduation_rate',
                  current: 85,
                  predicted: 88,
                  confidence: 0.82,
                  timeframe: 'next_year'
                },
                {
                  metric: 'college_acceptance',
                  current: 75,
                  predicted: 78,
                  confidence: 0.79,
                  timeframe: 'next_year'
                }
              ],
              riskFactors: ['Declining attendance in some students'],
              opportunities: ['Improved study programs'],
              recommendations: ['Implement intervention programs']
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

      const predictiveData = {
        metrics: ['graduation_rate', 'college_acceptance'],
        timeframe: 'next_year',
        includeRiskAnalysis: true
      };

      const report = await reportService.generatePredictiveReport(predictiveData);

      expect(report).toBeDefined();
      expect(report.title).toBe('Predictive Analysis Report');
      expect(report.predictions).toBeDefined();
      expect(Array.isArray(report.predictions)).toBe(true);
      expect(report.riskFactors).toBeDefined();
      expect(report.opportunities).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('getReportTemplates', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should return available report templates', async () => {
      const templates = await reportService.getReportTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('requiredFields');
      });
    });
  });

  describe('generateReportContent', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate report content with AI insights', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Generated Report Title',
              summary: 'AI-generated summary',
              sections: [
                {
                  title: 'Section 1',
                  content: 'Section content',
                  type: 'analysis'
                }
              ]
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

      const reportData = {
        type: 'academic_performance',
        data: { grades: [85, 88, 92], attendance: [95, 98, 92] }
      };

      const content = await reportService['generateReportContent'](reportData);

      expect(content).toBeDefined();
      expect(content.title).toBeDefined();
      expect(content.summary).toBeDefined();
      expect(content.sections).toBeDefined();
      expect(Array.isArray(content.sections)).toBe(true);
    });
  });

  describe('generateAIInsights', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate AI insights from data', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              'Students showing improvement in math',
              'Attendance rates are stable',
              'Need for additional support in science'
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

      const data = {
        grades: [85, 88, 92, 90],
        attendance: [95, 98, 92, 96],
        subjects: ['math', 'science', 'english']
      };

      const insights = await reportService['generateAIInsights'](data);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.every(insight => typeof insight === 'string')).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate actionable recommendations', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                category: 'academic',
                recommendation: 'Implement tutoring program',
                priority: 'high',
                impact: 'medium'
              },
              {
                category: 'attendance',
                recommendation: 'Improve engagement strategies',
                priority: 'medium',
                impact: 'high'
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

      const data = {
        grades: [75, 78, 82, 80],
        attendance: [85, 88, 82, 86],
        issues: ['low_engagement', 'academic_struggle']
      };

      const recommendations = await reportService['generateRecommendations'](data);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('category');
      expect(recommendations[0]).toHaveProperty('recommendation');
      expect(recommendations[0]).toHaveProperty('priority');
      expect(recommendations[0]).toHaveProperty('impact');
    });
  });

  describe('calculateConfidence', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should calculate confidence score based on data quality', async () => {
      const highQualityData = {
        grades: [85, 88, 92, 90, 87, 89, 91, 88],
        attendance: [95, 98, 92, 96, 94, 97, 93, 95],
        behavior: [90, 88, 92, 94, 91, 89, 93, 92]
      };

      const confidence = await reportService['calculateConfidence'](highQualityData);

      expect(confidence).toBeDefined();
      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return lower confidence for poor quality data', async () => {
      const poorQualityData = {
        grades: [85],
        attendance: [95],
        behavior: [90]
      };

      const confidence = await reportService['calculateConfidence'](poorQualityData);

      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe('generateCacheKey', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await reportService.initialize();
    });

    it('should generate consistent cache keys', async () => {
      const reportData1 = {
        type: 'academic_performance',
        timeframe: 'last_semester',
        filters: { grade: '10th' }
      };

      const reportData2 = {
        type: 'academic_performance',
        timeframe: 'last_semester',
        filters: { grade: '10th' }
      };

      const key1 = await reportService['generateCacheKey'](reportData1);
      const key2 = await reportService['generateCacheKey'](reportData2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different data', async () => {
      const reportData1 = {
        type: 'academic_performance',
        timeframe: 'last_semester'
      };

      const reportData2 = {
        type: 'academic_performance',
        timeframe: 'last_year'
      };

      const key1 = await reportService['generateCacheKey'](reportData1);
      const key2 = await reportService['generateCacheKey'](reportData2);

      expect(key1).not.toBe(key2);
    });
  });
}); 