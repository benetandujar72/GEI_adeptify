import { gradesApi, attendanceApi, statisticsApi, coursesApi, evaluationsApi } from '../educationalApi';

export interface AcademicAnalysis {
  studentId: string;
  courseId?: string;
  period: 'week' | 'month' | 'semester' | 'year';
  analysis: {
    performance: {
      averageGrade: number;
      gradeTrend: 'improving' | 'declining' | 'stable';
      gradeDistribution: {
        excellent: number;
        good: number;
        average: number;
        below: number;
      };
    };
    attendance: {
      rate: number;
      trend: 'improving' | 'declining' | 'stable';
      absences: number;
      tardies: number;
    };
    engagement: {
      participationScore: number;
      assignmentCompletion: number;
      classParticipation: number;
    };
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface CourseAnalysis {
  courseId: string;
  period: 'week' | 'month' | 'semester' | 'year';
  analysis: {
    overallPerformance: {
      averageGrade: number;
      gradeDistribution: {
        excellent: number;
        good: number;
        average: number;
        below: number;
      };
      attendanceRate: number;
    };
    topPerformers: Array<{
      studentId: string;
      studentName: string;
      averageGrade: number;
      attendanceRate: number;
    }>;
    strugglingStudents: Array<{
      studentId: string;
      studentName: string;
      averageGrade: number;
      attendanceRate: number;
      riskFactors: string[];
    }>;
    evaluationAnalysis: Array<{
      evaluationId: string;
      evaluationName: string;
      averageScore: number;
      completionRate: number;
      difficultyLevel: 'easy' | 'medium' | 'hard';
    }>;
    recommendations: string[];
  };
}

export interface ComparativeAnalysis {
  comparisonType: 'students' | 'courses' | 'evaluations';
  metrics: string[];
  data: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
    rank: number;
    percentile: number;
  }>;
  insights: string[];
}

class AcademicDataServer {
  /**
   * Analiza el rendimiento académico de un estudiante
   */
  async analyzeStudentPerformance(
    studentId: string, 
    courseId?: string, 
    period: 'week' | 'month' | 'semester' | 'year' = 'semester'
  ): Promise<AcademicAnalysis> {
    try {
      // Obtener datos del estudiante
      const [grades, attendance, stats] = await Promise.all([
        gradesApi.getAll(studentId),
        attendanceApi.getAll(studentId),
        statisticsApi.getByStudent(studentId)
      ]);

      // Filtrar por curso si se especifica
      const filteredGrades = courseId 
        ? grades.filter(g => g.evaluation_id && this.getEvaluationCourseId(g.evaluation_id) === courseId)
        : grades;

      const filteredAttendance = courseId 
        ? attendance.filter(a => a.course_id === courseId)
        : attendance;

      // Calcular métricas de rendimiento
      const averageGrade = filteredGrades.length > 0 
        ? filteredGrades.reduce((sum, g) => sum + g.score, 0) / filteredGrades.length 
        : 0;

      // Analizar tendencia de calificaciones
      const gradeTrend = this.analyzeGradeTrend(filteredGrades);

      // Distribución de calificaciones
      const gradeDistribution = this.calculateGradeDistribution(filteredGrades);

      // Métricas de asistencia
      const attendanceRate = filteredAttendance.length > 0 
        ? (filteredAttendance.filter(a => a.status === 'presente').length / filteredAttendance.length) * 100
        : 0;

      const absences = filteredAttendance.filter(a => a.status === 'ausente').length;
      const tardies = filteredAttendance.filter(a => a.status === 'tardanza').length;

      // Análisis de participación (simulado)
      const participationScore = this.calculateParticipationScore(filteredGrades, filteredAttendance);
      const assignmentCompletion = this.calculateAssignmentCompletion(filteredGrades);
      const classParticipation = this.calculateClassParticipation(filteredAttendance);

      // Generar recomendaciones
      const recommendations = this.generateStudentRecommendations(
        averageGrade, 
        attendanceRate, 
        participationScore,
        gradeTrend
      );

      // Determinar nivel de riesgo
      const riskLevel = this.calculateRiskLevel(averageGrade, attendanceRate, participationScore);

      return {
        studentId,
        courseId,
        period,
        analysis: {
          performance: {
            averageGrade,
            gradeTrend,
            gradeDistribution
          },
          attendance: {
            rate: attendanceRate,
            trend: this.analyzeAttendanceTrend(filteredAttendance),
            absences,
            tardies
          },
          engagement: {
            participationScore,
            assignmentCompletion,
            classParticipation
          },
          recommendations,
          riskLevel
        }
      };
    } catch (error) {
      console.error('Error analyzing student performance:', error);
      throw new Error('No se pudo analizar el rendimiento del estudiante');
    }
  }

  /**
   * Analiza el rendimiento de un curso completo
   */
  async analyzeCoursePerformance(
    courseId: string, 
    period: 'week' | 'month' | 'semester' | 'year' = 'semester'
  ): Promise<CourseAnalysis> {
    try {
      // Obtener datos del curso
      const [course, evaluations, grades, attendance, stats] = await Promise.all([
        coursesApi.getById(courseId),
        evaluationsApi.getAll(courseId),
        gradesApi.getAll(),
        attendanceApi.getAll(undefined, courseId),
        statisticsApi.getByCourse(courseId)
      ]);

      // Filtrar calificaciones del curso
      const courseGrades = grades.filter(g => 
        evaluations.some(e => e.id === g.evaluation_id)
      );

      // Calcular rendimiento general
      const averageGrade = courseGrades.length > 0 
        ? courseGrades.reduce((sum, g) => sum + g.score, 0) / courseGrades.length 
        : 0;

      const gradeDistribution = this.calculateGradeDistribution(courseGrades);
      const attendanceRate = attendance.length > 0 
        ? (attendance.filter(a => a.status === 'presente').length / attendance.length) * 100
        : 0;

      // Identificar mejores y peores estudiantes
      const studentPerformance = this.calculateStudentPerformance(courseGrades, attendance);
      const topPerformers = studentPerformance
        .sort((a, b) => b.averageGrade - a.averageGrade)
        .slice(0, 5);

      const strugglingStudents = studentPerformance
        .filter(s => s.averageGrade < 6.0 || s.attendanceRate < 80)
        .sort((a, b) => a.averageGrade - b.averageGrade)
        .slice(0, 5)
        .map(s => ({
          ...s,
          riskFactors: this.identifyRiskFactors(s)
        }));

      // Análisis de evaluaciones
      const evaluationAnalysis = evaluations.map(evaluation => {
        const evalGrades = courseGrades.filter(g => g.evaluation_id === evaluation.id);
        const averageScore = evalGrades.length > 0 
          ? evalGrades.reduce((sum, g) => sum + g.score, 0) / evalGrades.length 
          : 0;
        
        return {
          evaluationId: evaluation.id,
          evaluationName: evaluation.name,
          averageScore,
          completionRate: (evalGrades.length / (stats?.totalStudents || 1)) * 100,
          difficultyLevel: this.calculateDifficultyLevel(averageScore)
        };
      });

      // Generar recomendaciones
      const recommendations = this.generateCourseRecommendations(
        averageGrade,
        attendanceRate,
        strugglingStudents.length,
        evaluationAnalysis
      );

      return {
        courseId,
        period,
        analysis: {
          overallPerformance: {
            averageGrade,
            gradeDistribution,
            attendanceRate
          },
          topPerformers,
          strugglingStudents,
          evaluationAnalysis,
          recommendations
        }
      };
    } catch (error) {
      console.error('Error analyzing course performance:', error);
      throw new Error('No se pudo analizar el rendimiento del curso');
    }
  }

  /**
   * Realiza análisis comparativo entre diferentes entidades
   */
  async performComparativeAnalysis(
    comparisonType: 'students' | 'courses' | 'evaluations',
    entityIds: string[],
    metrics: string[]
  ): Promise<ComparativeAnalysis> {
    try {
      let data: Array<{ id: string; name: string; metrics: Record<string, number> }> = [];

      switch (comparisonType) {
        case 'students':
          data = await this.compareStudents(entityIds, metrics);
          break;
        case 'courses':
          data = await this.compareCourses(entityIds, metrics);
          break;
        case 'evaluations':
          data = await this.compareEvaluations(entityIds, metrics);
          break;
      }

      // Calcular rankings y percentiles
      const rankedData = data.map(item => {
        const values = Object.values(item.metrics);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        // Calcular percentil
        const sortedValues = [...values].sort((a, b) => a - b);
        const percentile = (sortedValues.indexOf(average) / sortedValues.length) * 100;

        return {
          ...item,
          rank: 0, // Se calculará después
          percentile
        };
      });

      // Asignar rankings
      rankedData.sort((a, b) => {
        const aAvg = Object.values(a.metrics).reduce((sum, val) => sum + val, 0) / Object.values(a.metrics).length;
        const bAvg = Object.values(b.metrics).reduce((sum, val) => sum + val, 0) / Object.values(b.metrics).length;
        return bAvg - aAvg;
      });

      rankedData.forEach((item, index) => {
        item.rank = index + 1;
      });

      // Generar insights
      const insights = this.generateComparativeInsights(rankedData, comparisonType);

      return {
        comparisonType,
        metrics,
        data: rankedData,
        insights
      };
    } catch (error) {
      console.error('Error performing comparative analysis:', error);
      throw new Error('No se pudo realizar el análisis comparativo');
    }
  }

  /**
   * Predice el rendimiento futuro basado en datos históricos
   */
  async predictFuturePerformance(
    studentId: string,
    courseId: string,
    predictionPeriod: 'next_week' | 'next_month' | 'next_semester'
  ): Promise<{
    predictedGrade: number;
    confidence: number;
    factors: string[];
    recommendations: string[];
  }> {
    try {
      // Obtener datos históricos
      const [grades, attendance] = await Promise.all([
        gradesApi.getAll(studentId),
        attendanceApi.getAll(studentId, courseId)
      ]);

      // Filtrar datos del curso
      const courseGrades = grades.filter(g => 
        this.getEvaluationCourseId(g.evaluation_id) === courseId
      );

      // Calcular tendencias
      const gradeTrend = this.calculateLinearTrend(courseGrades.map(g => g.score));
      const attendanceTrend = this.calculateAttendanceTrend(attendance);

      // Predicción basada en tendencias
      const currentAverage = courseGrades.length > 0 
        ? courseGrades.reduce((sum, g) => sum + g.score, 0) / courseGrades.length 
        : 5.0;

      const predictedGrade = Math.max(0, Math.min(10, currentAverage + gradeTrend));
      const confidence = this.calculatePredictionConfidence(courseGrades, attendance);

      // Factores que influyen en la predicción
      const factors = this.identifyPredictionFactors(gradeTrend, attendanceTrend, currentAverage);

      // Recomendaciones para mejorar
      const recommendations = this.generatePredictionRecommendations(
        predictedGrade,
        gradeTrend,
        attendanceTrend
      );

      return {
        predictedGrade,
        confidence,
        factors,
        recommendations
      };
    } catch (error) {
      console.error('Error predicting future performance:', error);
      throw new Error('No se pudo predecir el rendimiento futuro');
    }
  }

  // Métodos auxiliares privados

  private analyzeGradeTrend(grades: any[]): 'improving' | 'declining' | 'stable' {
    if (grades.length < 2) return 'stable';
    
    const sortedGrades = grades.sort((a, b) => 
      new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime()
    );
    
    const recentGrades = sortedGrades.slice(-3);
    const olderGrades = sortedGrades.slice(0, -3);
    
    if (recentGrades.length === 0 || olderGrades.length === 0) return 'stable';
    
    const recentAvg = recentGrades.reduce((sum, g) => sum + g.score, 0) / recentGrades.length;
    const olderAvg = olderGrades.reduce((sum, g) => sum + g.score, 0) / olderGrades.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  }

  private calculateGradeDistribution(grades: any[]) {
    const distribution = { excellent: 0, good: 0, average: 0, below: 0 };
    
    grades.forEach(grade => {
      if (grade.score >= 9) distribution.excellent++;
      else if (grade.score >= 7) distribution.good++;
      else if (grade.score >= 5) distribution.average++;
      else distribution.below++;
    });
    
    return distribution;
  }

  private calculateParticipationScore(grades: any[], attendance: any[]): number {
    const gradeScore = grades.length > 0 ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length : 0;
    const attendanceScore = attendance.length > 0 
      ? (attendance.filter(a => a.status === 'presente').length / attendance.length) * 100 
      : 0;
    
    return (gradeScore * 0.7 + attendanceScore * 0.3) / 10;
  }

  private calculateAssignmentCompletion(grades: any[]): number {
    return grades.length > 0 ? grades.length * 10 : 0; // Simulado
  }

  private calculateClassParticipation(attendance: any[]): number {
    return attendance.length > 0 
      ? (attendance.filter(a => a.status === 'presente').length / attendance.length) * 100 
      : 0;
  }

  private generateStudentRecommendations(
    averageGrade: number, 
    attendanceRate: number, 
    participationScore: number,
    gradeTrend: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (averageGrade < 6) {
      recommendations.push('Considerar tutoría adicional para mejorar calificaciones');
    }
    
    if (attendanceRate < 80) {
      recommendations.push('Mejorar la asistencia regular a clases');
    }
    
    if (participationScore < 0.6) {
      recommendations.push('Aumentar la participación en actividades de clase');
    }
    
    if (gradeTrend === 'declining') {
      recommendations.push('Revisar estrategias de estudio y buscar apoyo académico');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Mantener el buen rendimiento actual');
    }
    
    return recommendations;
  }

  private calculateRiskLevel(averageGrade: number, attendanceRate: number, participationScore: number): 'low' | 'medium' | 'high' {
    const riskScore = (10 - averageGrade) * 0.4 + (100 - attendanceRate) * 0.3 + (1 - participationScore) * 0.3;
    
    if (riskScore < 2) return 'low';
    if (riskScore < 4) return 'medium';
    return 'high';
  }

  private analyzeAttendanceTrend(attendance: any[]): 'improving' | 'declining' | 'stable' {
    if (attendance.length < 2) return 'stable';
    
    const sortedAttendance = attendance.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const recentAttendance = sortedAttendance.slice(-5);
    const olderAttendance = sortedAttendance.slice(0, -5);
    
    if (recentAttendance.length === 0 || olderAttendance.length === 0) return 'stable';
    
    const recentRate = recentAttendance.filter(a => a.status === 'presente').length / recentAttendance.length;
    const olderRate = olderAttendance.filter(a => a.status === 'presente').length / olderAttendance.length;
    
    const difference = recentRate - olderRate;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  private calculateStudentPerformance(grades: any[], attendance: any[]) {
    const studentMap = new Map();
    
    grades.forEach(grade => {
      if (!studentMap.has(grade.student_id)) {
        studentMap.set(grade.student_id, {
          studentId: grade.student_id,
          studentName: grade.student_name,
          grades: [],
          attendance: []
        });
      }
      studentMap.get(grade.student_id).grades.push(grade);
    });
    
    attendance.forEach(record => {
      if (studentMap.has(record.student_id)) {
        studentMap.get(record.student_id).attendance.push(record);
      }
    });
    
    return Array.from(studentMap.values()).map(student => {
      const averageGrade = student.grades.length > 0 
        ? student.grades.reduce((sum: number, g: any) => sum + g.score, 0) / student.grades.length 
        : 0;
      
      const attendanceRate = student.attendance.length > 0 
        ? (student.attendance.filter((a: any) => a.status === 'presente').length / student.attendance.length) * 100 
        : 0;
      
      return {
        studentId: student.studentId,
        studentName: student.studentName,
        averageGrade,
        attendanceRate
      };
    });
  }

  private identifyRiskFactors(student: any): string[] {
    const factors: string[] = [];
    
    if (student.averageGrade < 6) factors.push('Calificaciones bajas');
    if (student.attendanceRate < 80) factors.push('Asistencia irregular');
    if (student.averageGrade < 5) factors.push('Riesgo de reprobación');
    
    return factors;
  }

  private calculateDifficultyLevel(averageScore: number): 'easy' | 'medium' | 'hard' {
    if (averageScore >= 8) return 'easy';
    if (averageScore >= 6) return 'medium';
    return 'hard';
  }

  private generateCourseRecommendations(
    averageGrade: number,
    attendanceRate: number,
    strugglingStudentsCount: number,
    evaluationAnalysis: any[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (averageGrade < 6) {
      recommendations.push('Revisar la metodología de enseñanza y materiales del curso');
    }
    
    if (attendanceRate < 80) {
      recommendations.push('Implementar estrategias para mejorar la asistencia');
    }
    
    if (strugglingStudentsCount > 5) {
      recommendations.push('Considerar sesiones de refuerzo para estudiantes con dificultades');
    }
    
    const difficultEvaluations = evaluationAnalysis.filter(e => e.difficultyLevel === 'hard');
    if (difficultEvaluations.length > 2) {
      recommendations.push('Revisar la dificultad de las evaluaciones');
    }
    
    return recommendations;
  }

  private async compareStudents(studentIds: string[], metrics: string[]) {
    const data = [];
    
    for (const studentId of studentIds) {
      const [grades, attendance] = await Promise.all([
        gradesApi.getAll(studentId),
        attendanceApi.getAll(studentId)
      ]);
      
      const studentMetrics: Record<string, number> = {};
      
      if (metrics.includes('average_grade')) {
        studentMetrics.average_grade = grades.length > 0 
          ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length 
          : 0;
      }
      
      if (metrics.includes('attendance_rate')) {
        studentMetrics.attendance_rate = attendance.length > 0 
          ? (attendance.filter(a => a.status === 'presente').length / attendance.length) * 100 
          : 0;
      }
      
      if (metrics.includes('participation_score')) {
        studentMetrics.participation_score = this.calculateParticipationScore(grades, attendance);
      }
      
      data.push({
        id: studentId,
        name: grades[0]?.student_name || `Estudiante ${studentId}`,
        metrics: studentMetrics
      });
    }
    
    return data;
  }

  private async compareCourses(courseIds: string[], metrics: string[]) {
    const data = [];
    
    for (const courseId of courseIds) {
      const [course, grades, attendance] = await Promise.all([
        coursesApi.getById(courseId),
        gradesApi.getAll(),
        attendanceApi.getAll(undefined, courseId)
      ]);
      
      const courseGrades = grades.filter(g => 
        this.getEvaluationCourseId(g.evaluation_id) === courseId
      );
      
      const courseMetrics: Record<string, number> = {};
      
      if (metrics.includes('average_grade')) {
        courseMetrics.average_grade = courseGrades.length > 0 
          ? courseGrades.reduce((sum, g) => sum + g.score, 0) / courseGrades.length 
          : 0;
      }
      
      if (metrics.includes('attendance_rate')) {
        courseMetrics.attendance_rate = attendance.length > 0 
          ? (attendance.filter(a => a.status === 'presente').length / attendance.length) * 100 
          : 0;
      }
      
      if (metrics.includes('completion_rate')) {
        courseMetrics.completion_rate = courseGrades.length > 0 ? 100 : 0; // Simulado
      }
      
      data.push({
        id: courseId,
        name: course.name,
        metrics: courseMetrics
      });
    }
    
    return data;
  }

  private async compareEvaluations(evaluationIds: string[], metrics: string[]) {
    const data = [];
    
    for (const evaluationId of evaluationIds) {
      const [evaluation, grades] = await Promise.all([
        evaluationsApi.getById(evaluationId),
        gradesApi.getAll(undefined, evaluationId)
      ]);
      
      const evaluationMetrics: Record<string, number> = {};
      
      if (metrics.includes('average_score')) {
        evaluationMetrics.average_score = grades.length > 0 
          ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length 
          : 0;
      }
      
      if (metrics.includes('completion_rate')) {
        evaluationMetrics.completion_rate = grades.length > 0 ? 100 : 0; // Simulado
      }
      
      if (metrics.includes('difficulty_level')) {
        const avgScore = grades.length > 0 
          ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length 
          : 0;
        evaluationMetrics.difficulty_level = avgScore < 6 ? 3 : avgScore < 8 ? 2 : 1;
      }
      
      data.push({
        id: evaluationId,
        name: evaluation.name,
        metrics: evaluationMetrics
      });
    }
    
    return data;
  }

  private generateComparativeInsights(data: any[], comparisonType: string): string[] {
    const insights: string[] = [];
    
    if (data.length === 0) return insights;
    
    const topPerformer = data[0];
    const bottomPerformer = data[data.length - 1];
    
    insights.push(`${topPerformer.name} es el mejor rendimiento en ${comparisonType}`);
    insights.push(`${bottomPerformer.name} necesita apoyo adicional`);
    
    const averageValues = data.map(item => 
      Object.values(item.metrics).reduce((sum: number, val: number) => sum + val, 0) / Object.values(item.metrics).length
    );
    
    const overallAverage = averageValues.reduce((sum, val) => sum + val, 0) / averageValues.length;
    insights.push(`El rendimiento promedio general es ${overallAverage.toFixed(2)}`);
    
    return insights;
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = values.reduce((sum, val, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private calculateAttendanceTrend(attendance: any[]): number {
    if (attendance.length < 2) return 0;
    
    const sortedAttendance = attendance.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const attendanceRates = sortedAttendance.map(record => 
      record.status === 'presente' ? 1 : 0
    );
    
    return this.calculateLinearTrend(attendanceRates);
  }

  private calculatePredictionConfidence(grades: any[], attendance: any[]): number {
    const gradeVariance = grades.length > 1 
      ? this.calculateVariance(grades.map(g => g.score))
      : 0;
    
    const attendanceVariance = attendance.length > 1
      ? this.calculateVariance(attendance.map(a => a.status === 'presente' ? 1 : 0))
      : 0;
    
    // Menor varianza = mayor confianza
    const confidence = Math.max(0, 100 - (gradeVariance + attendanceVariance) * 10);
    return Math.min(100, confidence);
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private identifyPredictionFactors(gradeTrend: number, attendanceTrend: number, currentAverage: number): string[] {
    const factors: string[] = [];
    
    if (gradeTrend > 0.1) factors.push('Tendencia positiva en calificaciones');
    if (gradeTrend < -0.1) factors.push('Tendencia negativa en calificaciones');
    if (attendanceTrend > 0.05) factors.push('Mejora en asistencia');
    if (attendanceTrend < -0.05) factors.push('Deterioro en asistencia');
    if (currentAverage > 8) factors.push('Rendimiento académico alto');
    if (currentAverage < 6) factors.push('Rendimiento académico bajo');
    
    return factors;
  }

  private generatePredictionRecommendations(
    predictedGrade: number,
    gradeTrend: number,
    attendanceTrend: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (predictedGrade < 6) {
      recommendations.push('Implementar plan de mejora académica inmediato');
    }
    
    if (gradeTrend < 0) {
      recommendations.push('Revisar estrategias de estudio y buscar tutoría');
    }
    
    if (attendanceTrend < 0) {
      recommendations.push('Mejorar la asistencia regular a clases');
    }
    
    if (predictedGrade >= 8) {
      recommendations.push('Mantener el excelente rendimiento actual');
    }
    
    return recommendations;
  }

  private getEvaluationCourseId(evaluationId: string): string {
    // Este método debería obtener el course_id de la evaluación
    // Por ahora retornamos un valor simulado
    return 'default-course-id';
  }
}

export const academicDataServer = new AcademicDataServer(); 