import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Configuración de la base de datos
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/user_service_db';

// Cliente de PostgreSQL
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Función para cerrar la conexión
export const closeDatabase = async () => {
  await client.end();
};

// Función para verificar la conexión
export const checkDatabaseConnection = async () => {
  try {
    await client`SELECT 1`;
    return { status: 'connected', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 