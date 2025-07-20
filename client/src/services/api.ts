// Configuración base de la API
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

// Tipos de respuesta de la API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'superadmin' | 'institute_admin' | 'teacher' | 'student';
    institute_id?: string;
  };
  institute?: {
    id: string;
    name: string;
    code: string;
  };
  token?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'institute_admin' | 'teacher' | 'student';
  institute_id?: string;
}

export interface DashboardStats {
  moduleStats: Array<{
    id: string;
    name: string;
    count: number;
    change: number;
    status: 'active' | 'inactive' | 'warning';
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    user: string;
    status: 'completed' | 'pending' | 'error';
  }>;
  systemStatus: {
    database: 'online' | 'offline';
    aiServices: 'online' | 'offline';
    modules: Record<string, boolean>;
    lastUpdate: string;
  };
}

// Clase principal de la API
class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Método helper para hacer peticiones HTTP
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir token de autenticación si existe
    const token = localStorage.getItem('auth_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Métodos de autenticación
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async checkSession(): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/session');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Métodos del dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Métodos de institutos
  async getInstitutes(): Promise<ApiResponse<Array<{ id: string; name: string; code: string }>>> {
    return this.request('/institutes');
  }

  async createInstitute(data: { name: string; code: string }): Promise<ApiResponse> {
    return this.request('/institutes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Métodos de usuarios
  async getUsers(instituteId?: string): Promise<ApiResponse<Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    institute_id?: string;
  }>>> {
    const params = instituteId ? `?institute_id=${instituteId}` : '';
    return this.request(`/users${params}`);
  }

  async createUser(userData: RegisterRequest): Promise<ApiResponse> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Partial<RegisterRequest>): Promise<ApiResponse> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse> {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Métodos de años académicos
  async getAcademicYears(instituteId: string): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
  }>>> {
    return this.request(`/academic-years?institute_id=${instituteId}`);
  }

  async createAcademicYear(data: {
    name: string;
    start_date: string;
    end_date: string;
    institute_id: string;
  }): Promise<ApiResponse> {
    return this.request('/academic-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Métodos de módulos
  async getModules(instituteId: string): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    is_active: boolean;
    config: Record<string, any>;
  }>>> {
    return this.request(`/modules?institute_id=${instituteId}`);
  }

  async updateModule(moduleId: string, data: {
    is_active: boolean;
    config?: Record<string, any>;
  }): Promise<ApiResponse> {
    return this.request(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Métodos de AI/Chatbot
  async sendChatMessage(message: string, context?: string): Promise<ApiResponse<{
    response: string;
    sources?: Array<{ title: string; url: string }>;
  }>> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async generateContent(prompt: string, type: 'evaluation' | 'report' | 'summary'): Promise<ApiResponse<{
    content: string;
    metadata?: Record<string, any>;
  }>> {
    return this.request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, type }),
    });
  }

  // Métodos de auditoría
  async getAuditLogs(filters?: {
    user_id?: string;
    action?: string;
    module?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<ApiResponse<Array<{
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    module: string;
    details: Record<string, any>;
    ip_address: string;
    user_agent: string;
    created_at: string;
  }>>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/audit/logs?${params.toString()}`);
  }

  // Métodos de configuración
  async getSystemConfig(): Promise<ApiResponse<{
    ai_services: {
      openai: { enabled: boolean; api_key?: string };
      gemini: { enabled: boolean; api_key?: string };
      claude: { enabled: boolean; api_key?: string };
    };
    modules: Record<string, { enabled: boolean; config: Record<string, any> }>;
    security: {
      session_timeout: number;
      max_login_attempts: number;
      password_policy: Record<string, any>;
    };
  }>> {
    return this.request('/config/system');
  }

  async updateSystemConfig(config: Record<string, any>): Promise<ApiResponse> {
    return this.request('/config/system', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Métodos de utilidad
  async uploadFile(file: File, type: 'document' | 'image' | 'resource'): Promise<ApiResponse<{
    url: string;
    filename: string;
    size: number;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/upload', {
      method: 'POST',
      headers: {
        // No incluir Content-Type para que el navegador lo establezca automáticamente con el boundary
      },
      body: formData,
    });
  }

  async getNotifications(): Promise<ApiResponse<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
  }>>> {
    return this.request('/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }
}

// Instancia singleton del servicio API
export const apiService = new ApiService(); 