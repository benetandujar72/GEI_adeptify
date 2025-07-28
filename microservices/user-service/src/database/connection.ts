import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger, dbLogger } from '../utils/logger.js';

// ===== CONFIGURACIÓN DE CONEXIÓN =====

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/eduai_platform';

// Configuración del cliente PostgreSQL
const client = postgres(connectionString, {
  max: 10, // Máximo número de conexiones
  idle_timeout: 20, // Tiempo de inactividad antes de cerrar conexión
  connect_timeout: 10, // Tiempo de timeout para conexión
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  prepare: true, // Habilitar prepared statements
  debug: process.env.NODE_ENV === 'development',
  onnotice: (notice) => {
    dbLogger.info('PostgreSQL Notice', { notice: notice.message });
  },
  onparameter: (parameterStatus) => {
    dbLogger.debug('PostgreSQL Parameter', { parameterStatus });
  }
});

// Crear instancia de Drizzle
export const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development'
});

// ===== FUNCIONES DE CONEXIÓN =====

/**
 * Verifica la conexión a la base de datos
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await client`SELECT 1 as test`;
    dbLogger.info('Database connection test successful', { result: result[0] });
    return true;
  } catch (error) {
    dbLogger.error('Database connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeConnection(): Promise<void> {
  try {
    await client.end();
    dbLogger.info('Database connection closed successfully');
  } catch (error) {
    dbLogger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Ejecuta una transacción
 */
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await client.transaction(async (tx) => {
    const txDb = drizzle(tx);
    return await callback(txDb);
  });
}

/**
 * Health check de la base de datos
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    responseTime: number;
    activeConnections?: number;
  };
}> {
  const startTime = Date.now();
  
  try {
    // Verificar conexión
    const connectionTest = await testConnection();
    const responseTime = Date.now() - startTime;
    
    if (!connectionTest) {
      return {
        status: 'unhealthy',
        details: {
          connection: false,
          responseTime
        }
      };
    }
    
    // Obtener información de conexiones activas (si es posible)
    let activeConnections;
    try {
      const result = await client`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      activeConnections = parseInt(result[0]?.active_connections || '0');
    } catch (error) {
      dbLogger.warn('Could not get active connections count', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return {
      status: 'healthy',
      details: {
        connection: true,
        responseTime,
        activeConnections
      }
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    dbLogger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    });
    
    return {
      status: 'unhealthy',
      details: {
        connection: false,
        responseTime
      }
    };
  }
}

// ===== MIDDLEWARE DE CONEXIÓN =====

/**
 * Middleware para manejar errores de base de datos
 */
export function handleDatabaseError(error: any): never {
  dbLogger.error('Database operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    code: error.code,
    detail: error.detail,
    hint: error.hint
  });
  
  // Mapear errores de PostgreSQL a errores de aplicación
  if (error.code === '23505') { // Unique constraint violation
    throw new Error('Resource already exists');
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    throw new Error('Referenced resource does not exist');
  }
  
  if (error.code === '23502') { // Not null constraint violation
    throw new Error('Required field is missing');
  }
  
  if (error.code === '42P01') { // Table does not exist
    throw new Error('Database table not found');
  }
  
  if (error.code === '28P01') { // Authentication failed
    throw new Error('Database authentication failed');
  }
  
  if (error.code === '3D000') { // Database does not exist
    throw new Error('Database does not exist');
  }
  
  // Error genérico
  throw new Error('Database operation failed');
}

// ===== UTILIDADES DE CONEXIÓN =====

/**
 * Obtiene estadísticas de la base de datos
 */
export async function getDatabaseStats(): Promise<{
  totalTables: number;
  totalRows: number;
  databaseSize: string;
  lastVacuum: Date | null;
}> {
  try {
    // Obtener información de tablas
    const tablesResult = await client`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `;
    
    // Obtener tamaño de la base de datos
    const sizeResult = await client`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `;
    
    const totalTables = tablesResult.length;
    const totalRows = tablesResult.reduce((sum, table) => sum + parseInt(table.live_rows || '0'), 0);
    const databaseSize = sizeResult[0]?.database_size || 'Unknown';
    const lastVacuum = tablesResult[0]?.last_vacuum || null;
    
    return {
      totalTables,
      totalRows,
      databaseSize,
      lastVacuum
    };
    
  } catch (error) {
    dbLogger.error('Failed to get database stats', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      totalTables: 0,
      totalRows: 0,
      databaseSize: 'Unknown',
      lastVacuum: null
    };
  }
}

/**
 * Ejecuta una consulta con timeout
 */
export async function queryWithTimeout<T>(
  query: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    query(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

// ===== EVENTOS DE CONEXIÓN =====

// Manejar señales de cierre
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

// Exportar cliente para uso directo si es necesario
export { client };

export default db; 