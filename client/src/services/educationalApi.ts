import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gei.adeptify.es/api';

// Configuración de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Tipos de datos
export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  academic_year: string;
  semester: number;
  credits: number;
  is_active: boolean;
  institute_id: string;
  institute_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Competency {
  id: string;
  name: string;
  code: string;
  description?: string;
  level: 'básico' | 'intermedio' | 'avanzado';
  weight: number;
  is_active: boolean;
  course_id: string;
  course_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Criterion {
  id: string;
  name: string;
  description?: string;
  max_score: number;
  weight: number;
  is_active: boolean;
  competency_id: string;
  competency_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  name: string;
  description?: string;
  type: 'examen' | 'trabajo' | 'proyecto' | 'presentación' | 'práctica' | 'otro';
  date: string;
  max_score: number;
  weight: number;
  is_active: boolean;
  course_id: string;
  course_name?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  student_id: string;
  student_name?: string;
  evaluation_id: string;
  evaluation_name?: string;
  criterion_id: string;
  criterion_name?: string;
  score: number;
  comments?: string;
  graded_by: string;
  graded_by_name?: string;
  graded_at: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  student_name?: string;
  course_id: string;
  course_name?: string;
  date: string;
  status: 'presente' | 'ausente' | 'justificado' | 'tardanza';
  comments?: string;
  recorded_by: string;
  recorded_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Statistics {
  general: {
    totalCourses: number;
    totalStudents: number;
    totalTeachers: number;
  };
  grades: {
    average_score?: number;
    min_score?: number;
    max_score?: number;
    total_grades?: number;
  };
  attendance: Array<{
    status: string;
    count: number;
  }>;
  course?: {
    course_name: string;
    total_evaluations: number;
    total_students: number;
    average_grade?: number;
  };
  student?: {
    student_name: string;
    total_evaluations: number;
    average_grade?: number;
    present_days: number;
    absent_days: number;
  };
}

// ========================================
// SERVICIOS DE CURSOS
// ========================================

export const coursesApi = {
  // Obtener todos los cursos
  getAll: async (): Promise<Course[]> => {
    const response = await api.get('/courses');
    return response.data.courses;
  },

  // Obtener un curso por ID
  getById: async (id: string): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return response.data.course;
  },

  // Crear un nuevo curso
  create: async (courseData: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> => {
    const response = await api.post('/courses', courseData);
    return response.data.course;
  },

  // Actualizar un curso
  update: async (id: string, courseData: Partial<Course>): Promise<Course> => {
    const response = await api.put(`/courses/${id}`, courseData);
    return response.data.course;
  },

  // Eliminar un curso
  delete: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },
};

// ========================================
// SERVICIOS DE COMPETENCIAS
// ========================================

export const competenciesApi = {
  // Obtener todas las competencias
  getAll: async (courseId?: string): Promise<Competency[]> => {
    const params = courseId ? { course_id: courseId } : {};
    const response = await api.get('/competencies', { params });
    return response.data.competencies;
  },

  // Obtener una competencia por ID
  getById: async (id: string): Promise<Competency> => {
    const response = await api.get(`/competencies/${id}`);
    return response.data.competency;
  },

  // Crear una nueva competencia
  create: async (competencyData: Omit<Competency, 'id' | 'created_at' | 'updated_at'>): Promise<Competency> => {
    const response = await api.post('/competencies', competencyData);
    return response.data.competency;
  },

  // Actualizar una competencia
  update: async (id: string, competencyData: Partial<Competency>): Promise<Competency> => {
    const response = await api.put(`/competencies/${id}`, competencyData);
    return response.data.competency;
  },

  // Eliminar una competencia
  delete: async (id: string): Promise<void> => {
    await api.delete(`/competencies/${id}`);
  },
};

// ========================================
// SERVICIOS DE CRITERIOS
// ========================================

export const criteriaApi = {
  // Obtener todos los criterios
  getAll: async (competencyId?: string): Promise<Criterion[]> => {
    const params = competencyId ? { competency_id: competencyId } : {};
    const response = await api.get('/criteria', { params });
    return response.data.criteria;
  },

  // Obtener un criterio por ID
  getById: async (id: string): Promise<Criterion> => {
    const response = await api.get(`/criteria/${id}`);
    return response.data.criterion;
  },

  // Crear un nuevo criterio
  create: async (criterionData: Omit<Criterion, 'id' | 'created_at' | 'updated_at'>): Promise<Criterion> => {
    const response = await api.post('/criteria', criterionData);
    return response.data.criterion;
  },

  // Actualizar un criterio
  update: async (id: string, criterionData: Partial<Criterion>): Promise<Criterion> => {
    const response = await api.put(`/criteria/${id}`, criterionData);
    return response.data.criterion;
  },

  // Eliminar un criterio
  delete: async (id: string): Promise<void> => {
    await api.delete(`/criteria/${id}`);
  },
};

// ========================================
// SERVICIOS DE EVALUACIONES
// ========================================

export const evaluationsApi = {
  // Obtener todas las evaluaciones
  getAll: async (courseId?: string): Promise<Evaluation[]> => {
    const params = courseId ? { course_id: courseId } : {};
    const response = await api.get('/evaluations', { params });
    return response.data.evaluations;
  },

  // Obtener una evaluación por ID
  getById: async (id: string): Promise<Evaluation> => {
    const response = await api.get(`/evaluations/${id}`);
    return response.data.evaluation;
  },

  // Crear una nueva evaluación
  create: async (evaluationData: Omit<Evaluation, 'id' | 'created_at' | 'updated_at'>): Promise<Evaluation> => {
    const response = await api.post('/evaluations', evaluationData);
    return response.data.evaluation;
  },

  // Actualizar una evaluación
  update: async (id: string, evaluationData: Partial<Evaluation>): Promise<Evaluation> => {
    const response = await api.put(`/evaluations/${id}`, evaluationData);
    return response.data.evaluation;
  },

  // Eliminar una evaluación
  delete: async (id: string): Promise<void> => {
    await api.delete(`/evaluations/${id}`);
  },
};

// ========================================
// SERVICIOS DE CALIFICACIONES
// ========================================

export const gradesApi = {
  // Obtener todas las calificaciones
  getAll: async (studentId?: string, evaluationId?: string): Promise<Grade[]> => {
    const params: any = {};
    if (studentId) params.student_id = studentId;
    if (evaluationId) params.evaluation_id = evaluationId;
    
    const response = await api.get('/grades', { params });
    return response.data.grades;
  },

  // Obtener una calificación por ID
  getById: async (id: string): Promise<Grade> => {
    const response = await api.get(`/grades/${id}`);
    return response.data.grade;
  },

  // Crear una nueva calificación
  create: async (gradeData: Omit<Grade, 'id' | 'graded_at' | 'created_at' | 'updated_at'>): Promise<Grade> => {
    const response = await api.post('/grades', gradeData);
    return response.data.grade;
  },

  // Actualizar una calificación
  update: async (id: string, gradeData: Partial<Grade>): Promise<Grade> => {
    const response = await api.put(`/grades/${id}`, gradeData);
    return response.data.grade;
  },

  // Eliminar una calificación
  delete: async (id: string): Promise<void> => {
    await api.delete(`/grades/${id}`);
  },

  // Obtener calificaciones por estudiante
  getByStudent: async (studentId: string): Promise<Grade[]> => {
    const response = await api.get('/grades', { params: { student_id: studentId } });
    return response.data.grades;
  },

  // Obtener calificaciones por evaluación
  getByEvaluation: async (evaluationId: string): Promise<Grade[]> => {
    const response = await api.get('/grades', { params: { evaluation_id: evaluationId } });
    return response.data.grades;
  },
};

// ========================================
// SERVICIOS DE ASISTENCIA
// ========================================

export const attendanceApi = {
  // Obtener toda la asistencia
  getAll: async (studentId?: string, courseId?: string, date?: string): Promise<Attendance[]> => {
    const params: any = {};
    if (studentId) params.student_id = studentId;
    if (courseId) params.course_id = courseId;
    if (date) params.date = date;
    
    const response = await api.get('/attendance', { params });
    return response.data.attendance;
  },

  // Obtener asistencia por ID
  getById: async (id: string): Promise<Attendance> => {
    const response = await api.get(`/attendance/${id}`);
    return response.data.attendance;
  },

  // Crear un nuevo registro de asistencia
  create: async (attendanceData: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>): Promise<Attendance> => {
    const response = await api.post('/attendance', attendanceData);
    return response.data.attendance;
  },

  // Actualizar un registro de asistencia
  update: async (id: string, attendanceData: Partial<Attendance>): Promise<Attendance> => {
    const response = await api.put(`/attendance/${id}`, attendanceData);
    return response.data.attendance;
  },

  // Eliminar un registro de asistencia
  delete: async (id: string): Promise<void> => {
    await api.delete(`/attendance/${id}`);
  },

  // Obtener asistencia por estudiante
  getByStudent: async (studentId: string): Promise<Attendance[]> => {
    const response = await api.get('/attendance', { params: { student_id: studentId } });
    return response.data.attendance;
  },

  // Obtener asistencia por curso
  getByCourse: async (courseId: string): Promise<Attendance[]> => {
    const response = await api.get('/attendance', { params: { course_id: courseId } });
    return response.data.attendance;
  },

  // Obtener asistencia por fecha
  getByDate: async (date: string): Promise<Attendance[]> => {
    const response = await api.get('/attendance', { params: { date } });
    return response.data.attendance;
  },
};

// ========================================
// SERVICIOS DE ESTADÍSTICAS
// ========================================

export const statisticsApi = {
  // Obtener estadísticas generales
  getGeneral: async (courseId?: string, studentId?: string): Promise<Statistics> => {
    const params: any = {};
    if (courseId) params.course_id = courseId;
    if (studentId) params.student_id = studentId;
    
    const response = await api.get('/statistics', { params });
    return response.data;
  },

  // Obtener estadísticas por curso
  getByCourse: async (courseId: string): Promise<Statistics> => {
    const response = await api.get('/statistics', { params: { course_id: courseId } });
    return response.data;
  },

  // Obtener estadísticas por estudiante
  getByStudent: async (studentId: string): Promise<Statistics> => {
    const response = await api.get('/statistics', { params: { student_id: studentId } });
    return response.data;
  },
};

// ========================================
// SERVICIOS DE USUARIOS (para obtener estudiantes y profesores)
// ========================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

export const usersApi = {
  // Obtener todos los usuarios
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data.users;
  },

  // Obtener estudiantes
  getStudents: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data.users.filter((user: User) => user.role === 'student');
  },

  // Obtener profesores
  getTeachers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data.users.filter((user: User) => 
      ['teacher', 'institute_admin', 'super_admin'].includes(user.role)
    );
  },
};

export default {
  courses: coursesApi,
  competencies: competenciesApi,
  criteria: criteriaApi,
  evaluations: evaluationsApi,
  grades: gradesApi,
  attendance: attendanceApi,
  statistics: statisticsApi,
  users: usersApi,
}; 