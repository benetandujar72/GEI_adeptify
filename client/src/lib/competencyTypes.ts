// Tipos para el sistema de competencias

export interface Student {
  id: number;
  name: string;
  group_name: string;
  email: string;
  gender: 'M' | 'F';
}

export interface Criteria {
  id: number;
  competencyId: number;
  code: string;
  description: string;
}

export interface Grade {
  id?: number;
  studentId: number;
  criteriaId: number;
  value: GradeValue;
  createdAt?: Date;
  updatedAt?: Date;
}

export type GradeValue = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | '';

export interface CompetencyType {
  id: number;
  name: string;
  description: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
}

export interface Group {
  id: number;
  name: string;
  courseId: number;
}

export interface Competency {
  id: number;
  name: string;
  description: string;
  competencyTypeId: number;
  courseId: number;
}

export interface Evaluation {
  id?: number;
  studentId: number;
  competencyId: number;
  grades: Grade[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EvaluationSummary {
  studentId: number;
  studentName: string;
  competencyId: number;
  competencyName: string;
  averageGrade: number;
  totalCriteria: number;
  completedCriteria: number;
  grades: Grade[];
}

// Tipos para formularios
export interface EvaluationFormData {
  studentId: number;
  competencyId: number;
  grades: Record<number, GradeValue>; // criteriaId -> grade
}

// Tipos para filtros
export interface EvaluationFilters {
  competencyTypeId?: number;
  courseId?: number;
  groupId?: number;
  competencyId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

// Tipos para estadísticas
export interface CompetencyStats {
  competencyId: number;
  competencyName: string;
  totalStudents: number;
  averageGrade: number;
  gradeDistribution: Record<GradeValue, number>;
  completionRate: number;
}

export interface GroupStats {
  groupId: number;
  groupName: number;
  totalStudents: number;
  competencies: CompetencyStats[];
  overallAverage: number;
}

// Tipos para exportación
export interface ExportData {
  evaluations: Evaluation[];
  students: Student[];
  criteria: Criteria[];
  competencies: Competency[];
  metadata: {
    exportDate: Date;
    filters: EvaluationFilters;
    totalRecords: number;
  };
} 