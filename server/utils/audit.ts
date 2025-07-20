import { db } from '../index.js';
import { auditLogs } from '@/shared/schema.js';
import { eq, gte, lte, desc } from 'drizzle-orm';

export interface AuditLogData {
  userId?: string;
  instituteId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      instituteId: data.instituteId,
      action: data.action,
      resource: data.resource,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Error creating audit log:', error);
  }
}

export async function getAuditLogs(filters: {
  userId?: string;
  instituteId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const { userId, instituteId, action, resource, startDate, endDate, limit = 50, offset = 0 } = filters;

  let query = db.select().from(auditLogs);

  if (userId) {
    query = query.where(eq(auditLogs.userId, userId));
  }

  if (instituteId) {
    query = query.where(eq(auditLogs.instituteId, instituteId));
  }

  if (action) {
    query = query.where(eq(auditLogs.action, action));
  }

  if (resource) {
    query = query.where(eq(auditLogs.resource, resource));
  }

  if (startDate) {
    query = query.where(gte(auditLogs.createdAt, startDate));
  }

  if (endDate) {
    query = query.where(lte(auditLogs.createdAt, endDate));
  }

  return query.limit(limit).offset(offset).orderBy(desc(auditLogs.createdAt));
} 