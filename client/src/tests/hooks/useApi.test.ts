import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useSurveys, 
  useCreateSurvey, 
  useResources, 
  useBookResource,
  useAnalytics,
  useGenerateReport
} from '../../hooks/useApi';

// Mock del cliente API
vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(await import('../../lib/apiClient')).apiClient;

// Wrapper para React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('API Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSurveys', () => {
    it('fetches surveys successfully', async () => {
      const mockSurveys = [
        {
          id: '1',
          title: 'Test Survey',
          description: 'Test Description',
          type: 'student',
          status: 'active'
        }
      ];

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockSurveys
      });

      const { result } = renderHook(() => useSurveys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toEqual(mockSurveys);
      expect(mockApiClient.get).toHaveBeenCalledWith('/surveys');
    });

    it('handles error when fetching surveys fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSurveys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useCreateSurvey', () => {
    it('creates survey successfully', async () => {
      const surveyData = {
        title: 'New Survey',
        description: 'New Description',
        type: 'teacher'
      };

      const mockResponse = {
        success: true,
        data: { id: '1', ...surveyData }
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateSurvey(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(surveyData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/surveys', surveyData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles error when creating survey fails', async () => {
      const surveyData = { title: 'Test' };
      mockApiClient.post.mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useCreateSurvey(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(surveyData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useResources', () => {
    it('fetches resources successfully', async () => {
      const mockResources = [
        {
          id: '1',
          name: 'Classroom A',
          type: 'classroom',
          capacity: 30,
          status: 'available'
        }
      ];

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { resources: mockResources }
      });

      const { result } = renderHook(() => useResources(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data.resources).toEqual(mockResources);
    });
  });

  describe('useBookResource', () => {
    it('books resource successfully', async () => {
      const bookingData = {
        resourceId: '1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00'
      };

      const mockResponse = {
        success: true,
        data: { id: '1', ...bookingData }
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useBookResource(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(bookingData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/resources/book', bookingData);
    });
  });

  describe('useAnalytics', () => {
    it('fetches analytics data with parameters', async () => {
      const params = { period: 'month', module: 'all' };
      const mockAnalytics = {
        overview: {
          totalStudents: 500,
          averageAttendance: 85.5
        }
      };

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockAnalytics
      });

      const { result } = renderHook(() => useAnalytics(), {
        wrapper: createWrapper(),
      });

      // Simular la llamada con parámetros
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useGenerateReport', () => {
    it('generates report successfully', async () => {
      const reportParams = {
        type: 'comprehensive',
        period: 'month',
        format: 'pdf'
      };

      const mockReport = {
        success: true,
        data: {
          content: 'PDF content',
          filename: 'report.pdf'
        }
      };

      mockApiClient.post.mockResolvedValueOnce(mockReport);

      const { result } = renderHook(() => useGenerateReport(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(reportParams);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/analytics/reports', reportParams);
    });
  });

  describe('Hook Error Handling', () => {
    it('handles network errors consistently', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSurveys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('handles API error responses', async () => {
      mockApiClient.get.mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      const { result } = renderHook(() => useSurveys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.success).toBe(false);
      expect(result.current.data?.error).toBe('API Error');
    });
  });

  describe('Query Invalidation', () => {
    it('invalidates related queries after mutation', async () => {
      const mockQueryClient = {
        invalidateQueries: vi.fn(),
        setQueryData: vi.fn(),
        getQueryData: vi.fn(),
      };

      vi.mocked(await import('@tanstack/react-query')).useQueryClient.mockReturnValue(mockQueryClient);

      const { result } = renderHook(() => useCreateSurvey(), {
        wrapper: createWrapper(),
      });

      const surveyData = { title: 'Test' };
      mockApiClient.post.mockResolvedValue({ success: true, data: surveyData });

      result.current.mutate(surveyData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verificar que se invalidaron las queries relacionadas
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['surveys'] });
    });
  });
}); 