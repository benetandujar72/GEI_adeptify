import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { logger } from '../utils/logger';

// Configuración de la conexión a PostgreSQL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/eduai_resources';

// Crear cliente de PostgreSQL
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Crear instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Función para verificar la conexión a la base de datos
export async function checkConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

// Función para inicializar las tablas
export async function initializeTables(): Promise<boolean> {
  try {
    // Verificar si las tablas existen
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('resources', 'reservations', 'facilities', 'equipment', 'materials', 'maintenance', 'issue_reports', 'resource_audit')
    `;

    if (tables.length === 0) {
      logger.info('No tables found, creating schema...');
      await createTables();
    } else {
      logger.info(`Found ${tables.length} existing tables`);
    }

    return true;
  } catch (error) {
    logger.error('Error initializing tables:', error);
    return false;
  }
}

// Función para crear las tablas
async function createTables(): Promise<void> {
  try {
    // Crear tabla de recursos
    await client`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        location VARCHAR(200),
        capacity INTEGER,
        status VARCHAR(20) DEFAULT 'available',
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de reservas
    await client`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        purpose VARCHAR(100),
        attendees INTEGER,
        is_recurring BOOLEAN DEFAULT false,
        recurrence_pattern JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de instalaciones
    await client`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        address TEXT,
        coordinates JSONB,
        capacity INTEGER,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de equipos
    await client`
      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        model VARCHAR(100),
        serial_number VARCHAR(100),
        manufacturer VARCHAR(100),
        purchase_date TIMESTAMP,
        warranty_expiry TIMESTAMP,
        status VARCHAR(20) DEFAULT 'available',
        location VARCHAR(200),
        assigned_to INTEGER,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de materiales
    await client`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(20),
        min_quantity INTEGER DEFAULT 0,
        location VARCHAR(200),
        supplier VARCHAR(200),
        cost DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de mantenimiento
    await client`
      CREATE TABLE IF NOT EXISTS maintenance (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        scheduled_date TIMESTAMP,
        completed_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'scheduled',
        assigned_to INTEGER,
        cost DECIMAL(10,2),
        priority VARCHAR(20) DEFAULT 'normal',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de reportes de problemas
    await client`
      CREATE TABLE IF NOT EXISTS issue_reports (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        reported_by INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to INTEGER,
        reported_date TIMESTAMP DEFAULT NOW(),
        resolved_date TIMESTAMP,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crear tabla de auditoría
    await client`
      CREATE TABLE IF NOT EXISTS resource_audit (
        id SERIAL PRIMARY KEY,
        resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `;

    // Crear índices para mejorar el rendimiento
    await client`CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type)`;
    await client`CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status)`;
    await client`CREATE INDEX IF NOT EXISTS idx_reservations_resource_id ON reservations(resource_id)`;
    await client`CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id)`;
    await client`CREATE INDEX IF NOT EXISTS idx_reservations_start_time ON reservations(start_time)`;
    await client`CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type)`;
    await client`CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)`;
    await client`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`;
    await client`CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status)`;
    await client`CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status)`;

    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  }
}

// Función para cerrar la conexión
export async function closeConnection(): Promise<void> {
  try {
    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Manejar señales para cerrar la conexión
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});