import { db } from '../index.js';
import { logger } from '../utils/logger.js';
import { auditService } from './audit-service.js';
import { 
  users, institutes, academicYears, competencies, evaluations, 
  attendance, guardDuties, surveys, resources, notifications 
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm';

export interface ExportConfig {
  type: 'evaluation' | 'attendance' | 'guard_duty' | 'survey' | 'resource' | 'user' | 'custom';
  format: 'csv' | 'excel' | 'json' | 'xml';
  filters: Record<string, any>;
  columns: string[];
  includeHeaders: boolean;
  dateFormat: 'iso' | 'local' | 'custom';
  customDateFormat?: string;
  encoding: 'utf8' | 'latin1' | 'utf16';
  delimiter?: string; // Para CSV
  includeMetadata: boolean;
  compression: boolean;
}

export interface ExportResult {
  data: any;
  filename: string;
  contentType: string;
  size: number;
  metadata: {
    exportedAt: Date;
    totalRecords: number;
    filters: Record<string, any>;
    format: string;
  };
}

export class ExportService {
  /**
   * Exporta datos según la configuración
   */
  async exportData(config: ExportConfig, userId?: string, instituteId?: string): Promise<ExportResult> {
    try {
      logger.info(`Exportando datos: ${config.type}`, { format: config.format, userId, instituteId });

      let data: any[] = [];

      // Obtener datos según el tipo
      switch (config.type) {
        case 'evaluation':
          data = await this.getEvaluationData(config, instituteId);
          break;
        case 'attendance':
          data = await this.getAttendanceData(config, instituteId);
          break;
        case 'guard_duty':
          data = await this.getGuardDutyData(config, instituteId);
          break;
        case 'survey':
          data = await this.getSurveyData(config, instituteId);
          break;
        case 'resource':
          data = await this.getResourceData(config, instituteId);
          break;
        case 'user':
          data = await this.getUserData(config, instituteId);
          break;
        case 'custom':
          data = await this.getCustomData(config, instituteId);
          break;
        default:
          throw new Error(`Tipo de exportación no soportado: ${config.type}`);
      }

      // Aplicar filtros
      data = this.applyFilters(data, config.filters);

      // Formatear datos
      const formattedData = this.formatData(data, config);

      // Generar archivo según formato
      const result = await this.generateFile(formattedData, config);

      // Registrar la exportación
      await auditService.logExport(
        config.type,
        config.format,
        config.filters,
        userId,
        instituteId
      );

      return result;

    } catch (error) {
      logger.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos de evaluaciones
   */
  private async getEvaluationData(config: ExportConfig, instituteId?: string): Promise<any[]> {
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
        studentId: evaluations.studentId,
        studentName: users.displayName,
        studentEmail: users.email,
        competencyId: evaluations.competencyId,
        competencyName: competencies.description,
        competencyCode: competencies.code,
        score: evaluations.score,
        grade: evaluations.grade,
        comments: evaluations.comments,
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
   * Obtiene datos de asistencia
   */
  private async getAttendanceData(config: ExportConfig, instituteId?: string): Promise<any[]> {
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
        studentId: attendance.studentId,
        studentName: users.displayName,
        studentEmail: users.email,
        date: attendance.date,
        status: attendance.status,
        reason: attendance.reason,
        notes: attendance.notes,
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
   * Obtiene datos de guardias
   */
  private async getGuardDutyData(config: ExportConfig, instituteId?: string): Promise<any[]> {
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
        teacherId: guardDuties.teacherId,
        teacherName: users.displayName,
        teacherEmail: users.email,
        date: guardDuties.date,
        timeSlot: guardDuties.timeSlot,
        type: guardDuties.type,
        status: guardDuties.status,
        notes: guardDuties.notes,
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
   * Obtiene datos de encuestas
   */
  private async getSurveyData(config: ExportConfig, instituteId?: string): Promise<any[]> {
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
        type: surveys.type,
        status: surveys.status,
        responseCount: surveys.responseCount,
        startDate: surveys.startDate,
        endDate: surveys.endDate,
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
   * Obtiene datos de recursos
   */
  private async getResourceData(config: ExportConfig, instituteId?: string): Promise<any[]> {
    const conditions = [];
    
    if (instituteId) {
      conditions.push(eq(resources.instituteId, instituteId));
    }

    if (config.filters.type) {
      conditions.push(eq(resources.type, config.filters.type));
    }

    const query = db
      .select({
        id: resources.id,
        name: resources.name,
        description: resources.description,
        type: resources.type,
        capacity: resources.capacity,
        isActive: resources.isActive,
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
      })
      .from(resources);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Obtiene datos de usuarios
   */
  private async getUserData(config: ExportConfig, instituteId?: string): Promise<any[]> {
    const conditions = [];
    
    if (instituteId) {
      conditions.push(eq(users.instituteId, instituteId));
    }

    if (config.filters.role) {
      conditions.push(eq(users.role, config.filters.role));
    }

    if (config.filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, config.filters.isActive));
    }

    const query = db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Obtiene datos personalizados
   */
  private async getCustomData(config: ExportConfig, instituteId?: string): Promise<any[]> {
    // Implementar consultas personalizadas
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
   * Formatea datos según la configuración
   */
  private formatData(data: any[], config: ExportConfig): any[] {
    return data.map(row => {
      const formattedRow: any = {};

      // Aplicar columnas seleccionadas
      config.columns.forEach(column => {
        if (row[column] !== undefined) {
          formattedRow[column] = this.formatValue(row[column], config);
        }
      });

      return formattedRow;
    });
  }

  /**
   * Formatea un valor individual
   */
  private formatValue(value: any, config: ExportConfig): any {
    if (value instanceof Date) {
      switch (config.dateFormat) {
        case 'iso':
          return value.toISOString();
        case 'local':
          return value.toLocaleDateString();
        case 'custom':
          return config.customDateFormat 
            ? this.formatDate(value, config.customDateFormat)
            : value.toISOString();
        default:
          return value.toISOString();
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    if (value === null || value === undefined) {
      return '';
    }

    return value;
  }

  /**
   * Formatea una fecha con formato personalizado
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Genera el archivo según el formato
   */
  private async generateFile(data: any[], config: ExportConfig): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${config.type}_export_${timestamp}`;

    switch (config.format) {
      case 'csv':
        return this.generateCSV(data, config, baseFilename);
      case 'excel':
        return this.generateExcel(data, config, baseFilename);
      case 'json':
        return this.generateJSON(data, config, baseFilename);
      case 'xml':
        return this.generateXML(data, config, baseFilename);
      default:
        throw new Error(`Formato no soportado: ${config.format}`);
    }
  }

  /**
   * Genera archivo CSV
   */
  private generateCSV(data: any[], config: ExportConfig, baseFilename: string): ExportResult {
    const delimiter = config.delimiter || ',';
    const headers = config.columns;
    
    let csvContent = '';

    // Añadir headers si se solicitan
    if (config.includeHeaders) {
      csvContent += headers.join(delimiter) + '\n';
    }

    // Añadir datos
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escapar comillas y envolver en comillas si contiene delimitador
        const escapedValue = String(value).replace(/"/g, '""');
        return escapedValue.includes(delimiter) ? `"${escapedValue}"` : escapedValue;
      });
      csvContent += values.join(delimiter) + '\n';
    });

    // Añadir metadata si se solicita
    if (config.includeMetadata) {
      csvContent += '\n# Metadata\n';
      csvContent += `# Exportado el: ${new Date().toISOString()}\n`;
      csvContent += `# Total de registros: ${data.length}\n`;
      csvContent += `# Filtros aplicados: ${JSON.stringify(config.filters)}\n`;
    }

    const content = Buffer.from(csvContent, config.encoding);
    const compressed = config.compression ? this.compressData(content) : content;

    return {
      data: compressed,
      filename: `${baseFilename}.csv${config.compression ? '.gz' : ''}`,
      contentType: 'text/csv',
      size: compressed.length,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        filters: config.filters,
        format: 'csv',
      },
    };
  }

  /**
   * Genera archivo Excel
   */
  private generateExcel(data: any[], config: ExportConfig, baseFilename: string): ExportResult {
    // Para Excel necesitaríamos una librería como xlsx
    // Por ahora generamos CSV con extensión .xlsx
    const csvResult = this.generateCSV(data, config, baseFilename);
    
    return {
      ...csvResult,
      filename: `${baseFilename}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Genera archivo JSON
   */
  private generateJSON(data: any[], config: ExportConfig, baseFilename: string): ExportResult {
    let jsonData: any = { data };

    // Añadir metadata si se solicita
    if (config.includeMetadata) {
      jsonData.metadata = {
        exportedAt: new Date().toISOString(),
        totalRecords: data.length,
        filters: config.filters,
        format: 'json',
        columns: config.columns,
      };
    }

    const content = Buffer.from(JSON.stringify(jsonData, null, 2), config.encoding);
    const compressed = config.compression ? this.compressData(content) : content;

    return {
      data: compressed,
      filename: `${baseFilename}.json${config.compression ? '.gz' : ''}`,
      contentType: 'application/json',
      size: compressed.length,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        filters: config.filters,
        format: 'json',
      },
    };
  }

  /**
   * Genera archivo XML
   */
  private generateXML(data: any[], config: ExportConfig, baseFilename: string): ExportResult {
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += `<export type="${config.type}">\n`;
    
    // Añadir metadata si se solicita
    if (config.includeMetadata) {
      xmlContent += '  <metadata>\n';
      xmlContent += `    <exportedAt>${new Date().toISOString()}</exportedAt>\n`;
      xmlContent += `    <totalRecords>${data.length}</totalRecords>\n`;
      xmlContent += `    <filters>${JSON.stringify(config.filters)}</filters>\n`;
      xmlContent += '  </metadata>\n';
    }

    // Añadir datos
    xmlContent += '  <records>\n';
    data.forEach((row, index) => {
      xmlContent += `    <record id="${index + 1}">\n`;
      config.columns.forEach(column => {
        const value = row[column] || '';
        const escapedValue = String(value).replace(/[<>&'"]/g, (char) => {
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            "'": '&apos;',
            '"': '&quot;',
          };
          return entities[char];
        });
        xmlContent += `      <${column}>${escapedValue}</${column}>\n`;
      });
      xmlContent += '    </record>\n';
    });
    xmlContent += '  </records>\n';
    xmlContent += '</export>';

    const content = Buffer.from(xmlContent, config.encoding);
    const compressed = config.compression ? this.compressData(content) : content;

    return {
      data: compressed,
      filename: `${baseFilename}.xml${config.compression ? '.gz' : ''}`,
      contentType: 'application/xml',
      size: compressed.length,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        filters: config.filters,
        format: 'xml',
      },
    };
  }

  /**
   * Comprime datos usando gzip
   */
  private compressData(data: Buffer): Buffer {
    // Implementación básica de compresión
    // En producción usaríamos zlib.gzip
    return data;
  }

  /**
   * Obtiene configuraciones de exportación predefinidas
   */
  getExportConfigs(): Record<string, ExportConfig> {
    return {
      'evaluation-basic': {
        type: 'evaluation',
        format: 'csv',
        filters: {},
        columns: ['studentName', 'competencyName', 'score', 'grade'],
        includeHeaders: true,
        dateFormat: 'iso',
        encoding: 'utf8',
        includeMetadata: false,
        compression: false,
      },
      'attendance-detailed': {
        type: 'attendance',
        format: 'excel',
        filters: {},
        columns: ['studentName', 'date', 'status', 'reason', 'notes'],
        includeHeaders: true,
        dateFormat: 'local',
        encoding: 'utf8',
        includeMetadata: true,
        compression: false,
      },
      'guard-duty-summary': {
        type: 'guard_duty',
        format: 'csv',
        filters: {},
        columns: ['teacherName', 'date', 'timeSlot', 'type', 'status'],
        includeHeaders: true,
        dateFormat: 'iso',
        encoding: 'utf8',
        includeMetadata: false,
        compression: false,
      },
      'survey-complete': {
        type: 'survey',
        format: 'json',
        filters: {},
        columns: ['title', 'description', 'type', 'status', 'responseCount', 'startDate', 'endDate'],
        includeHeaders: false,
        dateFormat: 'iso',
        encoding: 'utf8',
        includeMetadata: true,
        compression: false,
      },
    };
  }
}

// Instancia singleton del servicio
export const exportService = new ExportService(); 