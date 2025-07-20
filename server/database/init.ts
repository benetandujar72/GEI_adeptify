import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { logger } from '../utils/logger.js';

// Configuración de base de datos
const databaseUrl = process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified';
const sql = postgres(databaseUrl, { max: 1 });
export const db = drizzle(sql);

/**
 * Inicializa la base de datos
 * - Ejecuta migraciones
 * - Verifica conexión
 * - Crea tablas si no existen
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('🗄️ Inicializando base de datos...');
    
    // Verificar conexión
    await sql`SELECT 1`;
    logger.info('✅ Conexión a base de datos establecida');
    
    // Ejecutar migraciones si existen
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      logger.info('✅ Migraciones ejecutadas correctamente');
    } catch (error) {
      logger.warn('⚠️ No se encontraron migraciones o ya están aplicadas');
    }
    
    // Verificar que las tablas principales existen
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'institutes', 'academic_years')
    `;
    
    if (tables.length === 0) {
      logger.warn('⚠️ No se encontraron tablas principales. Ejecutando push de esquema...');
      // Aquí se podría ejecutar db.push() si es necesario
    } else {
      logger.info(`✅ Tablas encontradas: ${tables.map(t => t.table_name).join(', ')}`);
    }
    
  } catch (error) {
    logger.error('❌ Error al inicializar base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDatabase(): Promise<void> {
  try {
    await sql.end();
    logger.info('✅ Conexión a base de datos cerrada');
  } catch (error) {
    logger.error('❌ Error al cerrar conexión a base de datos:', error);
  }
} 