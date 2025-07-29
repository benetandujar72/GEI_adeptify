import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { microservicesApi, MicroservicesApiService } from '../../../client/src/services/microservices-api';
import type { User, Student, Course, Resource, LLMChatRequest } from '../../../client/src/services/microservices-api';

// Mock fetch
global.fetch = vi.fn();

describe('MicroservicesApiService', () => {
  let apiService: MicroservicesApiService;

  beforeEach(() => {
    apiService = new MicroservicesApiService('https://test-gateway.com');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default gateway URL', () => {
      const defaultApi = new MicroservicesApiService();
      expect(defaultApi).toBeInstanceOf(MicroservicesApiService);
    });

    it('should initialize with custom gateway URL', () => {
      const customApi = new MicroservicesApiService('https://custom-gateway.com');
      expect(customApi).toBeInstanceOf(MicroservicesApiService);
    });
  });

  describe('User Service', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'teacher',
      institute_id: 'inst-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_active: true
    };

    it('should get users successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockUser],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getUsers({ page: 1, limit: 10 });

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/users/users?page=1&limit=10',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Request-ID': expect.stringMatching(/req_\d+_\d+/),
            'User-Agent': 'GEI-Frontend/1.0'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should get user by ID successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockUser,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getUserById('1');

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/users/users/1',
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should create user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };

      const mockResponse = {
        success: true,
        data: { ...mockUser, ...userData },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.createUser(userData);

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/users/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(userData)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(errorResponse)
      });

      await expect(apiService.getUserById('999')).rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('Student Service', () => {
    const mockStudent: Student = {
      id: '1',
      student_id: 'STU001',
      user_id: 'user-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      grade: 10,
      section: 'A',
      institute_id: 'inst-1',
      birth_date: '2005-01-01',
      enrollment_date: '2020-09-01',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should get students successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockStudent],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getStudents({ grade: 10 });

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/students/students?grade=10',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse);
    });

    it('should create student successfully', async () => {
      const studentData = {
        student_id: 'STU002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        grade: 11,
        section: 'B',
        institute_id: 'inst-1',
        birth_date: '2004-01-01'
      };

      const mockResponse = {
        success: true,
        data: { ...mockStudent, ...studentData },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.createStudent(studentData);

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/students/students',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(studentData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Course Service', () => {
    const mockCourse: Course = {
      id: '1',
      course_code: 'MATH101',
      name: 'Mathematics 101',
      description: 'Basic mathematics course',
      credits: 3,
      institute_id: 'inst-1',
      teacher_id: 'teacher-1',
      academic_year_id: 'year-1',
      start_date: '2024-09-01',
      end_date: '2024-12-31',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should get courses successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockCourse],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getCourses({ status: 'active' });

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/courses/courses?status=active',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse);
    });

    it('should create course successfully', async () => {
      const courseData = {
        course_code: 'SCI101',
        name: 'Science 101',
        description: 'Basic science course',
        credits: 4,
        institute_id: 'inst-1',
        teacher_id: 'teacher-1',
        academic_year_id: 'year-1',
        start_date: '2024-09-01',
        end_date: '2024-12-31'
      };

      const mockResponse = {
        success: true,
        data: { ...mockCourse, ...courseData },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.createCourse(courseData);

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/courses/courses',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(courseData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Resource Service', () => {
    const mockResource: Resource = {
      id: '1',
      title: 'Math Textbook',
      description: 'Mathematics textbook for grade 10',
      type: 'document',
      url: 'https://example.com/math-textbook.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      course_id: 'course-1',
      created_by: 'teacher-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should get resources successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockResource],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getResources({ type: 'document' });

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/resources/resources?type=document',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse);
    });

    it('should upload resource successfully', async () => {
      const resourceData = {
        title: 'New Resource',
        description: 'A new resource',
        type: 'document',
        course_id: 'course-1'
      };

      const mockResponse = {
        success: true,
        data: { ...mockResource, ...resourceData },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.uploadResource(resourceData);

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/resources/resources',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('LLM Gateway', () => {
    it('should send chat message successfully', async () => {
      const chatRequest: LLMChatRequest = {
        message: 'Hello, how are you?',
        model: 'gpt-4',
        temperature: 0.7
      };

      const mockResponse = {
        success: true,
        data: {
          response: 'Hello! I am doing well, thank you for asking.',
          model: 'gpt-4',
          tokens: {
            prompt: 10,
            completion: 15,
            total: 25
          },
          processing_time: 1500
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.sendChatMessage(chatRequest);

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/llm/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(chatRequest)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should generate content successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          content: 'Generated content here...',
          metadata: {
            model: 'gpt-4',
            tokens: 150
          }
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.generateContent('Generate a summary', 'summary');

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api/llm/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ prompt: 'Generate a summary', type: 'summary' })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Health Check', () => {
    it('should get gateway health successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'healthy',
          services: {
            users: 'healthy',
            students: 'healthy',
            courses: 'healthy'
          },
          uptime: 3600
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getGatewayHealth();

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api//health',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse);
    });

    it('should get service metrics successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          requests: { total: 1000 },
          responses: { '200': 950, '404': 50 },
          services: { users: { status: 'healthy' } },
          summary: { uptime: '1h 30m' }
        },
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.getServiceMetrics();

      expect(fetch).toHaveBeenCalledWith(
        'https://test-gateway.com/api//metrics',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.getUsers()).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(apiService.getUsers()).rejects.toThrow('Invalid JSON');
    });

    it('should handle timeout errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Request timeout'));

      await expect(apiService.getUsers()).rejects.toThrow('Request timeout');
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0'
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await apiService.getUsers();
      await apiService.getUsers();

      const calls = (fetch as any).mock.calls;
      const requestId1 = calls[0][1].headers['X-Request-ID'];
      const requestId2 = calls[1][1].headers['X-Request-ID'];

      expect(requestId1).not.toBe(requestId2);
      expect(requestId1).toMatch(/req_\d+_\d+/);
      expect(requestId2).toMatch(/req_\d+_\d+/);
    });
  });
});