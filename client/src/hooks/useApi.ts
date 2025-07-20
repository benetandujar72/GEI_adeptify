import { useState, useCallback } from 'react';
import { apiService, ApiResponse } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<ApiResponse<T> | null>;
  reset: () => void;
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const response = await apiFunction(...args);
        
        if (response.success) {
          setState({
            data: response.data || null,
            loading: false,
            error: null,
          });
        } else {
          setState({
            data: null,
            loading: false,
            error: response.error || 'Error desconocido',
          });
        }
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Hooks específicos para diferentes operaciones
export function useLogin() {
  return useApi(apiService.login);
}

export function useRegister() {
  return useApi(apiService.register);
}

export function useLogout() {
  return useApi(apiService.logout);
}

export function useCheckSession() {
  return useApi(apiService.checkSession);
}

export function useDashboardStats() {
  return useApi(apiService.getDashboardStats);
}

export function useInstitutes() {
  return useApi(apiService.getInstitutes);
}

export function useCreateInstitute() {
  return useApi(apiService.createInstitute);
}

export function useUsers() {
  return useApi(apiService.getUsers);
}

export function useCreateUser() {
  return useApi(apiService.createUser);
}

export function useUpdateUser() {
  return useApi(apiService.updateUser);
}

export function useDeleteUser() {
  return useApi(apiService.deleteUser);
}

export function useAcademicYears() {
  return useApi(apiService.getAcademicYears);
}

export function useCreateAcademicYear() {
  return useApi(apiService.createAcademicYear);
}

export function useModules() {
  return useApi(apiService.getModules);
}

export function useUpdateModule() {
  return useApi(apiService.updateModule);
}

export function useChatMessage() {
  return useApi(apiService.sendChatMessage);
}

export function useGenerateContent() {
  return useApi(apiService.generateContent);
}

export function useAuditLogs() {
  return useApi(apiService.getAuditLogs);
}

export function useSystemConfig() {
  return useApi(apiService.getSystemConfig);
}

export function useUpdateSystemConfig() {
  return useApi(apiService.updateSystemConfig);
}

export function useUploadFile() {
  return useApi(apiService.uploadFile);
}

export function useNotifications() {
  return useApi(apiService.getNotifications);
}

export function useMarkNotificationAsRead() {
  return useApi(apiService.markNotificationAsRead);
} 

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
  return useMutation({
    mutationFn: (params: any) => apiClient.post('/surveys/analytics', params),
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
    queryFn: (params: any) => apiClient.get('/analytics', { params }),
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    queryFn: () => apiClient.get('/evaluations'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/evaluations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.put(`/evaluations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/evaluations/${id}`),
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
  return useMutation({
    mutationFn: (params: any) => apiClient.post('/attendance/report', params),
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