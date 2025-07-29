import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, json, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de eventos de analytics
export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  userId: integer('user_id'),
  sessionId: varchar('session_id', { length: 100 }),
  eventType: varchar('event_type', { length: 100 }).notNull(), // page_view, click, form_submit, etc.
  eventName: varchar('event_name', { length: 200 }).notNull(),
  pageUrl: text('page_url'),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: json('metadata').$type<{
    elementId?: string;
    elementClass?: string;
    elementText?: string;
    formData?: Record<string, any>;
    customData?: Record<string, any>;
    performance?: {
      loadTime?: number;
      domContentLoaded?: number;
      firstPaint?: number;
      firstContentfulPaint?: number;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de métricas de rendimiento
export const performanceMetrics = pgTable('performance_metrics', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  userId: integer('user_id'),
  sessionId: varchar('session_id', { length: 100 }),
  pageUrl: text('page_url').notNull(),
  loadTime: integer('load_time'), // en milisegundos
  domContentLoaded: integer('dom_content_loaded'),
  firstPaint: integer('first_paint'),
  firstContentfulPaint: integer('first_contentful_paint'),
  largestContentfulPaint: integer('largest_contentful_paint'),
  cumulativeLayoutShift: decimal('cumulative_layout_shift', { precision: 5, scale: 4 }),
  firstInputDelay: integer('first_input_delay'),
  timeToInteractive: integer('time_to_interactive'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: json('metadata').$type<{
    deviceType?: string;
    browser?: string;
    os?: string;
    connectionType?: string;
    customMetrics?: Record<string, number>;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de reportes personalizados
export const customReports = pgTable('custom_reports', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // analytics, performance, business, custom
  status: varchar('status', { length: 20 }).default('draft'), // draft, active, archived
  createdBy: integer('created_by').notNull(),
  isPublic: boolean('is_public').default(false),
  schedule: json('schedule').$type<{
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    time?: string;
    timezone?: string;
    recipients?: string[];
    enabled?: boolean;
  }>(),
  configuration: json('configuration').$type<{
    dataSources?: string[];
    filters?: Record<string, any>[];
    aggregations?: Record<string, any>[];
    visualizations?: Record<string, any>[];
    exportFormats?: string[];
  }>(),
  metadata: json('metadata').$type<{
    tags?: string[];
    category?: string;
    version?: string;
    lastRun?: string;
    nextRun?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de ejecuciones de reportes
export const reportExecutions = pgTable('report_executions', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  reportId: integer('report_id').references(() => customReports.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, running, completed, failed
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // en milisegundos
  resultUrl: text('result_url'),
  error: text('error'),
  metadata: json('metadata').$type<{
    parameters?: Record<string, any>;
    filters?: Record<string, any>;
    outputFormat?: string;
    fileSize?: number;
    recordCount?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de dashboards
export const dashboards = pgTable('dashboards', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // overview, detailed, executive, custom
  status: varchar('status', { length: 20 }).default('draft'), // draft, active, archived
  createdBy: integer('created_by').notNull(),
  isPublic: boolean('is_public').default(false),
  layout: json('layout').$type<{
    grid?: {
      columns?: number;
      rows?: number;
    };
    widgets?: Array<{
      id: string;
      type: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      configuration: Record<string, any>;
    }>;
  }>(),
  configuration: json('configuration').$type<{
    refreshInterval?: number;
    autoRefresh?: boolean;
    theme?: string;
    permissions?: {
      view?: number[];
      edit?: number[];
      admin?: number[];
    };
  }>(),
  metadata: json('metadata').$type<{
    tags?: string[];
    category?: string;
    version?: string;
    lastViewed?: string;
    viewCount?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de widgets de dashboard
export const dashboardWidgets = pgTable('dashboard_widgets', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  dashboardId: integer('dashboard_id').references(() => dashboards.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // chart, table, metric, text, iframe
  position: json('position').$type<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>(),
  configuration: json('configuration').$type<{
    dataSource?: string;
    query?: string;
    chartType?: string;
    colors?: string[];
    options?: Record<string, any>;
    refreshInterval?: number;
  }>(),
  isVisible: boolean('is_visible').default(true),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de métricas de negocio
export const businessMetrics = pgTable('business_metrics', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(), // academic, financial, operational, user
  type: varchar('type', { length: 50 }).notNull(), // count, sum, average, percentage, ratio
  value: decimal('value', { precision: 15, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 50 }),
  period: varchar('period', { length: 20 }).notNull(), // daily, weekly, monthly, quarterly, yearly
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  target: decimal('target', { precision: 15, scale: 4 }),
  threshold: decimal('threshold', { precision: 15, scale: 4 }),
  status: varchar('status', { length: 20 }).default('normal'), // normal, warning, critical, success
  metadata: json('metadata').$type<{
    calculation?: string;
    dataSource?: string;
    filters?: Record<string, any>;
    trend?: {
      direction?: 'up' | 'down' | 'stable';
      percentage?: number;
      previousValue?: number;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de exportaciones de datos
export const dataExports = pgTable('data_exports', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // analytics, reports, metrics, custom
  format: varchar('format', { length: 20 }).notNull(), // csv, json, excel, pdf
  status: varchar('status', { length: 20 }).default('pending'), // pending, processing, completed, failed
  requestedBy: integer('requested_by').notNull(),
  fileUrl: text('file_url'),
  fileSize: integer('file_size'),
  recordCount: integer('record_count'),
  filters: json('filters').$type<{
    dateRange?: {
      start: string;
      end: string;
    };
    dataSources?: string[];
    customFilters?: Record<string, any>;
  }>(),
  configuration: json('configuration').$type<{
    columns?: string[];
    sorting?: Record<string, string>[];
    grouping?: string[];
    aggregations?: Record<string, string>[];
  }>(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Tabla de alertas de métricas
export const metricAlerts = pgTable('metric_alerts', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  metricId: integer('metric_id').references(() => businessMetrics.id, { onDelete: 'cascade' }).notNull(),
  condition: varchar('condition', { length: 20 }).notNull(), // greater_than, less_than, equals, not_equals
  threshold: decimal('threshold', { precision: 15, scale: 4 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'), // active, inactive, triggered
  severity: varchar('severity', { length: 20 }).default('medium'), // low, medium, high, critical
  notificationChannels: json('notification_channels').$type<{
    email?: string[];
    slack?: string[];
    webhook?: string[];
    sms?: string[];
  }>(),
  cooldownPeriod: integer('cooldown_period'), // en minutos
  lastTriggered: timestamp('last_triggered'),
  triggerCount: integer('trigger_count').default(0),
  metadata: json('metadata').$type<{
    message?: string;
    customActions?: Record<string, any>[];
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de logs de alertas
export const alertLogs = pgTable('alert_logs', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  alertId: integer('alert_id').references(() => metricAlerts.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // triggered, resolved, acknowledged
  metricValue: decimal('metric_value', { precision: 15, scale: 4 }).notNull(),
  threshold: decimal('threshold', { precision: 15, scale: 4 }).notNull(),
  message: text('message'),
  acknowledgedBy: integer('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  metadata: json('metadata').$type<{
    notificationSent?: boolean;
    channelsUsed?: string[];
    responseTime?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relaciones
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  // Relaciones futuras con User Service
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  // Relaciones futuras con User Service
}));

export const customReportsRelations = relations(customReports, ({ many }) => ({
  executions: many(reportExecutions),
}));

export const reportExecutionsRelations = relations(reportExecutions, ({ one }) => ({
  report: one(customReports, {
    fields: [reportExecutions.reportId],
    references: [customReports.id],
  }),
}));

export const dashboardsRelations = relations(dashboards, ({ many }) => ({
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardWidgets.dashboardId],
    references: [dashboards.id],
  }),
}));

export const businessMetricsRelations = relations(businessMetrics, ({ many }) => ({
  alerts: many(metricAlerts),
}));

export const metricAlertsRelations = relations(metricAlerts, ({ one, many }) => ({
  metric: one(businessMetrics, {
    fields: [metricAlerts.metricId],
    references: [businessMetrics.id],
  }),
  logs: many(alertLogs),
}));

export const alertLogsRelations = relations(alertLogs, ({ one }) => ({
  alert: one(metricAlerts, {
    fields: [alertLogs.alertId],
    references: [metricAlerts.id],
  }),
}));

// Tipos TypeScript
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;
export type CustomReport = typeof customReports.$inferSelect;
export type NewCustomReport = typeof customReports.$inferInsert;
export type ReportExecution = typeof reportExecutions.$inferSelect;
export type NewReportExecution = typeof reportExecutions.$inferInsert;
export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
export type BusinessMetric = typeof businessMetrics.$inferSelect;
export type NewBusinessMetric = typeof businessMetrics.$inferInsert;
export type DataExport = typeof dataExports.$inferSelect;
export type NewDataExport = typeof dataExports.$inferInsert;
export type MetricAlert = typeof metricAlerts.$inferSelect;
export type NewMetricAlert = typeof metricAlerts.$inferInsert;
export type AlertLog = typeof alertLogs.$inferSelect;
export type NewAlertLog = typeof alertLogs.$inferInsert;