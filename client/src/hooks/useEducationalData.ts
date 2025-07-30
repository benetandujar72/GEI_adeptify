import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  coursesApi,
  competenciesApi,
  criteriaApi,
  evaluationsApi,
  gradesApi,
  attendanceApi,
  statisticsApi,
  usersApi,
  type Course,
  type Competency,
  type Criterion,
  type Evaluation,
  type Grade,
  type Attendance,
  type Statistics,
  type User,
} from '../services/educationalApi';

// ========================================
// HOOKS PARA CURSOS
// ========================================

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: coursesApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useCourse = (id: string) => {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: () => coursesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: coursesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Curso creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear el curso');
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) =>
      coursesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses', id] });
      toast.success('Curso actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar el curso');
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: coursesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Curso eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el curso');
    },
  });
};

// ========================================
// HOOKS PARA COMPETENCIAS
// ========================================

export const useCompetencies = (courseId?: string) => {
  return useQuery({
    queryKey: ['competencies', courseId],
    queryFn: () => competenciesApi.getAll(courseId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCompetency = (id: string) => {
  return useQuery({
    queryKey: ['competencies', 'detail', id],
    queryFn: () => competenciesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCompetency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: competenciesApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competencies', variables.course_id] });
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      toast.success('Competencia creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear la competencia');
    },
  });
};

export const useUpdateCompetency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Competency> }) =>
      competenciesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      queryClient.invalidateQueries({ queryKey: ['competencies', 'detail', id] });
      toast.success('Competencia actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar la competencia');
    },
  });
};

export const useDeleteCompetency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: competenciesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      toast.success('Competencia eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar la competencia');
    },
  });
};

// ========================================
// HOOKS PARA CRITERIOS
// ========================================

export const useCriteria = (competencyId?: string) => {
  return useQuery({
    queryKey: ['criteria', competencyId],
    queryFn: () => criteriaApi.getAll(competencyId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCriterion = (id: string) => {
  return useQuery({
    queryKey: ['criteria', 'detail', id],
    queryFn: () => criteriaApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCriterion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: criteriaApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['criteria', variables.competency_id] });
      queryClient.invalidateQueries({ queryKey: ['criteria'] });
      toast.success('Criterio creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear el criterio');
    },
  });
};

export const useUpdateCriterion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Criterion> }) =>
      criteriaApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['criteria'] });
      queryClient.invalidateQueries({ queryKey: ['criteria', 'detail', id] });
      toast.success('Criterio actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar el criterio');
    },
  });
};

export const useDeleteCriterion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: criteriaApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criteria'] });
      toast.success('Criterio eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el criterio');
    },
  });
};

// ========================================
// HOOKS PARA EVALUACIONES
// ========================================

export const useEvaluations = (courseId?: string) => {
  return useQuery({
    queryKey: ['evaluations', courseId],
    queryFn: () => evaluationsApi.getAll(courseId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useEvaluation = (id: string) => {
  return useQuery({
    queryKey: ['evaluations', 'detail', id],
    queryFn: () => evaluationsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: evaluationsApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', variables.course_id] });
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Evaluación creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear la evaluación');
    },
  });
};

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Evaluation> }) =>
      evaluationsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations', 'detail', id] });
      toast.success('Evaluación actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar la evaluación');
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: evaluationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Evaluación eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar la evaluación');
    },
  });
};

// ========================================
// HOOKS PARA CALIFICACIONES
// ========================================

export const useGrades = (studentId?: string, evaluationId?: string) => {
  return useQuery({
    queryKey: ['grades', studentId, evaluationId],
    queryFn: () => gradesApi.getAll(studentId, evaluationId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useGrade = (id: string) => {
  return useQuery({
    queryKey: ['grades', 'detail', id],
    queryFn: () => gradesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: gradesApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grades', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['grades', undefined, variables.evaluation_id] });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Calificación creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear la calificación');
    },
  });
};

export const useUpdateGrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Grade> }) =>
      gradesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grades', 'detail', id] });
      toast.success('Calificación actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar la calificación');
    },
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: gradesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Calificación eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar la calificación');
    },
  });
};

// ========================================
// HOOKS PARA ASISTENCIA
// ========================================

export const useAttendance = (studentId?: string, courseId?: string, date?: string) => {
  return useQuery({
    queryKey: ['attendance', studentId, courseId, date],
    queryFn: () => attendanceApi.getAll(studentId, courseId, date),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAttendanceRecord = (id: string) => {
  return useQuery({
    queryKey: ['attendance', 'detail', id],
    queryFn: () => attendanceApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: attendanceApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['attendance', undefined, variables.course_id] });
      queryClient.invalidateQueries({ queryKey: ['attendance', undefined, undefined, variables.date] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Asistencia registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al registrar la asistencia');
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Attendance> }) =>
      attendanceApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'detail', id] });
      toast.success('Asistencia actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar la asistencia');
    },
  });
};

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: attendanceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Asistencia eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar la asistencia');
    },
  });
};

// ========================================
// HOOKS PARA ESTADÍSTICAS
// ========================================

export const useStatistics = (courseId?: string, studentId?: string) => {
  return useQuery({
    queryKey: ['statistics', courseId, studentId],
    queryFn: () => statisticsApi.getGeneral(courseId, studentId),
    staleTime: 2 * 60 * 1000, // 2 minutos para estadísticas
  });
};

export const useCourseStatistics = (courseId: string) => {
  return useQuery({
    queryKey: ['statistics', 'course', courseId],
    queryFn: () => statisticsApi.getByCourse(courseId),
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentStatistics = (studentId: string) => {
  return useQuery({
    queryKey: ['statistics', 'student', studentId],
    queryFn: () => statisticsApi.getByStudent(studentId),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
};

// ========================================
// HOOKS PARA USUARIOS
// ========================================

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useStudents = () => {
  return useQuery({
    queryKey: ['users', 'students'],
    queryFn: usersApi.getStudents,
    staleTime: 10 * 60 * 1000,
  });
};

export const useTeachers = () => {
  return useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: usersApi.getTeachers,
    staleTime: 10 * 60 * 1000,
  });
}; 