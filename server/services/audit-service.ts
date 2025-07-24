import { db } from '../index.js';
import { auditLogs } from '../../shared/schema.js';
import { logger } from '../utils/logger.js';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface AuditAction {
  userId?: string;
  instituteId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilter {
  userId?: string;
  instituteId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  async logAction(auditData: AuditAction): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: auditData.userId,
        instituteId: auditData.instituteId,
        action: auditData.action,
        resource: auditData.resource,
        details: auditData.details || {},
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
      });

      logger.info(`Audit log: ${auditData.action} on ${auditData.resource}`, {
        userId: auditData.userId,
        instituteId: auditData.instituteId,
        action: auditData.action,
        resource: auditData.resource,
      });
    } catch (error) {
      logger.error('Error logging audit action:', error);
      // No lanzamos el error para no interrumpir el flujo principal
    }
  }

  /**
   * Registra una acción de creación
   */
  async logCreate(resource: string, data: any, userId?: string, instituteId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'CREATE',
      resource,
      details: { data },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra una acción de lectura
   */
  async logRead(resource: string, filters: any, userId?: string, instituteId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'READ',
      resource,
      details: { filters },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra una acción de actualización
   */
  async logUpdate(resource: string, id: string, oldData: any, newData: any, userId?: string, instituteId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'UPDATE',
      resource,
      details: { id, oldData, newData, changes: this.getChanges(oldData, newData) },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra una acción de eliminación
   */
  async logDelete(resource: string, id: string, deletedData: any, userId?: string, instituteId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'DELETE',
      resource,
      details: { id, deletedData },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra un login exitoso
   */
  async logLogin(userId: string, instituteId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'LOGIN',
      resource: 'auth',
      details: { success: true },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra un intento de login fallido
   */
  async logLoginFailed(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      action: 'LOGIN_FAILED',
      resource: 'auth',
      details: { email, success: false },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra un logout
   */
  async logLogout(userId: string, instituteId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'LOGOUT',
      resource: 'auth',
      details: { success: true },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra una exportación de datos
   */
  async logExport(resource: string, format: string, filters: any, userId?: string, instituteId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'EXPORT',
      resource,
      details: { format, filters },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra una importación de datos
   */
  async logImport(resource: string, format: string, recordCount: number, userId?: string, instituteId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      instituteId,
      action: 'IMPORT',
      resource,
      details: { format, recordCount },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Obtiene logs de auditoría con filtros
   */
  async getAuditLogs(filters: AuditFilter = {}): Promise<any[]> {
    try {
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }

      if (filters.instituteId) {
        conditions.push(eq(auditLogs.instituteId, filters.instituteId));
      }

      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }

      if (filters.resource) {
        conditions.push(eq(auditLogs.resource, filters.resource));
      }

      if (filters.startDate) {
        conditions.push(gte(auditLogs.createdAt, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(auditLogs.createdAt, filters.endDate));
      }

      const query = db
        .select()
        .from(auditLogs)
        .orderBy(auditLogs.createdAt);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      if (filters.limit) {
        query.limit(filters.limit);
      }

      if (filters.offset) {
        query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getAuditStats(instituteId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const conditions = [];

      if (instituteId) {
        conditions.push(eq(auditLogs.instituteId, instituteId));
      }

      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, startDate));
      }

      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, endDate));
      }

      const query = db
        .select({
          action: auditLogs.action,
          count: db.fn.count(auditLogs.id),
        })
        .from(auditLogs)
        .groupBy(auditLogs.action);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      const results = await query;

      return {
        totalActions: results.reduce((sum, row) => sum + Number(row.count), 0),
        actionsByType: results.reduce((acc, row) => {
          acc[row.action] = Number(row.count);
          return acc;
        }, {} as Record<string, number>),
        period: {
          startDate,
          endDate,
        },
      };
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      throw error;
    }
  }

  /**
   * Limpia logs antiguos (más de 1 año)
   */
  async cleanupOldLogs(olderThanDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffDate));

      logger.info(`Cleaned up ${result.rowCount} old audit logs`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up old audit logs:', error);
      throw error;
    }
  }

  /**
   * Compara datos antiguos y nuevos para detectar cambios
   */
  private getChanges(oldData: any, newData: any): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    if (!oldData || !newData) {
      return changes;
    }

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    }

    return changes;
  }

  /**
   * Verifica si un usuario tiene permisos para ver logs de auditoría
   */
  canViewAuditLogs(userRole: string): boolean {
    return ['super_admin', 'institute_admin'].includes(userRole);
  }

  /**
   * Verifica si un usuario puede exportar logs de auditoría
   */
  canExportAuditLogs(userRole: string): boolean {
    return ['super_admin'].includes(userRole);
  }
}

// Instancia singleton del servicio
export const auditService = new AuditService(); 