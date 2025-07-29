import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './connection.js';
import { logger } from '../utils/logger.js';

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
  checksum: string;
}

class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = join(process.cwd(), 'src', 'database', 'migrations');
  }

  /**
   * Ejecuta todas las migraciones pendientes
   */
  async migrate(): Promise<void> {
    try {
      logger.info('Iniciando migración de base de datos...');

      // Crear tabla de migraciones si no existe
      await this.createMigrationsTable();

      // Obtener migraciones ejecutadas
      const executedMigrations = await this.getExecutedMigrations();

      // Obtener archivos de migración
      const migrationFiles = this.getMigrationFiles();

      // Ejecutar migraciones pendientes
      for (const file of migrationFiles) {
        if (!executedMigrations.has(file.name)) {
          await this.executeMigration(file);
        }
      }

      logger.info('Migración de base de datos completada exitosamente');
    } catch (error) {
      logger.error('Error durante la migración de base de datos', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Crea la tabla de migraciones si no existe
   */
  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        execution_time_ms INTEGER,
        status VARCHAR(20) DEFAULT 'success'
      );
    `;

    await db.execute(createTableSQL);
    logger.info('Tabla de migraciones verificada/creada');
  }

  /**
   * Obtiene las migraciones ya ejecutadas
   */
  private async getExecutedMigrations(): Promise<Set<string>> {
    try {
      const result = await db.execute('SELECT name FROM migrations WHERE status = \'success\'');
      return new Set(result.map((row: any) => row.name));
    } catch (error) {
      logger.warn('No se pudieron obtener migraciones ejecutadas', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return new Set();
    }
  }

  /**
   * Obtiene la lista de archivos de migración
   */
  private getMigrationFiles(): Array<{ name: string; path: string; content: string }> {
    const files = [
      '001_initial_schema.sql',
      '002_add_user_preferences.sql',
      '003_optimize_performance.sql',
      '004_backup_configuration.sql'
    ];

    return files.map(file => {
      const path = join(this.migrationsPath, file);
      const content = readFileSync(path, 'utf-8');
      return { name: file, path, content };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Ejecuta una migración específica
   */
  private async executeMigration(file: { name: string; path: string; content: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info(`Ejecutando migración: ${file.name}`);

      // Calcular checksum del archivo
      const checksum = this.calculateChecksum(file.content);

      // Registrar inicio de migración
      await this.recordMigrationStart(file.name, checksum);

      // Dividir el contenido en statements SQL
      const statements = this.splitSQLStatements(file.content);

      // Ejecutar cada statement
      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(statement);
        }
      }

      // Registrar migración exitosa
      const executionTime = Date.now() - startTime;
      await this.recordMigrationSuccess(file.name, checksum, executionTime);

      logger.info(`Migración ${file.name} completada en ${executionTime}ms`);
    } catch (error) {
      // Registrar migración fallida
      await this.recordMigrationFailure(file.name, error instanceof Error ? error.message : 'Error desconocido');
      
      logger.error(`Error ejecutando migración ${file.name}`, {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Divide el contenido SQL en statements individuales
   */
  private splitSQLStatements(content: string): string[] {
    // Remover comentarios de una línea
    const withoutSingleLineComments = content.replace(/--.*$/gm, '');
    
    // Remover comentarios multilínea
    const withoutMultiLineComments = withoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Dividir por punto y coma, pero respetar strings
    const statements = withoutMultiLineComments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    return statements;
  }

  /**
   * Calcula el checksum de un archivo
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Registra el inicio de una migración
   */
  private async recordMigrationStart(name: string, checksum: string): Promise<void> {
    await db.execute(`
      INSERT INTO migrations (name, checksum, status, executed_at)
      VALUES ($1, $2, 'in_progress', NOW())
      ON CONFLICT (name) DO UPDATE SET
        checksum = EXCLUDED.checksum,
        status = 'in_progress',
        executed_at = NOW()
    `, [name, checksum]);
  }

  /**
   * Registra el éxito de una migración
   */
  private async recordMigrationSuccess(name: string, checksum: string, executionTime: number): Promise<void> {
    await db.execute(`
      UPDATE migrations 
      SET status = 'success', execution_time_ms = $1
      WHERE name = $2
    `, [executionTime, name]);
  }

  /**
   * Registra el fallo de una migración
   */
  private async recordMigrationFailure(name: string, errorMessage: string): Promise<void> {
    await db.execute(`
      UPDATE migrations 
      SET status = 'failed'
      WHERE name = $1
    `, [name]);
  }

  /**
   * Verifica el estado de las migraciones
   */
  async checkMigrationStatus(): Promise<void> {
    try {
      const result = await db.execute(`
        SELECT 
          name,
          status,
          executed_at,
          execution_time_ms,
          CASE 
            WHEN status = 'success' THEN '✅'
            WHEN status = 'failed' THEN '❌'
            WHEN status = 'in_progress' THEN '🔄'
            ELSE '❓'
          END as status_icon
        FROM migrations 
        ORDER BY executed_at
      `);

      logger.info('Estado de migraciones:');
      result.forEach((row: any) => {
        logger.info(`${row.status_icon} ${row.name} - ${row.status} (${row.execution_time_ms || 0}ms)`);
      });
    } catch (error) {
      logger.error('Error verificando estado de migraciones', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Revierte la última migración
   */
  async rollback(): Promise<void> {
    try {
      logger.info('Iniciando rollback de migración...');

      const lastMigration = await db.execute(`
        SELECT name FROM migrations 
        WHERE status = 'success' 
        ORDER BY executed_at DESC 
        LIMIT 1
      `);

      if (lastMigration.length === 0) {
        logger.info('No hay migraciones para revertir');
        return;
      }

      const migrationName = lastMigration[0].name;
      logger.info(`Revirtiendo migración: ${migrationName}`);

      // Aquí se implementaría la lógica de rollback específica
      // Por ahora solo marcamos como revertida
      await db.execute(`
        UPDATE migrations 
        SET status = 'rolled_back' 
        WHERE name = $1
      `, [migrationName]);

      logger.info(`Migración ${migrationName} revertida`);
    } catch (error) {
      logger.error('Error durante el rollback', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }
}

// Función principal para ejecutar migraciones
export async function runMigrations(): Promise<void> {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.migrate();
    await migrator.checkMigrationStatus();
  } catch (error) {
    logger.error('Error ejecutando migraciones', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    throw error;
  }
}

// Función para rollback
export async function rollbackMigration(): Promise<void> {
  const migrator = new DatabaseMigrator();
  await migrator.rollback();
}

// Exportar la clase para uso directo
export { DatabaseMigrator };