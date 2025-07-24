import { db } from '../index.js';
import { logger } from '../utils/logger.js';
import { auditService } from './audit-service.js';
import { 
  users, institutes, academicYears, competencies, evaluations, 
  attendance, guardDuties, surveys, resources, notifications 
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm';
import { z } from 'zod';

export interface ReportConfig {
  title: string;
  description?: string;
  type: 'evaluation' | 'attendance' | 'guard_duty' | 'survey' | 'audit' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters: Record<string, any>;
  columns: string[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  config: ReportConfig;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface ReportData {
  headers: string[];
  rows: any[][];
  summary?: Record<string, any>;
  charts?: any[];
  metadata: {
    generatedAt: Date;
    totalRows: number;
    filters: Record<string, any>;
  };
}

export class ReportService {
  /**
   * Genera un reporte basado en la configuración
   */
  async generateReport(config: ReportConfig, userId?: string, instituteId?: string): Promise<ReportData> {
    try {
      logger.info(`Generando reporte: ${config.title}`, { type: config.type, userId, instituteId });

      let data: any[] = [];
      let headers: string[] = [];
      let summary: Record<string, any> = {};

      switch (config.type) {
        case 'evaluation':
          data = await this.generateEvaluationReport(config, instituteId);
          break;
        case 'attendance':
          data = await this.generateAttendanceReport(config, instituteId);
          break;
        case 'guard_duty':
          data = await this.generateGuardDutyReport(config, instituteId);
          break;
        case 'survey':
          data = await this.generateSurveyReport(config, instituteId);
          break;
        case 'audit':
          data = await this.generateAuditReport(config, instituteId);
          break;
        case 'custom':
          data = await this.generateCustomReport(config, instituteId);
          break;
        default:
          throw new Error(`Tipo de reporte no soportado: ${config.type}`);
      }

      // Aplicar filtros
      data = this.applyFilters(data, config.filters);

      // Aplicar agrupación
      if (config.groupBy && config.groupBy.length > 0) {
        data = this.groupData(data, config.groupBy);
      }

      // Aplicar ordenamiento
      if (config.sortBy && config.sortBy.length > 0) {
        data = this.sortData(data, config.sortBy);
      }

      // Generar headers
      headers = this.generateHeaders(data, config.columns);

      // Generar resumen si se solicita
      if (config.includeSummary) {
        summary = this.generateSummary(data, config.type);
      }

      // Generar gráficos si se solicita
      const charts = config.includeCharts ? this.generateCharts(data, config.type) : [];

      // Registrar la generación del reporte
      await auditService.logAction({
        userId,
        instituteId,
        action: 'REPORT_GENERATED',
        resource: 'reports',
        details: {
          reportType: config.type,
          format: config.format,
          rowCount: data.length,
          filters: config.filters,
        },
      });

      return {
        headers,
        rows: data.map(row => this.flattenRow(row)),
        summary,
        charts,
        metadata: {
          generatedAt: new Date(),
          totalRows: data.length,
          filters: config.filters,
        },
      };

    } catch (error) {
      logger.error('Error generando reporte:', error);
      throw error;
    }
  }

  /**
   * Genera reporte de evaluaciones
   */
  private async generateEvaluationReport(config: ReportConfig, instituteId?: string): Promise<any[]> {
    const conditions = [];
    
    if (instituteId) {
      conditions.push(eq(evaluations.instituteId, instituteId));
    }

    if (config.filters.academicYearId) {
      conditions.push(eq(evaluations.academicYearId, config.filters.academicYearId));
    }

    if (config.filters.competencyId) {
      conditions.push(eq(evaluations.competencyId, config.filters.competencyId));
    }

    if (config.filters.startDate) {
      conditions.push(gte(evaluations.createdAt, new Date(config.filters.startDate)));
    }

    if (config.filters.endDate) {
      conditions.push(lte(evaluations.createdAt, new Date(config.filters.endDate)));
    }

    const query = db
      .select({
        id: evaluations.id,
        studentName: users.displayName,
        competencyName: competencies.description,
        score: evaluations.score,
        grade: evaluations.grade,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
      })
      .from(evaluations)
      .leftJoin(users, eq(evaluations.studentId, users.id))
      .leftJoin(competencies, eq(evaluations.competencyId, competencies.id));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Genera reporte de asistencia
   */
  private async generateAttendanceReport(config: ReportConfig, instituteId?: string): Promise<any[]> {
    const conditions = [];
    
    if (instituteId) {
      conditions.push(eq(attendance.instituteId, instituteId));
    }

    if (config.filters.academicYearId) {
      conditions.push(eq(attendance.academicYearId, config.filters.academicYearId));
    }

    if (config.filters.startDate) {
      conditions.push(gte(attendance.date, new Date(config.filters.startDate)));
    }

    if (config.filters.endDate) {
      conditions.push(lte(attendance.date, new Date(config.filters.endDate)));
    }

    const query = db
      .select({
        id: attendance.id,
        studentName: users.displayName,
        date: attendance.date,
        status: attendance.status,
        reason: attendance.reason,
        createdAt: attendance.createdAt,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.studentId, users.id));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Genera reporte de guardias
   */
  private async generateGuardDutyReport(config: ReportConfig, instituteId?: string): Promise<any[]> {
    const conditions = [];
    
    if (instituteId) {
      conditions.push(eq(guardDuties.instituteId, instituteId));
    }

    if (config.filters.academicYearId) {
      conditions.push(eq(guardDuties.academicYearId, config.filters.academicYearId));
    }

    if (config.filters.startDate) {
      conditions.push(gte(guardDuties.date, new Date(config.filters.startDate)));
    }

    if (config.filters.endDate) {
      conditions.push(lte(guardDuties.date, new Date(config.filters.endDate)));
    }

    const query = db
      .select({
        id: guardDuties.id,
        teacherName: users.displayName,
        date: guardDuties.date,
        timeSlot: guardDuties.timeSlot,
        type: guardDuties.type,
        status: guardDuties.status,
        createdAt: guardDuties.createdAt,
      })
      .from(guardDuties)
      .leftJoin(users, eq(guardDuties.teacherId, users.id));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Genera reporte de encuestas
   */
  private async generateSurveyReport(config: ReportConfig, instituteId?: string): Promise<any[]> {
    const conditions = [];
    
    if (instituteId) {
      conditions.push(eq(surveys.instituteId, instituteId));
    }

    if (config.filters.academicYearId) {
      conditions.push(eq(surveys.academicYearId, config.filters.academicYearId));
    }

    if (config.filters.startDate) {
      conditions.push(gte(surveys.createdAt, new Date(config.filters.startDate)));
    }

    if (config.filters.endDate) {
      conditions.push(lte(surveys.createdAt, new Date(config.filters.endDate)));
    }

    const query = db
      .select({
        id: surveys.id,
        title: surveys.title,
        description: surveys.description,
        status: surveys.status,
        responseCount: surveys.responseCount,
        createdAt: surveys.createdAt,
        updatedAt: surveys.updatedAt,
      })
      .from(surveys);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Genera reporte de auditoría
   */
  private async generateAuditReport(config: ReportConfig, instituteId?: string): Promise<any[]> {
    const filters: any = { ...config.filters };
    
    if (instituteId) {
      filters.instituteId = instituteId;
    }

    return await auditService.getAuditLogs(filters);
  }

  /**
   * Genera reporte personalizado
   */
  private async generateCustomReport(config: ReportConfig, instituteId?: string): Promise<any[]> {
    // Implementar reportes personalizados basados en SQL personalizado
    // Por ahora devolvemos datos vacíos
    return [];
  }

  /**
   * Aplica filtros a los datos
   */
  private applyFilters(data: any[], filters: Record<string, any>): any[] {
    return data.filter(row => {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string') {
            if (!row[key]?.toLowerCase().includes(value.toLowerCase())) {
              return false;
            }
          } else if (typeof value === 'number') {
            if (row[key] !== value) {
              return false;
            }
          } else if (value instanceof Date) {
            if (row[key]?.getTime() !== value.getTime()) {
              return false;
            }
          }
        }
      }
      return true;
    });
  }

  /**
   * Agrupa datos por campos específicos
   */
  private groupData(data: any[], groupBy: string[]): any[] {
    const groups = new Map<string, any[]>();

    for (const row of data) {
      const key = groupBy.map(field => row[field]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }

    return Array.from(groups.entries()).map(([key, rows]) => {
      const firstRow = rows[0];
      const groupedRow: any = {};

      // Añadir campos de agrupación
      groupBy.forEach(field => {
        groupedRow[field] = firstRow[field];
      });

      // Añadir campos agregados
      const numericFields = Object.keys(firstRow).filter(field => 
        !groupBy.includes(field) && typeof firstRow[field] === 'number'
      );

      numericFields.forEach(field => {
        groupedRow[`${field}_count`] = rows.length;
        groupedRow[`${field}_sum`] = rows.reduce((sum, row) => sum + (row[field] || 0), 0);
        groupedRow[`${field}_avg`] = groupedRow[`${field}_sum`] / rows.length;
        groupedRow[`${field}_min`] = Math.min(...rows.map(row => row[field] || 0));
        groupedRow[`${field}_max`] = Math.max(...rows.map(row => row[field] || 0));
      });

      return groupedRow;
    });
  }

  /**
   * Ordena datos por campos específicos
   */
  private sortData(data: any[], sortBy: { field: string; direction: 'asc' | 'desc' }[]): any[] {
    return data.sort((a, b) => {
      for (const sort of sortBy) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];

        if (aVal < bVal) {
          return sort.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sort.direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  }

  /**
   * Genera headers para el reporte
   */
  private generateHeaders(data: any[], columns: string[]): string[] {
    if (data.length === 0) return columns;

    const availableColumns = Object.keys(data[0]);
    return columns.filter(col => availableColumns.includes(col));
  }

  /**
   * Genera resumen de datos
   */
  private generateSummary(data: any[], type: string): Record<string, any> {
    const summary: Record<string, any> = {
      totalRecords: data.length,
      generatedAt: new Date(),
    };

    switch (type) {
      case 'evaluation':
        summary.averageScore = data.reduce((sum, row) => sum + (row.score || 0), 0) / data.length;
        summary.passingRate = (data.filter(row => row.grade >= 5).length / data.length) * 100;
        break;
      case 'attendance':
        summary.attendanceRate = (data.filter(row => row.status === 'present').length / data.length) * 100;
        summary.absenceRate = (data.filter(row => row.status === 'absent').length / data.length) * 100;
        break;
      case 'guard_duty':
        summary.completedDuties = data.filter(row => row.status === 'completed').length;
        summary.pendingDuties = data.filter(row => row.status === 'pending').length;
        break;
      case 'survey':
        summary.totalResponses = data.reduce((sum, row) => sum + (row.responseCount || 0), 0);
        summary.averageResponses = summary.totalResponses / data.length;
        break;
    }

    return summary;
  }

  /**
   * Genera gráficos para el reporte
   */
  private generateCharts(data: any[], type: string): any[] {
    const charts: any[] = [];

    switch (type) {
      case 'evaluation':
        // Gráfico de distribución de calificaciones
        const gradeDistribution = data.reduce((acc, row) => {
          const grade = row.grade || 0;
          const range = Math.floor(grade / 2) * 2;
          acc[`${range}-${range + 1}`] = (acc[`${range}-${range + 1}`] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        charts.push({
          type: 'bar',
          title: 'Distribución de Calificaciones',
          data: Object.entries(gradeDistribution).map(([range, count]) => ({
            label: range,
            value: count,
          })),
        });
        break;

      case 'attendance':
        // Gráfico de asistencia por día
        const attendanceByDate = data.reduce((acc, row) => {
          const date = row.date?.toISOString().split('T')[0];
          if (date) {
            if (!acc[date]) acc[date] = { present: 0, absent: 0 };
            if (row.status === 'present') acc[date].present++;
            else if (row.status === 'absent') acc[date].absent++;
          }
          return acc;
        }, {} as Record<string, { present: number; absent: number }>);

        charts.push({
          type: 'line',
          title: 'Asistencia por Día',
          data: Object.entries(attendanceByDate).map(([date, counts]) => ({
            date,
            present: counts.present,
            absent: counts.absent,
          })),
        });
        break;
    }

    return charts;
  }

  /**
   * Aplana una fila de datos para exportación
   */
  private flattenRow(row: any): any[] {
    return Object.values(row).map(value => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  /**
   * Obtiene plantillas de reportes disponibles
   */
  async getReportTemplates(instituteId?: string): Promise<ReportTemplate[]> {
    // Plantillas predefinidas
    const templates: ReportTemplate[] = [
      {
        id: 'evaluation-summary',
        name: 'Resumen de Evaluaciones',
        description: 'Reporte de evaluaciones con estadísticas generales',
        type: 'evaluation',
        config: {
          title: 'Resumen de Evaluaciones',
          type: 'evaluation',
          format: 'pdf',
          filters: {},
          columns: ['studentName', 'competencyName', 'score', 'grade', 'createdAt'],
          includeSummary: true,
          includeCharts: true,
        },
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'attendance-report',
        name: 'Reporte de Asistencia',
        description: 'Reporte detallado de asistencia de estudiantes',
        type: 'attendance',
        config: {
          title: 'Reporte de Asistencia',
          type: 'attendance',
          format: 'excel',
          filters: {},
          columns: ['studentName', 'date', 'status', 'reason'],
          groupBy: ['date'],
          includeSummary: true,
          includeCharts: true,
        },
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'guard-duty-summary',
        name: 'Resumen de Guardias',
        description: 'Reporte de guardias docentes',
        type: 'guard_duty',
        config: {
          title: 'Resumen de Guardias',
          type: 'guard_duty',
          format: 'pdf',
          filters: {},
          columns: ['teacherName', 'date', 'timeSlot', 'type', 'status'],
          groupBy: ['teacherName'],
          includeSummary: true,
          includeCharts: false,
        },
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'audit-log',
        name: 'Log de Auditoría',
        description: 'Reporte de actividades del sistema',
        type: 'audit',
        config: {
          title: 'Log de Auditoría',
          type: 'audit',
          format: 'csv',
          filters: {},
          columns: ['userId', 'action', 'resource', 'ipAddress', 'createdAt'],
          includeSummary: true,
          includeCharts: false,
        },
        isPublic: false,
        createdBy: 'system',
        createdAt: new Date(),
      },
    ];

    return templates;
  }
}

// Instancia singleton del servicio
export const reportService = new ReportService(); 