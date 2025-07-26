import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API Client
const apiClient = {
  get: async (url: string) => {
    const response = await fetch(`/api${url}`);
    return response.json();
  },
  post: async (url: string, data: any) => {
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  put: async (url: string, data: any) => {
    const response = await fetch(`/api${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  delete: async (url: string) => {
    const response = await fetch(`/api${url}`, { method: 'DELETE' });
    return response.json();
  },
};

// General useApi hook
export const useApi = () => {
  return {
    get: useCallback(async (url: string, options?: { params?: Record<string, any> }) => {
      let fullUrl = url;
      if (options?.params) {
        const searchParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          fullUrl += `?${queryString}`;
        }
      }
      return apiClient.get(fullUrl);
    }, []),
    
    post: useCallback(async (url: string, data: any) => {
      return apiClient.post(url, data);
    }, []),
    
    put: useCallback(async (url: string, data: any) => {
      return apiClient.put(url, data);
    }, []),
    
    delete: useCallback(async (url: string) => {
      return apiClient.delete(url);
    }, []),
  };
};

// Survey hooks
export const useSurveys = () => {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: () => apiClient.get('/surveys'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSurvey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/surveys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
  });
};

export const useSurveyResponses = () => {
  return useQuery({
    queryKey: ['survey-responses'],
    queryFn: () => apiClient.get('/surveys/responses'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSurveyAnalytics = () => {
  return useQuery({
    queryKey: ['survey-analytics'],
    queryFn: () => apiClient.get('/surveys/analytics'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Resource hooks
export const useResources = () => {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.get('/resources'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBookResource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/resources/book', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-bookings'] });
    },
  });
};

export const useResourceBookings = () => {
  return useQuery({
    queryKey: ['resource-bookings'],
    queryFn: () => apiClient.get('/resources/bookings'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Analytics hooks
export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiClient.get('/analytics'),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useGenerateReport = () => {
  return useMutation({
    mutationFn: (params: any) => apiClient.post('/analytics/reports', params),
  });
};

export const useExportData = () => {
  return useMutation({
    mutationFn: (params: any) => apiClient.post('/analytics/export', params),
  });
};

// Evaluation hooks
export const useEvaluations = () => {
  return useQuery({
    queryKey: ['evaluations'],
    queryFn: () => apiClient.get('/evaluation'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/evaluation', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.put(`/evaluation/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/evaluation/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

// Attendance hooks
export const useAttendance = () => {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: () => apiClient.get('/attendance'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useRegisterAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/attendance/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

export const useAttendanceReport = () => {
  return useQuery({
    queryKey: ['attendance-report'],
    queryFn: () => apiClient.get('/attendance/report'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Guard hooks
export const useGuards = () => {
  return useQuery({
    queryKey: ['guards'],
    queryFn: () => apiClient.get('/guards'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAssignGuard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/guards/assign', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
    },
  });
};

export const useAutoAssignGuards = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: any) => apiClient.post('/guards/auto-assign', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
    },
  });
};

// User and Institute hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useInstitutes = () => {
  return useQuery({
    queryKey: ['institutes'],
    queryFn: () => apiClient.get('/institutes'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSystemConfig = () => {
  return useQuery({
    queryKey: ['system-config'],
    queryFn: () => apiClient.get('/system/config'),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Academic Year hooks
export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/academic-years', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
};

// AI Chat hooks
export const useChatMessage = () => {
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/ai/chat', data),
  });
};

export const useGenerateContent = () => {
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/ai/generate', data),
  });
}; 