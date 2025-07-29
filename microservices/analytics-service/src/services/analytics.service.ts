import { db } from '../database';
import { 
  analyticsEvents, performanceMetrics, customReports, reportExecutions,
  dashboards, dashboardWidgets, businessMetrics, dataExports, metricAlerts, alertLogs
} from '../schema';
import { eq, and, like, desc, asc, gte, lte, inArray, between, or, isNull, isNotNull, sql } from 'drizzle-orm';
import { 
  NewAnalyticsEvent, AnalyticsEvent, NewPerformanceMetric, PerformanceMetric,
  NewCustomReport, CustomReport, NewReportExecution, ReportExecution,
  NewDashboard, Dashboard, NewDashboardWidget, DashboardWidget,
  NewBusinessMetric, BusinessMetric, NewDataExport, DataExport,
  NewMetricAlert, MetricAlert, NewAlertLog, AlertLog
} from '../schema';
import { logger } from '../utils/logger';

class AnalyticsService {
  // ===== EVENTOS DE ANALYTICS =====

  /**
   * Registrar un evento de analytics
   */
  async trackEvent(eventData: NewAnalyticsEvent): Promise<AnalyticsEvent> {
    try {
      const [event] = await db.insert(analyticsEvents).values(eventData).returning();
      logger.info(`Analytics event tracked: ${event.eventType} - ${event.eventName}`);
      return event;
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  /**
   * Obtener eventos de analytics con filtros
   */
  async getEvents(filters: {
    userId?: number;
    eventType?: string;
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: AnalyticsEvent[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.userId) {
        conditions.push(eq(analyticsEvents.userId, filters.userId));
      }
      if (filters.eventType) {
        conditions.push(eq(analyticsEvents.eventType, filters.eventType));
      }
      if (filters.eventName) {
        conditions.push(like(analyticsEvents.eventName, `%${filters.eventName}%`));
      }
      if (filters.startDate && filters.endDate) {
        conditions.push(between(analyticsEvents.timestamp, filters.startDate, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const events = await db
        .select()
        .from(analyticsEvents)
        .where(whereClause)
        .orderBy(desc(analyticsEvents.timestamp))
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(analyticsEvents)
        .where(whereClause);

      return {
        events,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting analytics events:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de eventos
   */
  async getEventStats(period: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const stats = await db
        .select({
          eventType: analyticsEvents.eventType,
          count: sql<number>`count(*)`,
          uniqueUsers: sql<number>`count(distinct user_id)`
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.timestamp, startDate))
        .groupBy(analyticsEvents.eventType)
        .orderBy(desc(sql`count(*)`));

      return stats;
    } catch (error) {
      logger.error('Error getting event stats:', error);
      throw error;
    }
  }

  // ===== MÉTRICAS DE RENDIMIENTO =====

  /**
   * Registrar métrica de rendimiento
   */
  async trackPerformance(metricData: NewPerformanceMetric): Promise<PerformanceMetric> {
    try {
      const [metric] = await db.insert(performanceMetrics).values(metricData).returning();
      logger.info(`Performance metric tracked for: ${metric.pageUrl}`);
      return metric;
    } catch (error) {
      logger.error('Error tracking performance metric:', error);
      throw error;
    }
  }

  /**
   * Obtener métricas de rendimiento
   */
  async getPerformanceMetrics(filters: {
    pageUrl?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<PerformanceMetric[]> {
    try {
      const conditions = [];
      
      if (filters.pageUrl) {
        conditions.push(like(performanceMetrics.pageUrl, `%${filters.pageUrl}%`));
      }
      if (filters.startDate && filters.endDate) {
        conditions.push(between(performanceMetrics.timestamp, filters.startDate, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      return await db
        .select()
        .from(performanceMetrics)
        .where(whereClause)
        .orderBy(desc(performanceMetrics.timestamp))
        .limit(filters.limit || 100);
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de rendimiento
   */
  async getPerformanceStats(): Promise<any> {
    try {
      const stats = await db
        .select({
          avgLoadTime: sql<number>`avg(load_time)`,
          avgFirstPaint: sql<number>`avg(first_paint)`,
          avgFirstContentfulPaint: sql<number>`avg(first_contentful_paint)`,
          avgLargestContentfulPaint: sql<number>`avg(largest_contentful_paint)`,
          avgCumulativeLayoutShift: sql<number>`avg(cumulative_layout_shift)`,
          avgFirstInputDelay: sql<number>`avg(first_input_delay)`,
          totalMetrics: sql<number>`count(*)`
        })
        .from(performanceMetrics)
        .where(gte(performanceMetrics.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)));

      return stats[0];
    } catch (error) {
      logger.error('Error getting performance stats:', error);
      throw error;
    }
  }

  // ===== REPORTES PERSONALIZADOS =====

  /**
   * Crear reporte personalizado
   */
  async createReport(reportData: NewCustomReport): Promise<CustomReport> {
    try {
      const [report] = await db.insert(customReports).values(reportData).returning();
      logger.info(`Custom report created: ${report.name}`);
      return report;
    } catch (error) {
      logger.error('Error creating custom report:', error);
      throw error;
    }
  }

  /**
   * Obtener reportes
   */
  async getReports(filters: {
    createdBy?: number;
    type?: string;
    status?: string;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: CustomReport[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.createdBy) {
        conditions.push(eq(customReports.createdBy, filters.createdBy));
      }
      if (filters.type) {
        conditions.push(eq(customReports.type, filters.type));
      }
      if (filters.status) {
        conditions.push(eq(customReports.status, filters.status));
      }
      if (filters.isPublic !== undefined) {
        conditions.push(eq(customReports.isPublic, filters.isPublic));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const reports = await db
        .select()
        .from(customReports)
        .where(whereClause)
        .orderBy(desc(customReports.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(customReports)
        .where(whereClause);

      return {
        reports,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting reports:', error);
      throw error;
    }
  }

  /**
   * Ejecutar reporte
   */
  async executeReport(reportId: number, parameters?: Record<string, any>): Promise<ReportExecution> {
    try {
      const executionData: NewReportExecution = {
        reportId,
        status: 'running',
        metadata: { parameters }
      };

      const [execution] = await db.insert(reportExecutions).values(executionData).returning();
      
      // Aquí se ejecutaría la lógica del reporte
      // Por simplicidad, simulamos una ejecución exitosa
      setTimeout(async () => {
        await this.updateReportExecution(execution.id, {
          status: 'completed',
          completedAt: new Date(),
          duration: 5000,
          resultUrl: `/reports/${execution.uuid}/download`,
          metadata: {
            ...execution.metadata,
            recordCount: 1000,
            fileSize: 1024000
          }
        });
      }, 5000);

      return execution;
    } catch (error) {
      logger.error('Error executing report:', error);
      throw error;
    }
  }

  /**
   * Actualizar ejecución de reporte
   */
  async updateReportExecution(executionId: number, updates: Partial<ReportExecution>): Promise<ReportExecution> {
    try {
      const [execution] = await db
        .update(reportExecutions)
        .set(updates)
        .where(eq(reportExecutions.id, executionId))
        .returning();

      return execution;
    } catch (error) {
      logger.error('Error updating report execution:', error);
      throw error;
    }
  }

  // ===== DASHBOARDS =====

  /**
   * Crear dashboard
   */
  async createDashboard(dashboardData: NewDashboard): Promise<Dashboard> {
    try {
      const [dashboard] = await db.insert(dashboards).values(dashboardData).returning();
      logger.info(`Dashboard created: ${dashboard.name}`);
      return dashboard;
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      throw error;
    }
  }

  /**
   * Obtener dashboards
   */
  async getDashboards(filters: {
    createdBy?: number;
    type?: string;
    status?: string;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ dashboards: Dashboard[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.createdBy) {
        conditions.push(eq(dashboards.createdBy, filters.createdBy));
      }
      if (filters.type) {
        conditions.push(eq(dashboards.type, filters.type));
      }
      if (filters.status) {
        conditions.push(eq(dashboards.status, filters.status));
      }
      if (filters.isPublic !== undefined) {
        conditions.push(eq(dashboards.isPublic, filters.isPublic));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const dashboardsList = await db
        .select()
        .from(dashboards)
        .where(whereClause)
        .orderBy(desc(dashboards.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(dashboards)
        .where(whereClause);

      return {
        dashboards: dashboardsList,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting dashboards:', error);
      throw error;
    }
  }

  /**
   * Agregar widget a dashboard
   */
  async addWidget(widgetData: NewDashboardWidget): Promise<DashboardWidget> {
    try {
      const [widget] = await db.insert(dashboardWidgets).values(widgetData).returning();
      logger.info(`Widget added to dashboard: ${widget.name}`);
      return widget;
    } catch (error) {
      logger.error('Error adding widget:', error);
      throw error;
    }
  }

  /**
   * Obtener widgets de dashboard
   */
  async getDashboardWidgets(dashboardId: number): Promise<DashboardWidget[]> {
    try {
      return await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.dashboardId, dashboardId))
        .orderBy(asc(dashboardWidgets.order));
    } catch (error) {
      logger.error('Error getting dashboard widgets:', error);
      throw error;
    }
  }

  // ===== MÉTRICAS DE NEGOCIO =====

  /**
   * Crear métrica de negocio
   */
  async createBusinessMetric(metricData: NewBusinessMetric): Promise<BusinessMetric> {
    try {
      const [metric] = await db.insert(businessMetrics).values(metricData).returning();
      logger.info(`Business metric created: ${metric.name}`);
      return metric;
    } catch (error) {
      logger.error('Error creating business metric:', error);
      throw error;
    }
  }

  /**
   * Obtener métricas de negocio
   */
  async getBusinessMetrics(filters: {
    category?: string;
    period?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ metrics: BusinessMetric[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.category) {
        conditions.push(eq(businessMetrics.category, filters.category));
      }
      if (filters.period) {
        conditions.push(eq(businessMetrics.period, filters.period));
      }
      if (filters.status) {
        conditions.push(eq(businessMetrics.status, filters.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const metrics = await db
        .select()
        .from(businessMetrics)
        .where(whereClause)
        .orderBy(desc(businessMetrics.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(businessMetrics)
        .where(whereClause);

      return {
        metrics,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting business metrics:', error);
      throw error;
    }
  }

  // ===== EXPORTACIÓN DE DATOS =====

  /**
   * Crear exportación de datos
   */
  async createDataExport(exportData: NewDataExport): Promise<DataExport> {
    try {
      const [dataExport] = await db.insert(dataExports).values(exportData).returning();
      logger.info(`Data export created: ${dataExport.name}`);
      return dataExport;
    } catch (error) {
      logger.error('Error creating data export:', error);
      throw error;
    }
  }

  /**
   * Obtener exportaciones
   */
  async getDataExports(filters: {
    requestedBy?: number;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ exports: DataExport[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.requestedBy) {
        conditions.push(eq(dataExports.requestedBy, filters.requestedBy));
      }
      if (filters.type) {
        conditions.push(eq(dataExports.type, filters.type));
      }
      if (filters.status) {
        conditions.push(eq(dataExports.status, filters.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const exports = await db
        .select()
        .from(dataExports)
        .where(whereClause)
        .orderBy(desc(dataExports.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(dataExports)
        .where(whereClause);

      return {
        exports,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting data exports:', error);
      throw error;
    }
  }

  // ===== ALERTAS DE MÉTRICAS =====

  /**
   * Crear alerta de métrica
   */
  async createMetricAlert(alertData: NewMetricAlert): Promise<MetricAlert> {
    try {
      const [alert] = await db.insert(metricAlerts).values(alertData).returning();
      logger.info(`Metric alert created: ${alert.name}`);
      return alert;
    } catch (error) {
      logger.error('Error creating metric alert:', error);
      throw error;
    }
  }

  /**
   * Obtener alertas
   */
  async getMetricAlerts(filters: {
    metricId?: number;
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: MetricAlert[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.metricId) {
        conditions.push(eq(metricAlerts.metricId, filters.metricId));
      }
      if (filters.status) {
        conditions.push(eq(metricAlerts.status, filters.status));
      }
      if (filters.severity) {
        conditions.push(eq(metricAlerts.severity, filters.severity));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const alerts = await db
        .select()
        .from(metricAlerts)
        .where(whereClause)
        .orderBy(desc(metricAlerts.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(metricAlerts)
        .where(whereClause);

      return {
        alerts,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting metric alerts:', error);
      throw error;
    }
  }

  // ===== ESTADÍSTICAS GENERALES =====

  /**
   * Obtener estadísticas generales del sistema
   */
  async getSystemStats(): Promise<any> {
    try {
      const [
        eventsCount,
        performanceCount,
        reportsCount,
        dashboardsCount,
        metricsCount,
        exportsCount,
        alertsCount
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents),
        db.select({ count: sql<number>`count(*)` }).from(performanceMetrics),
        db.select({ count: sql<number>`count(*)` }).from(customReports),
        db.select({ count: sql<number>`count(*)` }).from(dashboards),
        db.select({ count: sql<number>`count(*)` }).from(businessMetrics),
        db.select({ count: sql<number>`count(*)` }).from(dataExports),
        db.select({ count: sql<number>`count(*)` }).from(metricAlerts)
      ]);

      return {
        events: eventsCount[0]?.count || 0,
        performance: performanceCount[0]?.count || 0,
        reports: reportsCount[0]?.count || 0,
        dashboards: dashboardsCount[0]?.count || 0,
        metrics: metricsCount[0]?.count || 0,
        exports: exportsCount[0]?.count || 0,
        alerts: alertsCount[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error getting system stats:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();