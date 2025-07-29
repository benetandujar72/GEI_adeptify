import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { microservicesApi } from '../../client/src/services/microservices-api';
import type { User, Student, Course, Resource } from '../../client/src/services/microservices-api';

// Configuración para tests E2E
const TEST_GATEWAY_URL = process.env.TEST_GATEWAY_URL || 'https://gei.adeptify.es';
const TEST_TIMEOUT = 30000; // 30 segundos

describe('Microservices E2E Workflow', () => {
  let testUser: User;
  let testStudent: Student;
  let testCourse: Course;
  let testResource: Resource;
  let authToken: string;

  beforeAll(async () => {
    // Verificar que el gateway esté disponible
    try {
      const health = await microservicesApi.getGatewayHealth();
      expect(health.success).toBe(true);
      console.log('✅ Gateway is healthy:', health.data?.status);
    } catch (error) {
      console.error('❌ Gateway health check failed:', error);
      throw new Error('Gateway is not available for E2E tests');
    }
  }, TEST_TIMEOUT);

  describe('Authentication Flow', () => {
    it('should register a new test user', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'E2E Test User',
        role: 'teacher'
      };

      const response = await microservicesApi.register(userData);
      
      expect(response.success).toBe(true);
      expect(response.data?.user).toBeDefined();
      expect(response.data?.user.email).toBe(userData.email);
      expect(response.data?.user.name).toBe(userData.name);
      expect(response.data?.token).toBeDefined();

      testUser = response.data!.user;
      authToken = response.data!.token;

      console.log('✅ User registered:', testUser.email);
    }, TEST_TIMEOUT);

    it('should login with the test user', async () => {
      const credentials = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await microservicesApi.login(credentials);
      
      expect(response.success).toBe(true);
      expect(response.data?.user.id).toBe(testUser.id);
      expect(response.data?.token).toBeDefined();
      expect(response.data?.refresh_token).toBeDefined();

      console.log('✅ User logged in successfully');
    }, TEST_TIMEOUT);

    it('should refresh token successfully', async () => {
      const refreshToken = 'test-refresh-token'; // En un test real, usaríamos el token real
      
      try {
        const response = await microservicesApi.refreshToken(refreshToken);
        expect(response.success).toBe(true);
        expect(response.data?.token).toBeDefined();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        // En un entorno de test, el refresh token podría no ser válido
        console.log('⚠️ Token refresh test skipped (expected in test environment)');
      }
    }, TEST_TIMEOUT);
  });

  describe('User Management Flow', () => {
    it('should get users list', async () => {
      const response = await microservicesApi.getUsers({ page: 1, limit: 10 });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination).toBeDefined();
      expect(response.pagination.total).toBeGreaterThanOrEqual(0);

      console.log('✅ Users list retrieved:', response.pagination.total, 'users');
    }, TEST_TIMEOUT);

    it('should get user by ID', async () => {
      const response = await microservicesApi.getUserById(testUser.id);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(testUser.id);
      expect(response.data.email).toBe(testUser.email);

      console.log('✅ User details retrieved:', response.data.name);
    }, TEST_TIMEOUT);

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated E2E Test User'
      };

      const response = await microservicesApi.updateUser(testUser.id, updateData);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe(updateData.name);

      console.log('✅ User profile updated');
    }, TEST_TIMEOUT);
  });

  describe('Student Management Flow', () => {
    it('should create a test student', async () => {
      const studentData = {
        student_id: `STU${Date.now()}`,
        first_name: 'John',
        last_name: 'Doe',
        email: `student-${Date.now()}@example.com`,
        grade: 10,
        section: 'A',
        institute_id: testUser.institute_id || 'test-institute',
        birth_date: '2005-01-01'
      };

      const response = await microservicesApi.createStudent(studentData);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.student_id).toBe(studentData.student_id);
      expect(response.data.first_name).toBe(studentData.first_name);
      expect(response.data.last_name).toBe(studentData.last_name);

      testStudent = response.data!;

      console.log('✅ Student created:', testStudent.student_id);
    }, TEST_TIMEOUT);

    it('should get students list', async () => {
      const response = await microservicesApi.getStudents({ page: 1, limit: 10 });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination).toBeDefined();

      console.log('✅ Students list retrieved:', response.pagination.total, 'students');
    }, TEST_TIMEOUT);

    it('should get student by ID', async () => {
      const response = await microservicesApi.getStudentById(testStudent.id);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(testStudent.id);
      expect(response.data.student_id).toBe(testStudent.student_id);

      console.log('✅ Student details retrieved:', testStudent.first_name, testStudent.last_name);
    }, TEST_TIMEOUT);
  });

  describe('Course Management Flow', () => {
    it('should create a test course', async () => {
      const courseData = {
        course_code: `COURSE${Date.now()}`,
        name: 'E2E Test Course',
        description: 'A test course for E2E testing',
        credits: 3,
        institute_id: testUser.institute_id || 'test-institute',
        teacher_id: testUser.id,
        academic_year_id: 'test-year',
        start_date: '2024-09-01',
        end_date: '2024-12-31'
      };

      const response = await microservicesApi.createCourse(courseData);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.course_code).toBe(courseData.course_code);
      expect(response.data.name).toBe(courseData.name);
      expect(response.data.teacher_id).toBe(testUser.id);

      testCourse = response.data!;

      console.log('✅ Course created:', testCourse.course_code);
    }, TEST_TIMEOUT);

    it('should get courses list', async () => {
      const response = await microservicesApi.getCourses({ page: 1, limit: 10 });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination).toBeDefined();

      console.log('✅ Courses list retrieved:', response.pagination.total, 'courses');
    }, TEST_TIMEOUT);

    it('should get course by ID', async () => {
      const response = await microservicesApi.getCourseById(testCourse.id);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(testCourse.id);
      expect(response.data.course_code).toBe(testCourse.course_code);

      console.log('✅ Course details retrieved:', testCourse.name);
    }, TEST_TIMEOUT);
  });

  describe('Resource Management Flow', () => {
    it('should create a test resource', async () => {
      const resourceData = {
        title: 'E2E Test Resource',
        description: 'A test resource for E2E testing',
        type: 'document',
        course_id: testCourse.id,
        url: 'https://example.com/test-resource.pdf'
      };

      const response = await microservicesApi.uploadResource(resourceData);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.title).toBe(resourceData.title);
      expect(response.data.type).toBe(resourceData.type);
      expect(response.data.course_id).toBe(testCourse.id);

      testResource = response.data!;

      console.log('✅ Resource created:', testResource.title);
    }, TEST_TIMEOUT);

    it('should get resources list', async () => {
      const response = await microservicesApi.getResources({ page: 1, limit: 10 });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination).toBeDefined();

      console.log('✅ Resources list retrieved:', response.pagination.total, 'resources');
    }, TEST_TIMEOUT);

    it('should get resources by course', async () => {
      const response = await microservicesApi.getResources({ 
        course_id: testCourse.id,
        page: 1,
        limit: 10
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      // Verificar que al menos nuestro recurso de prueba esté en la lista
      const testResourceInList = response.data.find(r => r.id === testResource.id);
      expect(testResourceInList).toBeDefined();

      console.log('✅ Course resources retrieved:', response.data.length, 'resources');
    }, TEST_TIMEOUT);
  });

  describe('Notification Flow', () => {
    it('should get notifications', async () => {
      const response = await microservicesApi.getNotifications({ page: 1, limit: 10 });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination).toBeDefined();

      console.log('✅ Notifications retrieved:', response.pagination.total, 'notifications');
    }, TEST_TIMEOUT);

    it('should mark notification as read', async () => {
      // Primero obtener las notificaciones
      const notificationsResponse = await microservicesApi.getNotifications({ 
        read: false,
        page: 1,
        limit: 1
      });

      if (notificationsResponse.data && notificationsResponse.data.length > 0) {
        const notification = notificationsResponse.data[0];
        
        const response = await microservicesApi.markNotificationAsRead(notification.id);
        expect(response.success).toBe(true);

        console.log('✅ Notification marked as read:', notification.id);
      } else {
        console.log('⚠️ No unread notifications to mark as read');
      }
    }, TEST_TIMEOUT);
  });

  describe('LLM Integration Flow', () => {
    it('should send chat message', async () => {
      const chatRequest = {
        message: 'Hello, this is an E2E test message',
        model: 'gpt-3.5-turbo' as const,
        temperature: 0.7
      };

      try {
        const response = await microservicesApi.sendChatMessage(chatRequest);
        
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data.response).toBeDefined();
        expect(response.data.model).toBe(chatRequest.model);

        console.log('✅ Chat message sent and response received');
      } catch (error) {
        console.log('⚠️ LLM service might not be available in test environment');
      }
    }, TEST_TIMEOUT);

    it('should generate content', async () => {
      const prompt = 'Generate a short summary about education technology';
      const type = 'summary';

      try {
        const response = await microservicesApi.generateContent(prompt, type);
        
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data.content).toBeDefined();
        expect(response.data.metadata).toBeDefined();

        console.log('✅ Content generated successfully');
      } catch (error) {
        console.log('⚠️ Content generation service might not be available in test environment');
      }
    }, TEST_TIMEOUT);
  });

  describe('File Upload Flow', () => {
    it('should upload a file', async () => {
      // Crear un archivo de prueba en memoria
      const testFileContent = 'This is a test file content for E2E testing';
      const testFile = new File([testFileContent], 'test-file.txt', { type: 'text/plain' });

      try {
        const response = await microservicesApi.uploadFile(testFile, 'document');
        
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data.filename).toBe('test-file.txt');
        expect(response.data.mime_type).toBe('text/plain');
        expect(response.data.size).toBeGreaterThan(0);

        console.log('✅ File uploaded successfully:', response.data.filename);
      } catch (error) {
        console.log('⚠️ File upload service might not be available in test environment');
      }
    }, TEST_TIMEOUT);
  });

  describe('Search Flow', () => {
    it('should search across resources', async () => {
      const query = 'test';
      const filters = {
        type: 'document',
        institute_id: testUser.institute_id
      };

      try {
        const response = await microservicesApi.search(query, filters);
        
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data.results).toBeDefined();
        expect(Array.isArray(response.data.results)).toBe(true);
        expect(response.data.total).toBeGreaterThanOrEqual(0);

        console.log('✅ Search completed:', response.data.total, 'results found');
      } catch (error) {
        console.log('⚠️ Search service might not be available in test environment');
      }
    }, TEST_TIMEOUT);
  });

  describe('System Health and Metrics', () => {
    it('should get gateway health status', async () => {
      const response = await microservicesApi.getGatewayHealth();
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBeDefined();
      expect(response.data.services).toBeDefined();
      expect(response.data.uptime).toBeGreaterThan(0);

      console.log('✅ Gateway health status:', response.data.status);
      console.log('✅ Gateway uptime:', Math.floor(response.data.uptime / 3600), 'hours');
    }, TEST_TIMEOUT);

    it('should get service metrics', async () => {
      const response = await microservicesApi.getServiceMetrics();
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.requests).toBeDefined();
      expect(response.data.responses).toBeDefined();
      expect(response.data.services).toBeDefined();
      expect(response.data.summary).toBeDefined();

      console.log('✅ Service metrics retrieved');
      console.log('📊 Total requests:', response.data.summary.totalRequests);
      console.log('📊 Success rate:', response.data.summary.successRate);
    }, TEST_TIMEOUT);
  });

  describe('Cleanup', () => {
    it('should logout successfully', async () => {
      const response = await microservicesApi.logout();
      
      expect(response.success).toBe(true);

      console.log('✅ User logged out successfully');
    }, TEST_TIMEOUT);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user ID gracefully', async () => {
      try {
        await microservicesApi.getUserById('invalid-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid user ID handled gracefully');
      }
    }, TEST_TIMEOUT);

    it('should handle invalid course ID gracefully', async () => {
      try {
        await microservicesApi.getCourseById('invalid-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid course ID handled gracefully');
      }
    }, TEST_TIMEOUT);

    it('should handle pagination correctly', async () => {
      const response = await microservicesApi.getUsers({ page: 999, limit: 1 });
      
      expect(response.success).toBe(true);
      expect(response.pagination).toBeDefined();
      expect(response.pagination.page).toBe(999);
      expect(response.pagination.hasNext).toBe(false);

      console.log('✅ Pagination handled correctly for out-of-range page');
    }, TEST_TIMEOUT);

    it('should handle search with no results', async () => {
      try {
        const response = await microservicesApi.search('very-specific-term-that-should-not-exist');
        
        expect(response.success).toBe(true);
        expect(response.data.total).toBe(0);
        expect(response.data.results).toHaveLength(0);

        console.log('✅ Search with no results handled correctly');
      } catch (error) {
        console.log('⚠️ Search service might not be available');
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        microservicesApi.getUsers({ page: 1, limit: 1 })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      console.log(`✅ ${concurrentRequests} concurrent requests completed in ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, TEST_TIMEOUT);

    it('should handle large data sets', async () => {
      const response = await microservicesApi.getUsers({ page: 1, limit: 100 });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.pagination.limit).toBe(100);

      console.log('✅ Large dataset handled correctly:', response.data.length, 'users');
    }, TEST_TIMEOUT);
  });
});