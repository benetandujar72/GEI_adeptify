import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import { db } from '../index.js';
import { users, competencies, evaluations, attendance, guardDuties } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeHeaders: boolean;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ImportOptions {
  skipFirstRow: boolean;
  mapping: Record<string, string>;
  validationRules?: Record<string, any>;
}

export class GoogleSheetsService {
  private oauth2Client: any;
  private sheets: any;

  constructor(config: GoogleSheetsConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    if (config.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken
      });
    }

    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  // Generar URL de autorización
  public getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  // Intercambiar código por tokens
  public async getTokensFromCode(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      logger.error('Error obteniendo tokens de Google:', error);
      throw new Error('Error de autenticación con Google');
    }
  }

  // Crear nueva hoja de cálculo
  public async createSpreadsheet(title: string, description?: string) {
    try {
      const resource = {
        properties: {
          title,
          description
        }
      };

      const response = await this.sheets.spreadsheets.create({
        resource,
        fields: 'spreadsheetId'
      });

      logger.info(`📊 Hoja de cálculo creada: ${response.data.spreadsheetId}`);
      return response.data.spreadsheetId;
    } catch (error) {
      logger.error('Error creando hoja de cálculo:', error);
      throw new Error('Error al crear hoja de cálculo');
    }
  }

  // Exportar datos de competencias
  public async exportCompetencies(spreadsheetId: string, instituteId: string, options: ExportOptions = { format: 'xlsx', includeHeaders: true }) {
    try {
      // Obtener datos de competencias
      const competenciesData = await db
        .select()
        .from(competencies)
        .where(eq(competencies.instituteId, instituteId));

      // Preparar datos para Google Sheets
      const rows = [];
      
      if (options.includeHeaders) {
        rows.push(['ID', 'Nombre', 'Descripción', 'Categoría', 'Nivel', 'Creado', 'Actualizado']);
      }

      competenciesData.forEach(comp => {
        rows.push([
          comp.id,
          comp.name,
          comp.description,
          comp.category,
          comp.level,
          comp.createdAt?.toISOString(),
          comp.updatedAt?.toISOString()
        ]);
      });

      // Escribir en Google Sheets
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Competencias!A1',
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      logger.info(`✅ ${rows.length - (options.includeHeaders ? 1 : 0)} competencias exportadas`);
      return spreadsheetId;
    } catch (error) {
      logger.error('Error exportando competencias:', error);
      throw new Error('Error al exportar competencias');
    }
  }

  // Exportar evaluaciones
  public async exportEvaluations(spreadsheetId: string, instituteId: string, options: ExportOptions = { format: 'xlsx', includeHeaders: true }) {
    try {
      // Obtener datos de evaluaciones con joins
      const evaluationsData = await db
        .select({
          id: evaluations.id,
          studentName: users.name,
          competencyName: competencies.name,
          score: evaluations.score,
          feedback: evaluations.feedback,
          createdAt: evaluations.createdAt
        })
        .from(evaluations)
        .innerJoin(users, eq(evaluations.studentId, users.id))
        .innerJoin(competencies, eq(evaluations.competencyId, competencies.id))
        .where(eq(evaluations.instituteId, instituteId));

      // Preparar datos
      const rows = [];
      
      if (options.includeHeaders) {
        rows.push(['ID', 'Estudiante', 'Competencia', 'Puntuación', 'Feedback', 'Fecha']);
      }

      evaluationsData.forEach(evaluation => {
        rows.push([
          evaluation.id,
          evaluation.studentName,
          evaluation.competencyName,
          evaluation.score,
          evaluation.feedback,
          evaluation.createdAt?.toISOString()
        ]);
      });

      // Escribir en Google Sheets
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Evaluaciones!A1',
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      logger.info(`✅ ${rows.length - (options.includeHeaders ? 1 : 0)} evaluaciones exportadas`);
      return spreadsheetId;
    } catch (error) {
      logger.error('Error exportando evaluaciones:', error);
      throw new Error('Error al exportar evaluaciones');
    }
  }

  // Exportar asistencia
  public async exportAttendance(spreadsheetId: string, instituteId: string, options: ExportOptions = { format: 'xlsx', includeHeaders: true }) {
    try {
      // Obtener datos de asistencia
      const attendanceData = await db
        .select({
          id: attendance.id,
          studentName: users.name,
          date: attendance.date,
          status: attendance.status,
          notes: attendance.notes
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.studentId, users.id))
        .where(eq(attendance.instituteId, instituteId));

      // Aplicar filtros de fecha si se especifican
      let filteredData = attendanceData;
      if (options.dateRange) {
        filteredData = attendanceData.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= options.dateRange!.start && recordDate <= options.dateRange!.end;
        });
      }

      // Preparar datos
      const rows = [];
      
      if (options.includeHeaders) {
        rows.push(['ID', 'Estudiante', 'Fecha', 'Estado', 'Notas']);
      }

      filteredData.forEach(record => {
        rows.push([
          record.id,
          record.studentName,
          record.date?.toISOString().split('T')[0],
          record.status,
          record.notes
        ]);
      });

      // Escribir en Google Sheets
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Asistencia!A1',
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      logger.info(`✅ ${rows.length - (options.includeHeaders ? 1 : 0)} registros de asistencia exportados`);
      return spreadsheetId;
    } catch (error) {
      logger.error('Error exportando asistencia:', error);
      throw new Error('Error al exportar asistencia');
    }
  }

  // Importar datos desde Google Sheets
  public async importFromSheet(spreadsheetId: string, range: string, options: ImportOptions) {
    try {
      // Leer datos de Google Sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No se encontraron datos en la hoja');
      }

      // Procesar datos
      const startRow = options.skipFirstRow ? 1 : 0;
      const processedData = [];

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        const processedRow: Record<string, any> = {};

        // Aplicar mapeo de columnas
        Object.entries(options.mapping).forEach(([sheetColumn, dbColumn]) => {
          const columnIndex = this.getColumnIndex(sheetColumn);
          if (columnIndex < row.length) {
            processedRow[dbColumn] = row[columnIndex];
          }
        });

        // Aplicar reglas de validación
        if (options.validationRules) {
          const isValid = this.validateRow(processedRow, options.validationRules);
          if (!isValid) {
            logger.warn(`⚠️ Fila ${i + 1} no cumple las reglas de validación`);
            continue;
          }
        }

        processedData.push(processedRow);
      }

      logger.info(`✅ ${processedData.length} filas procesadas para importación`);
      return processedData;
    } catch (error) {
      logger.error('Error importando desde Google Sheets:', error);
      throw new Error('Error al importar datos');
    }
  }

  // Obtener índice de columna (A=0, B=1, etc.)
  private getColumnIndex(column: string): number {
    let index = 0;
    for (let i = 0; i < column.length; i++) {
      index = index * 26 + (column.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  // Validar fila según reglas
  private validateRow(row: Record<string, any>, rules: Record<string, any>): boolean {
    for (const [field, rule] of Object.entries(rules)) {
      const value = row[field];
      
      if (rule.required && !value) {
        return false;
      }
      
      if (rule.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return false;
        }
      }
      
      if (rule.type === 'date' && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return false;
        }
      }
    }
    
    return true;
  }

  // Compartir hoja de cálculo
  public async shareSpreadsheet(spreadsheetId: string, email: string, role: 'reader' | 'writer' | 'owner' = 'reader') {
    try {
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role,
          type: 'user',
          emailAddress: email
        }
      });

      logger.info(`✅ Hoja compartida con ${email} (rol: ${role})`);
    } catch (error) {
      logger.error('Error compartiendo hoja:', error);
      throw new Error('Error al compartir hoja de cálculo');
    }
  }

  // Obtener URL de la hoja
  public getSpreadsheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }
} 