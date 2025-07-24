import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupRoutes } from '../../../server/routes/index.js';
import { aiChatbotService } from '../../../server/services/ai-chatbot-service.js';
import { aiAnalyticsService } from '../../../server/services/ai-analytics-service.js';
import { aiReportGeneratorService } from '../../../server/services/ai-report-generator.js';

// Mock services
vi.mock('../../../server/services/ai-chatbot-service.js', () => ({
  aiChatbotService: {
    initialize: vi.fn(),
    createChatSession: vi.fn(),
    sendMessage: vi.fn(),
    getChatHistory: vi.fn(),
    getChatSessions: vi.fn(),
    deleteChatSession: vi.fn(),
    getChatStats: vi.fn()
  }
}));

vi.mock('../../../server/services/ai-analytics-service.js', () => ({
  aiAnalyticsService: {
    initialize: vi.fn(),
    predictStudentPerformance: vi.fn(),
    predictBatchPerformance: vi.fn(),
    detectPatterns: vi.fn(),
    generateEarlyWarnings: vi.fn(),
    generatePersonalizedRecommendations: vi.fn(),
    getAnalyticsInsights: vi.fn(),
    getPredictionAccuracy: vi.fn()
  }
}));

vi.mock('../../../server/services/ai-report-generator.js', () => ({
  aiReportGeneratorService: {
    initialize: vi.fn(),
    generateReport: vi.fn(),
    generateTrendAnalysis: vi.fn(),
    generateComparativeReport: vi.fn(),
    generatePredictiveReport: vi.fn(),
    getReportTemplates: vi.fn()
  }
}));

// Mock middleware
vi.mock('../../../server/middleware/auth.js', () => ({
  isAuthenticated: vi.fn((req, res, next) => next()),
  auditMiddleware: vi.fn((req, res, next) => next())
}));

describe('AI Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Setup routes
    const router = setupRoutes();
    app.use('/api', router);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Chatbot Routes', () => {
    describe('POST /api/ai/chat/sessions', () => {
      it('should create a new chat session', async () => {
        const mockSession = {
          sessionId: 'session123',
          userId: 'user123',
          context: 'educational',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        (aiChatbotService.createChatSession as any).mockResolvedValue(mockSession);

        const response = await request(app)
          .post('/api/ai/chat/sessions')
          .send({
            userId: 'user123',
            context: 'educational',
            metadata: { subject: 'math' }
          })
          .expect(201);

        expect(response.body).toEqual({
          success: true,
          data: mockSession
        });
        expect(aiChatbotService.createChatSession).toHaveBeenCalledWith({
          userId: 'user123',
          context: 'educational',
          metadata: { subject: 'math' }
        });
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/ai/chat/sessions')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('userId');
      });
    });

    describe('POST /api/ai/chat/messages', () => {
      it('should send a message and get AI response', async () => {
        const mockResponse = {
          content: 'Hello! How can I help you?',
          role: 'assistant',
          sentiment: { label: 'positive', score: 0.8 },
          topics: ['education', 'help'],
          suggestions: ['Ask about math', 'Ask about science']
        };

        (aiChatbotService.sendMessage as any).mockResolvedValue(mockResponse);

        const response = await request(app)
          .post('/api/ai/chat/messages')
          .send({
            sessionId: 'session123',
            content: 'Hello, I need help with math',
            role: 'user'
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockResponse
        });
      });

      it('should handle session not found', async () => {
        (aiChatbotService.sendMessage as any).mockRejectedValue(
          new Error('Chat session not found')
        );

        const response = await request(app)
          .post('/api/ai/chat/messages')
          .send({
            sessionId: 'invalid-session',
            content: 'Hello',
            role: 'user'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Chat session not found');
      });
    });

    describe('GET /api/ai/chat/sessions/:userId', () => {
      it('should return chat sessions for a user', async () => {
        const mockSessions = [
          { sessionId: 'session1', userId: 'user123' },
          { sessionId: 'session2', userId: 'user123' }
        ];

        (aiChatbotService.getChatSessions as any).mockResolvedValue(mockSessions);

        const response = await request(app)
          .get('/api/ai/chat/sessions/user123')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockSessions
        });
      });
    });

    describe('DELETE /api/ai/chat/sessions/:sessionId', () => {
      it('should delete a chat session', async () => {
        (aiChatbotService.deleteChatSession as any).mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/ai/chat/sessions/session123')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Chat session deleted successfully'
        });
      });
    });
  });

  describe('Analytics Routes', () => {
    describe('POST /api/ai/analytics/predict', () => {
      it('should predict student performance', async () => {
        const mockPrediction = {
          prediction: 'high',
          confidence: 0.85,
          reasoning: 'Student shows consistent improvement',
          recommendations: ['Continue current study habits']
        };

        (aiAnalyticsService.predictStudentPerformance as any).mockResolvedValue(mockPrediction);

        const response = await request(app)
          .post('/api/ai/analytics/predict')
          .send({
            studentId: 'student123',
            academicData: {
              grades: [85, 88, 92, 90],
              attendance: [95, 98, 92, 96],
              behavior: [90, 88, 92, 94]
            },
            timeframe: 'next_semester'
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockPrediction
        });
      });
    });

    describe('POST /api/ai/analytics/predict/batch', () => {
      it('should predict performance for multiple students', async () => {
        const mockPredictions = [
          { studentId: 'student1', prediction: 'high', confidence: 0.85 },
          { studentId: 'student2', prediction: 'medium', confidence: 0.72 }
        ];

        (aiAnalyticsService.predictBatchPerformance as any).mockResolvedValue(mockPredictions);

        const response = await request(app)
          .post('/api/ai/analytics/predict/batch')
          .send([
            {
              studentId: 'student1',
              academicData: { grades: [85, 88, 92], attendance: [95, 98, 92] }
            },
            {
              studentId: 'student2',
              academicData: { grades: [75, 78, 82], attendance: [85, 88, 82] }
            }
          ])
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockPredictions
        });
      });
    });

    describe('POST /api/ai/analytics/patterns', () => {
      it('should detect patterns in academic data', async () => {
        const mockPatterns = {
          patterns: [
            {
              type: 'grade_decline',
              description: 'Grades declining over time',
              severity: 'medium',
              affectedStudents: ['student1', 'student2']
            }
          ],
          insights: 'Students showing consistent decline in performance'
        };

        (aiAnalyticsService.detectPatterns as any).mockResolvedValue(mockPatterns);

        const response = await request(app)
          .post('/api/ai/analytics/patterns')
          .send({
            dataset: 'class_performance',
            timeframe: 'last_semester',
            filters: { grade: '10th' }
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockPatterns
        });
      });
    });

    describe('GET /api/ai/analytics/warnings', () => {
      it('should generate early warnings', async () => {
        const mockWarnings = [
          {
            studentId: 'student1',
            warning: 'Declining attendance',
            severity: 'high',
            action: 'Contact parents'
          }
        ];

        (aiAnalyticsService.generateEarlyWarnings as any).mockResolvedValue(mockWarnings);

        const response = await request(app)
          .get('/api/ai/analytics/warnings')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockWarnings
        });
      });
    });

    describe('GET /api/ai/analytics/recommendations/:studentId', () => {
      it('should generate personalized recommendations', async () => {
        const mockRecommendations = {
          recommendations: [
            {
              category: 'study_habits',
              suggestion: 'Study in shorter, focused sessions',
              priority: 'high'
            }
          ],
          reasoning: 'Based on current performance patterns'
        };

        (aiAnalyticsService.generatePersonalizedRecommendations as any).mockResolvedValue(mockRecommendations);

        const response = await request(app)
          .get('/api/ai/analytics/recommendations/student123')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockRecommendations
        });
      });
    });
  });

  describe('Report Generation Routes', () => {
    describe('POST /api/ai/reports/generate', () => {
      it('should generate a comprehensive report', async () => {
        const mockReport = {
          title: 'Academic Performance Report',
          summary: 'Overall improvement in student performance',
          sections: [
            {
              title: 'Executive Summary',
              content: 'Students showing positive trends',
              type: 'summary'
            }
          ],
          insights: ['Improved attendance', 'Better study habits'],
          recommendations: ['Continue current strategies'],
          confidence: 0.88
        };

        (aiReportGeneratorService.generateReport as any).mockResolvedValue(mockReport);

        const response = await request(app)
          .post('/api/ai/reports/generate')
          .send({
            type: 'academic_performance',
            timeframe: 'last_semester',
            filters: { grade: '10th', subject: 'math' },
            includeCharts: true,
            includePredictions: true
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockReport
        });
      });
    });

    describe('POST /api/ai/reports/trends', () => {
      it('should generate trend analysis report', async () => {
        const mockTrends = {
          title: 'Trend Analysis Report',
          trends: [
            {
              metric: 'grades',
              direction: 'increasing',
              change: '+5%',
              confidence: 0.85
            }
          ],
          insights: 'Overall positive trend in academic performance',
          recommendations: ['Maintain current strategies']
        };

        (aiReportGeneratorService.generateTrendAnalysis as any).mockResolvedValue(mockTrends);

        const response = await request(app)
          .post('/api/ai/reports/trends')
          .send({
            metrics: ['grades', 'attendance', 'behavior'],
            timeframe: 'last_year',
            granularity: 'monthly'
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTrends
        });
      });
    });

    describe('POST /api/ai/reports/comparative', () => {
      it('should generate comparative report', async () => {
        const mockComparison = {
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
        };

        (aiReportGeneratorService.generateComparativeReport as any).mockResolvedValue(mockComparison);

        const response = await request(app)
          .post('/api/ai/reports/comparative')
          .send({
            groupA: { name: 'Class A', filters: { grade: '10th', section: 'A' } },
            groupB: { name: 'Class B', filters: { grade: '10th', section: 'B' } },
            metrics: ['average_grade', 'attendance_rate', 'behavior_score']
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockComparison
        });
      });
    });

    describe('GET /api/ai/reports/templates', () => {
      it('should return available report templates', async () => {
        const mockTemplates = [
          {
            id: 'academic_performance',
            name: 'Academic Performance Report',
            description: 'Comprehensive analysis of student academic performance',
            type: 'academic',
            requiredFields: ['timeframe', 'filters']
          }
        ];

        (aiReportGeneratorService.getReportTemplates as any).mockResolvedValue(mockTemplates);

        const response = await request(app)
          .get('/api/ai/reports/templates')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTemplates
        });
      });
    });
  });

  describe('Health Check Routes', () => {
    describe('GET /api/ai/status', () => {
      it('should return AI services status', async () => {
        const response = await request(app)
          .get('/api/ai/status')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: {
            chatbot: true,
            analytics: true,
            reportGenerator: true,
            timestamp: expect.any(String)
          }
        });
      });
    });

    describe('GET /api/ai/health', () => {
      it('should return detailed health information', async () => {
        const response = await request(app)
          .get('/api/ai/health')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: {
            status: 'healthy',
            services: {
              chatbot: { status: 'operational', uptime: expect.any(Number) },
              analytics: { status: 'operational', uptime: expect.any(Number) },
              reportGenerator: { status: 'operational', uptime: expect.any(Number) }
            },
            timestamp: expect.any(String)
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (aiChatbotService.createChatSession as any).mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/ai/chat/sessions')
        .send({
          userId: 'user123',
          context: 'educational'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service unavailable');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/ai/chat/messages')
        .send({
          sessionId: '',
          content: '',
          role: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });
  });
}); 