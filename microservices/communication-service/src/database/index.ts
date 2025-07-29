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
      -- Tabla de notificaciones
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'unread',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        expires_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de mensajes
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        status VARCHAR(20) DEFAULT 'sent',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de conversaciones
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200),
        type VARCHAR(20) DEFAULT 'direct',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de participantes en conversaciones
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB
      );

      -- Tabla de mensajes de conversación
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        status VARCHAR(20) DEFAULT 'sent',
        reply_to_id INTEGER REFERENCES conversation_messages(id),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de encuestas
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        is_anonymous BOOLEAN DEFAULT false,
        allow_multiple_responses BOOLEAN DEFAULT false,
        target_audience JSONB,
        settings JSONB,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de preguntas de encuesta
      CREATE TABLE IF NOT EXISTS survey_questions (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT false,
        "order" INTEGER NOT NULL,
        options JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de respuestas de encuesta
      CREATE TABLE IF NOT EXISTS survey_responses (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        user_id INTEGER,
        session_id VARCHAR(100),
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        is_complete BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de respuestas individuales
      CREATE TABLE IF NOT EXISTS survey_answers (
        id SERIAL PRIMARY KEY,
        response_id INTEGER NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de anuncios
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        is_pinned BOOLEAN DEFAULT false,
        target_audience JSONB,
        created_by INTEGER NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de comentarios de anuncios
      CREATE TABLE IF NOT EXISTS announcement_comments (
        id SERIAL PRIMARY KEY,
        announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de plantillas de notificación
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(200),
        content TEXT NOT NULL,
        variables JSONB,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de configuración de notificaciones por usuario
      CREATE TABLE IF NOT EXISTS user_notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_enabled BOOLEAN DEFAULT true,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de logs de comunicación
      CREATE TABLE IF NOT EXISTS communication_logs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_id INTEGER,
        target_id INTEGER,
        content TEXT,
        status VARCHAR(20) DEFAULT 'success',
        error TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Crear índices para mejorar el rendimiento
    await client`
      -- Índices para notificaciones
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

      -- Índices para mensajes
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

      -- Índices para conversaciones
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

      -- Índices para encuestas
      CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
      CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(type);
      CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);

      -- Índices para anuncios
      CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
      CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
      CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);

      -- Índices para logs
      CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(type);
      CREATE INDEX IF NOT EXISTS idx_communication_logs_user_id ON communication_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at);
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

// Manejar cierre de conexión al terminar el proceso
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});