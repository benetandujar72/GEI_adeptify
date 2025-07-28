import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Configuración de la base de datos
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/course_service';

// Cliente de PostgreSQL
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Función para cerrar la conexión
export const closeConnection = async () => {
  await client.end();
};

// Función para verificar la conexión
export const checkConnection = async () => {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Error checking database connection:', error);
    return false;
  }
};

// Función para inicializar las tablas
export const initializeTables = async () => {
  try {
    // Verificar que las tablas existen
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('courses', 'subjects', 'curriculum', 'schedules', 'grades', 'enrollments', 'course_resources', 'assignments', 'submissions')
    `;
    
    console.log('✅ Database tables verified:', tables.map(t => t.table_name));
    return true;
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    return false;
  }
};

export default db; 