// Configuración base para la nueva arquitectura de microservicios
const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL || 'https://gei.adeptify.es';

// Tipos de respuesta estandarizados
export interface MicroserviceResponse<T = any> {
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
  metadata?: {
    processingTime: number;
    service: string;
  };
}

export interface PaginatedResponse<T> extends MicroserviceResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos específicos de microservicios
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

export interface Communication {
  id: string;
  type: 'announcement' | 'message' | 'notification';
  title: string;
  content: string;
  sender_id: string;
  recipients: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'sent' | 'delivered' | 'read';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsData {
  period: string;
  metrics: {
    total_users: number;
    active_users: number;
    total_courses: number;
    total_students: number;
    completion_rate: number;
    engagement_score: number;
  };
  trends: {
    user_growth: number;
    course_enrollment: number;
    activity_increase: number;
  };
  top_performers: Array<{
    id: string;
    name: string;
    metric: string;
    value: number;
  }>;
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

// Clase principal para interactuar con microservicios
export class MicroservicesApiService {
  private gatewayURL: string;
  private requestId: number = 0;

  constructor(gatewayURL: string = GATEWAY_URL) {
    this.gatewayURL = gatewayURL;
  }

  // Método helper para hacer peticiones HTTP
  private async request<T>(
    service: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<MicroserviceResponse<T>> {
    const url = `${this.gatewayURL}/api/${service}${endpoint}`;
    const requestId = `req_${Date.now()}_${++this.requestId}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'User-Agent': 'GEI-Frontend/1.0',
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

      // Manejar errores HTTP
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${service}${endpoint}):`, error);
      throw error;
    }
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

  async getUserById(userId: string): Promise<MicroserviceResponse<User>> {
    return this.request<User>('users', `/users/${userId}`);
  }

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    institute_id?: string;
  }): Promise<MicroserviceResponse<User>> {
    return this.request<User>('users', '/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<MicroserviceResponse<User>> {
    return this.request<User>('users', `/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<MicroserviceResponse<void>> {
    return this.request<void>('users', `/users/${userId}`, {
      method: 'DELETE',
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

  async getStudentById(studentId: string): Promise<MicroserviceResponse<Student>> {
    return this.request<Student>('students', `/students/${studentId}`);
  }

  async createStudent(studentData: {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    grade: number;
    section: string;
    institute_id: string;
    birth_date: string;
  }): Promise<MicroserviceResponse<Student>> {
    return this.request<Student>('students', '/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(studentId: string, studentData: Partial<Student>): Promise<MicroserviceResponse<Student>> {
    return this.request<Student>('students', `/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
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

  async getCourseById(courseId: string): Promise<MicroserviceResponse<Course>> {
    return this.request<Course>('courses', `/courses/${courseId}`);
  }

  async createCourse(courseData: {
    course_code: string;
    name: string;
    description: string;
    credits: number;
    institute_id: string;
    teacher_id: string;
    academic_year_id: string;
    start_date: string;
    end_date: string;
  }): Promise<MicroserviceResponse<Course>> {
    return this.request<Course>('courses', '/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
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
    file?: File;
    url?: string;
  }): Promise<MicroserviceResponse<Resource>> {
    const formData = new FormData();
    formData.append('title', resourceData.title);
    formData.append('description', resourceData.description);
    formData.append('type', resourceData.type);
    if (resourceData.course_id) formData.append('course_id', resourceData.course_id);
    if (resourceData.file) formData.append('file', resourceData.file);
    if (resourceData.url) formData.append('url', resourceData.url);

    return this.request<Resource>('resources', '/resources', {
      method: 'POST',
      body: formData,
      headers: {}, // No Content-Type para FormData
    });
  }

  // === COMMUNICATION SERVICE ===
  async getCommunications(params?: {
    page?: number;
    limit?: number;
    type?: string;
    sender_id?: string;
    status?: string;
  }): Promise<PaginatedResponse<Communication>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.sender_id) queryParams.append('sender_id', params.sender_id);
    if (params?.status) queryParams.append('status', params.status);

    return this.request<Communication[]>('communications', `/communications?${queryParams.toString()}`);
  }

  async sendCommunication(communicationData: {
    type: string;
    title: string;
    content: string;
    recipients: string[];
    priority?: string;
    scheduled_at?: string;
  }): Promise<MicroserviceResponse<Communication>> {
    return this.request<Communication>('communications', '/communications', {
      method: 'POST',
      body: JSON.stringify(communicationData),
    });
  }

  // === ANALYTICS SERVICE ===
  async getAnalytics(params?: {
    period?: string;
    institute_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<MicroserviceResponse<AnalyticsData>> {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.institute_id) queryParams.append('institute_id', params.institute_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return this.request<AnalyticsData>('analytics', `/analytics?${queryParams.toString()}`);
  }

  // === LLM GATEWAY ===
  async sendChatMessage(request: LLMChatRequest): Promise<MicroserviceResponse<LLMChatResponse>> {
    return this.request<LLMChatResponse>('llm', '/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateContent(prompt: string, type: string): Promise<MicroserviceResponse<{
    content: string;
    metadata: Record<string, any>;
  }>> {
    return this.request<{ content: string; metadata: Record<string, any> }>('llm', '/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, type }),
    });
  }

  // === AUTH SERVICE ===
  async login(credentials: { email: string; password: string }): Promise<MicroserviceResponse<{
    user: User;
    token: string;
    refresh_token: string;
    expires_in: number;
  }>> {
    return this.request<{
      user: User;
      token: string;
      refresh_token: string;
      expires_in: number;
    }>('auth', '/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    institute_id?: string;
  }): Promise<MicroserviceResponse<{
    user: User;
    token: string;
  }>> {
    return this.request<{
      user: User;
      token: string;
    }>('auth', '/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshToken(refreshToken: string): Promise<MicroserviceResponse<{
    token: string;
    refresh_token: string;
    expires_in: number;
  }>> {
    return this.request<{
      token: string;
      refresh_token: string;
      expires_in: number;
    }>('auth', '/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout(): Promise<MicroserviceResponse<void>> {
    return this.request<void>('auth', '/logout', {
      method: 'POST',
    });
  }

  // === NOTIFICATION SERVICE ===
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    read?: boolean;
  }): Promise<PaginatedResponse<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());

    return this.request<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      created_at: string;
    }[]>('notifications', `/notifications?${queryParams.toString()}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<MicroserviceResponse<void>> {
    return this.request<void>('notifications', `/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // === FILE SERVICE ===
  async uploadFile(file: File, type: string): Promise<MicroserviceResponse<{
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
      body: formData,
      headers: {}, // No Content-Type para FormData
    });
  }

  // === SEARCH SERVICE ===
  async search(query: string, filters?: {
    type?: string;
    institute_id?: string;
    course_id?: string;
    date_range?: string;
  }): Promise<MicroserviceResponse<{
    results: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      url: string;
      relevance: number;
      metadata: Record<string, any>;
    }>;
    total: number;
    query_time: number;
  }>> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (filters?.type) searchParams.append('type', filters.type);
    if (filters?.institute_id) searchParams.append('institute_id', filters.institute_id);
    if (filters?.course_id) searchParams.append('course_id', filters.course_id);
    if (filters?.date_range) searchParams.append('date_range', filters.date_range);

    return this.request<{
      results: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        url: string;
        relevance: number;
        metadata: Record<string, any>;
      }>;
      total: number;
      query_time: number;
    }>('search', `/search?${searchParams.toString()}`);
  }

  // === HEALTH CHECK ===
  async getGatewayHealth(): Promise<MicroserviceResponse<{
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

  async getServiceMetrics(): Promise<MicroserviceResponse<{
    requests: Record<string, any>;
    responses: Record<string, any>;
    services: Record<string, any>;
    summary: Record<string, any>;
  }>> {
    return this.request<{
      requests: Record<string, any>;
      responses: Record<string, any>;
      services: Record<string, any>;
      summary: Record<string, any>;
    }>('', '/metrics');
  }
}

// Instancia singleton
export const microservicesApi = new MicroservicesApiService();