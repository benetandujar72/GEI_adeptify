import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración base
const GATEWAY_URL = 'https://gei.adeptify.es';

// Tipos de respuesta
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  timestamp: string;
  version: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos de datos
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'institute_admin' | 'teacher' | 'student';
  institute_id?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  student_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  grade: number;
  section: string;
  institute_id: string;
  birth_date: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  course_code: string;
  name: string;
  description: string;
  credits: number;
  institute_id: string;
  teacher_id: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'video' | 'link' | 'image';
  url: string;
  file_size?: number;
  mime_type?: string;
  course_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface LLMChatRequest {
  message: string;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro';
  context?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMChatResponse {
  response: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  processing_time: number;
  sources?: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
}

// Clase principal de la API
class MobileApiService {
  private api: AxiosInstance;
  private requestId: number = 0;

  constructor() {
    this.api = axios.create({
      baseURL: GATEWAY_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GEI-Mobile/1.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const requestId = `mobile_${Date.now()}_${++this.requestId}`;
        config.headers['X-Request-ID'] = requestId;

        // Añadir token de autenticación
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado, intentar refresh
          const refreshToken = await AsyncStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const refreshResponse = await this.refreshToken(refreshToken);
              if (refreshResponse.success) {
                // Reintentar la petición original
                const originalRequest = error.config;
                originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data?.token}`;
                return this.api(originalRequest);
              }
            } catch (refreshError) {
              // Refresh falló, redirigir al login
              await this.logout();
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Método helper para hacer peticiones
  private async request<T>(
    service: string,
    endpoint: string,
    options: any = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `/api/${service}${endpoint}`;
      const response = await this.api.request({
        url,
        ...options,
      });

      return response.data;
    } catch (error: any) {
      console.error(`API Error (${service}${endpoint}):`, error);
      throw error;
    }
  }

  // === AUTH SERVICE ===
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{
    user: User;
    token: string;
    refresh_token: string;
    expires_in: number;
  }>> {
    const response = await this.request<{
      user: User;
      token: string;
      refresh_token: string;
      expires_in: number;
    }>('auth', '/login', {
      method: 'POST',
      data: credentials,
    });

    if (response.success && response.data) {
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    institute_id?: string;
  }): Promise<ApiResponse<{
    user: User;
    token: string;
  }>> {
    const response = await this.request<{
      user: User;
      token: string;
    }>('auth', '/register', {
      method: 'POST',
      data: userData,
    });

    if (response.success && response.data) {
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{
    token: string;
    refresh_token: string;
    expires_in: number;
  }>> {
    const response = await this.request<{
      token: string;
      refresh_token: string;
      expires_in: number;
    }>('auth', '/refresh', {
      method: 'POST',
      data: { refresh_token: refreshToken },
    });

    if (response.success && response.data) {
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      await this.request<void>('auth', '/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Ignorar errores en logout
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
    }

    return { success: true, timestamp: new Date().toISOString(), version: '1.0' };
  }

  async getCurrentUser(): Promise<User | null> {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // === USER SERVICE ===
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    institute_id?: string;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.institute_id) queryParams.append('institute_id', params.institute_id);
    if (params?.search) queryParams.append('search', params.search);

    return this.request<User[]>('users', `/users?${queryParams.toString()}`);
  }

  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return this.request<User>('users', `/users/${userId}`);
  }

  async updateProfile(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('users', `/users/${userId}`, {
      method: 'PUT',
      data: userData,
    });
  }

  // === STUDENT SERVICE ===
  async getStudents(params?: {
    page?: number;
    limit?: number;
    grade?: number;
    institute_id?: string;
    search?: string;
  }): Promise<PaginatedResponse<Student>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.grade) queryParams.append('grade', params.grade.toString());
    if (params?.institute_id) queryParams.append('institute_id', params.institute_id);
    if (params?.search) queryParams.append('search', params.search);

    return this.request<Student[]>('students', `/students?${queryParams.toString()}`);
  }

  async getStudentById(studentId: string): Promise<ApiResponse<Student>> {
    return this.request<Student>('students', `/students/${studentId}`);
  }

  // === COURSE SERVICE ===
  async getCourses(params?: {
    page?: number;
    limit?: number;
    institute_id?: string;
    teacher_id?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Course>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.institute_id) queryParams.append('institute_id', params.institute_id);
    if (params?.teacher_id) queryParams.append('teacher_id', params.teacher_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    return this.request<Course[]>('courses', `/courses?${queryParams.toString()}`);
  }

  async getCourseById(courseId: string): Promise<ApiResponse<Course>> {
    return this.request<Course>('courses', `/courses/${courseId}`);
  }

  // === RESOURCE SERVICE ===
  async getResources(params?: {
    page?: number;
    limit?: number;
    course_id?: string;
    type?: string;
    search?: string;
  }): Promise<PaginatedResponse<Resource>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.course_id) queryParams.append('course_id', params.course_id);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);

    return this.request<Resource[]>('resources', `/resources?${queryParams.toString()}`);
  }

  async uploadResource(resourceData: {
    title: string;
    description: string;
    type: string;
    course_id?: string;
    file?: any;
    url?: string;
  }): Promise<ApiResponse<Resource>> {
    const formData = new FormData();
    formData.append('title', resourceData.title);
    formData.append('description', resourceData.description);
    formData.append('type', resourceData.type);
    if (resourceData.course_id) formData.append('course_id', resourceData.course_id);
    if (resourceData.file) formData.append('file', resourceData.file);
    if (resourceData.url) formData.append('url', resourceData.url);

    return this.request<Resource>('resources', '/resources', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // === NOTIFICATION SERVICE ===
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    read?: boolean;
  }): Promise<PaginatedResponse<Notification>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());

    return this.request<Notification[]>('notifications', `/notifications?${queryParams.toString()}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.request<void>('notifications', `/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // === LLM GATEWAY ===
  async sendChatMessage(request: LLMChatRequest): Promise<ApiResponse<LLMChatResponse>> {
    return this.request<LLMChatResponse>('llm', '/chat', {
      method: 'POST',
      data: request,
    });
  }

  async generateContent(prompt: string, type: string): Promise<ApiResponse<{
    content: string;
    metadata: Record<string, any>;
  }>> {
    return this.request<{ content: string; metadata: Record<string, any> }>('llm', '/generate', {
      method: 'POST',
      data: { prompt, type },
    });
  }

  // === FILE SERVICE ===
  async uploadFile(file: any, type: string): Promise<ApiResponse<{
    url: string;
    filename: string;
    size: number;
    mime_type: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request<{
      url: string;
      filename: string;
      size: number;
      mime_type: string;
    }>('files', '/upload', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // === HEALTH CHECK ===
  async getGatewayHealth(): Promise<ApiResponse<{
    status: string;
    services: Record<string, any>;
    uptime: number;
  }>> {
    return this.request<{
      status: string;
      services: Record<string, any>;
      uptime: number;
    }>('', '/health');
  }
}

// Instancia singleton
export const mobileApi = new MobileApiService();