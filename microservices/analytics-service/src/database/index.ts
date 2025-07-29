import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { logger } from '../utils/logger';

// Configuración de la conexión a PostgreSQL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/eduaidb';

// Crear cliente de PostgreSQL
const client = postgres(connectionString, {
  max: 10, // máximo 10 conexiones
  idle_timeout: 20, // cerrar conexiones inactivas después de 20 segundos
  connect_timeout: 10, // timeout de conexión de 10 segundos
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Crear instancia de Drizzle
export const db = drizzle(client, { schema });

/**
 * Verificar conexión a la base de datos
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Inicializar tablas si no existen
 */
export async function initializeTables(): Promise<void> {
  try {
    // Crear tablas si no existen
    await client`
      -- Tabla de eventos de analytics
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        user_id INTEGER,
        session_id VARCHAR(100),
        event_type VARCHAR(100) NOT NULL,
        event_name VARCHAR(200) NOT NULL,
        page_url TEXT,
        referrer TEXT,
        user_agent TEXT,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de métricas de rendimiento
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        user_id INTEGER,
        session_id VARCHAR(100),
        page_url TEXT NOT NULL,
        load_time INTEGER,
        dom_content_loaded INTEGER,
        first_paint INTEGER,
        first_contentful_paint INTEGER,
        largest_contentful_paint INTEGER,
        cumulative_layout_shift DECIMAL(5,4),
        first_input_delay INTEGER,
        time_to_interactive INTEGER,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de reportes personalizados
      CREATE TABLE IF NOT EXISTS custom_reports (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        created_by INTEGER NOT NULL,
        is_public BOOLEAN DEFAULT false,
        schedule JSONB,
        configuration JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de ejecuciones de reportes
      CREATE TABLE IF NOT EXISTS report_executions (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        report_id INTEGER NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        duration INTEGER,
        result_url TEXT,
        error TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de dashboards
      CREATE TABLE IF NOT EXISTS dashboards (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        created_by INTEGER NOT NULL,
        is_public BOOLEAN DEFAULT false,
        layout JSONB,
        configuration JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de widgets de dashboard
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        dashboard_id INTEGER NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50) NOT NULL,
        position JSONB,
        configuration JSONB,
        is_visible BOOLEAN DEFAULT true,
        "order" INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de métricas de negocio
      CREATE TABLE IF NOT EXISTS business_metrics (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        value DECIMAL(15,4) NOT NULL,
        unit VARCHAR(50),
        period VARCHAR(20) NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        target DECIMAL(15,4),
        threshold DECIMAL(15,4),
        status VARCHAR(20) DEFAULT 'normal',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de exportaciones de datos
      CREATE TABLE IF NOT EXISTS data_exports (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        format VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        requested_by INTEGER NOT NULL,
        file_url TEXT,
        file_size INTEGER,
        record_count INTEGER,
        filters JSONB,
        configuration JSONB,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );

      -- Tabla de alertas de métricas
      CREATE TABLE IF NOT EXISTS metric_alerts (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        metric_id INTEGER NOT NULL REFERENCES business_metrics(id) ON DELETE CASCADE,
        condition VARCHAR(20) NOT NULL,
        threshold DECIMAL(15,4) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        severity VARCHAR(20) DEFAULT 'medium',
        notification_channels JSONB,
        cooldown_period INTEGER,
        last_triggered TIMESTAMP,
        trigger_count INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de logs de alertas
      CREATE TABLE IF NOT EXISTS alert_logs (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        alert_id INTEGER NOT NULL REFERENCES metric_alerts(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        metric_value DECIMAL(15,4) NOT NULL,
        threshold DECIMAL(15,4) NOT NULL,
        message TEXT,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMP,
        resolved_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Crear índices para mejorar el rendimiento
    await client`
      -- Índices para analytics_events
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

      -- Índices para performance_metrics
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_url ON performance_metrics(page_url);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

      -- Índices para custom_reports
      CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON custom_reports(created_by);
      CREATE INDEX IF NOT EXISTS idx_custom_reports_type ON custom_reports(type);
      CREATE INDEX IF NOT EXISTS idx_custom_reports_status ON custom_reports(status);

      -- Índices para report_executions
      CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_id);
      CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
      CREATE INDEX IF NOT EXISTS idx_report_executions_started_at ON report_executions(started_at);

      -- Índices para dashboards
      CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
      CREATE INDEX IF NOT EXISTS idx_dashboards_type ON dashboards(type);
      CREATE INDEX IF NOT EXISTS idx_dashboards_status ON dashboards(status);

      -- Índices para dashboard_widgets
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(type);
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_order ON dashboard_widgets("order");

      -- Índices para business_metrics
      CREATE INDEX IF NOT EXISTS idx_business_metrics_category ON business_metrics(category);
      CREATE INDEX IF NOT EXISTS idx_business_metrics_type ON business_metrics(type);
      CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON business_metrics(period);
      CREATE INDEX IF NOT EXISTS idx_business_metrics_period_start ON business_metrics(period_start);

      -- Índices para data_exports
      CREATE INDEX IF NOT EXISTS idx_data_exports_requested_by ON data_exports(requested_by);
      CREATE INDEX IF NOT EXISTS idx_data_exports_type ON data_exports(type);
      CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);

      -- Índices para metric_alerts
      CREATE INDEX IF NOT EXISTS idx_metric_alerts_metric_id ON metric_alerts(metric_id);
      CREATE INDEX IF NOT EXISTS idx_metric_alerts_status ON metric_alerts(status);
      CREATE INDEX IF NOT EXISTS idx_metric_alerts_severity ON metric_alerts(severity);

      -- Índices para alert_logs
      CREATE INDEX IF NOT EXISTS idx_alert_logs_alert_id ON alert_logs(alert_id);
      CREATE INDEX IF NOT EXISTS idx_alert_logs_status ON alert_logs(status);
      CREATE INDEX IF NOT EXISTS idx_alert_logs_created_at ON alert_logs(created_at);
    `;

    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Error initializing database tables:', error);
    throw error;
  }
}

/**
 * Cerrar conexión a la base de datos
 */
export async function closeConnection(): Promise<void> {
  try {
    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection...');
  await closeConnection();
  process.exit(0);
});