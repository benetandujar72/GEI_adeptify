import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '../utils/logger.js';

// Configuración de la conexión a PostgreSQL
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/adeptify_users';

// Configuración del cliente PostgreSQL
const client = postgres(connectionString, {
  max: 10, // máximo 10 conexiones en el pool
  idle_timeout: 20, // cerrar conexiones inactivas después de 20 segundos
  connect_timeout: 10, // timeout de conexión de 10 segundos
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Crear instancia de Drizzle
export const db = drizzle(client);

// Función para verificar la conexión a la base de datos
export const checkDatabaseConnection = async () => {
  try {
    const result = await client`SELECT 1 as test`;
    logger.info('Database connection successful');
    return {
      status: 'success',
      message: 'Database connection established',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Database connection failed:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    };
  }
};

// Función para cerrar la conexión a la base de datos
export const closeDatabaseConnection = async () => {
  try {
    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Exportar el cliente para uso directo si es necesario
export { client }; 