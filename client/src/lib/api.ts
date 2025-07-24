import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // Important for session cookies
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful response for debugging
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // Log error response for debugging
    console.error('API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Unauthorized - clearing auth token');
      // Clear auth token and redirect to login
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle other errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    google: '/api/auth/google',
  },
  
  // Dashboard
  dashboard: {
    stats: '/api/dashboard/stats',
  },
  
  // Competencies (Adeptify)
  competencies: {
    list: '/api/competencies',
    create: '/api/competencies',
    update: (id: string) => `/api/competencies/${id}`,
    delete: (id: string) => `/api/competencies/${id}`,
    criteria: (id: string) => `/api/competencies/${id}/criteria`,
    evaluations: '/api/competencies/evaluations',
    stats: '/api/competencies/stats',
  },
  
  // Guard Automation (Assistatut)
  guardAutomation: {
    assign: '/api/guard-automation/assign-for-activity',
    stats: '/api/guard-automation/stats',
    guards: '/api/guard-automation/guards',
    assignGuard: (id: string) => `/api/guard-automation/guards/${id}/assign`,
    confirmGuard: (id: string) => `/api/guard-automation/guards/${id}/confirm`,
    completeGuard: (id: string) => `/api/guard-automation/guards/${id}/complete`,
  },
  
  // Attendance
  attendance: {
    record: '/api/attendance/record',
    bulk: '/api/attendance/bulk',
    student: (id: string) => `/api/attendance/student/${id}`,
    class: (id: string) => `/api/attendance/class/${id}`,
    stats: '/api/attendance/stats',
    report: '/api/attendance/report',
    records: '/api/attendance/records',
    students: (classId: string) => `/api/attendance/students/${classId}`,
  },
  
  // Communication
  communication: {
    send: '/api/communication/send',
    sendClass: (classId: string) => `/api/communication/send-class/${classId}`,
    sendInstitute: '/api/communication/send-institute',
    notifications: '/api/communication/notifications',
    markAsRead: (id: string) => `/api/communication/notifications/${id}/read`,
    markAllAsRead: '/api/communication/notifications/read-all',
    delete: (id: string) => `/api/communication/notifications/${id}`,
    stats: '/api/communication/stats',
  },
  
  // Schedule
  schedule: {
    create: '/api/schedule',
    teacher: (id: string) => `/api/schedule/teacher/${id}`,
    class: (id: string) => `/api/schedule/class/${id}`,
    institute: '/api/schedule/institute',
    update: (id: string) => `/api/schedule/${id}`,
    delete: (id: string) => `/api/schedule/${id}`,
    checkConflicts: '/api/schedule/check-conflicts',
    stats: '/api/schedule/stats',
    room: (room: string) => `/api/schedule/room/${room}`,
    mySchedule: '/api/schedule/my-schedule',
  },
  
  // Users
  users: {
    list: '/api/users',
    create: '/api/users',
    update: (id: string) => `/api/users/${id}`,
    delete: (id: string) => `/api/users/${id}`,
    profile: '/api/users/profile',
  },
  
  // Classes
  classes: {
    list: '/api/classes',
    create: '/api/classes',
    update: (id: string) => `/api/classes/${id}`,
    delete: (id: string) => `/api/classes/${id}`,
  },
  
  // Activities
  activities: {
    list: '/api/activities',
    create: '/api/activities',
    update: (id: string) => `/api/activities/${id}`,
    delete: (id: string) => `/api/activities/${id}`,
  },
};

// Helper functions
export const apiHelpers = {
  // Handle API errors
  handleError: (error: any) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'Error desconegut';
  },
  
  // Format date for API
  formatDate: (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },
  
  // Format datetime for API
  formatDateTime: (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString();
  },
  
  // Parse API date
  parseDate: (dateString: string) => {
    return new Date(dateString);
  },
  
  // Build query string
  buildQuery: (params: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  },
};

export default api; 