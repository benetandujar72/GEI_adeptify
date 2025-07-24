import { db } from '../index.js';
import { logger } from '../utils/logger.js';
import { cacheService, cacheUtils } from './cache-service.js';
import { sql } from 'drizzle-orm';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  rowsAffected?: number;
}

export interface DatabaseStats {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  cacheHitRate: number;
  activeConnections: number;
  tableSizes: Record<string, number>;
}

export interface OptimizationConfig {
  enableQueryCache: boolean;
  enableConnectionPooling: boolean;
  enableQueryMonitoring: boolean;
  slowQueryThreshold: number;
  maxCacheSize: number;
  cacheTTL: number;
}

export class DatabaseOptimizer {
  private queryMetrics: QueryMetrics[] = [];
  private config: OptimizationConfig;
  private isMonitoring: boolean = false;

  constructor(config: OptimizationConfig = {
    enableQueryCache: true,
    enableConnectionPooling: true,
    enableQueryMonitoring: true,
    slowQueryThreshold: 1000, // 1 segundo
    maxCacheSize: 1000,
    cacheTTL: 3600
  }) {
    this.config = config;
  }

  /**
   * Inicializa el optimizador de base de datos
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🚀 Inicializando optimizador de base de datos...');

      // Crear índices optimizados
      await this.createOptimizedIndexes();

      // Configurar connection pooling
      if (this.config.enableConnectionPooling) {
        await this.configureConnectionPooling();
      }

      // Iniciar monitoreo de consultas
      if (this.config.enableQueryMonitoring) {
        await this.startQueryMonitoring();
      }

      logger.info('✅ Optimizador de base de datos inicializado');
    } catch (error) {
      logger.error('❌ Error inicializando optimizador de base de datos:', error);
    }
  }

  /**
   * Crea índices optimizados para mejorar el rendimiento
   */
  private async createOptimizedIndexes(): Promise<void> {
    try {
      logger.info('📊 Creando índices optimizados...');

      // Índices para usuarios
      await this.createIndexIfNotExists('users', 'email_idx', 'email');
      await this.createIndexIfNotExists('users', 'institute_id_idx', 'institute_id');
      await this.createIndexIfNotExists('users', 'role_idx', 'role');

      // Índices para competencias
      await this.createIndexIfNotExists('competencies', 'institute_id_idx', 'institute_id');
      await this.createIndexIfNotExists('competencies', 'category_idx', 'category');
      await this.createIndexIfNotExists('competencies', 'level_idx', 'level');

      // Índices para evaluaciones
      await this.createIndexIfNotExists('evaluations', 'student_id_idx', 'student_id');
      await this.createIndexIfNotExists('evaluations', 'competency_id_idx', 'competency_id');
      await this.createIndexIfNotExists('evaluations', 'institute_id_idx', 'institute_id');
      await this.createIndexIfNotExists('evaluations', 'created_at_idx', 'created_at');

      // Índices para asistencia
      await this.createIndexIfNotExists('attendance', 'student_id_idx', 'student_id');
      await this.createIndexIfNotExists('attendance', 'date_idx', 'date');
      await this.createIndexIfNotExists('attendance', 'institute_id_idx', 'institute_id');

      // Índices para guardias
      await this.createIndexIfNotExists('guard_duties', 'user_id_idx', 'user_id');
      await this.createIndexIfNotExists('guard_duties', 'date_idx', 'date');
      await this.createIndexIfNotExists('guard_duties', 'institute_id_idx', 'institute_id');

      // Índices para encuestas
      await this.createIndexIfNotExists('surveys', 'institute_id_idx', 'institute_id');
      await this.createIndexIfNotExists('surveys', 'created_at_idx', 'created_at');

      // Índices para recursos
      await this.createIndexIfNotExists('resources', 'institute_id_idx', 'institute_id');
      await this.createIndexIfNotExists('resources', 'type_idx', 'type');

      // Índices para notificaciones
      await this.createIndexIfNotExists('notifications', 'user_id_idx', 'user_id');
      await this.createIndexIfNotExists('notifications', 'read_idx', 'read');
      await this.createIndexIfNotExists('notifications', 'created_at_idx', 'created_at');

      // Índices para logs de auditoría
      await this.createIndexIfNotExists('audit_logs', 'user_id_idx', 'user_id');
      await this.createIndexIfNotExists('audit_logs', 'institute_id_idx', 'institute_id');
      await this.createIndexIfNotExists('audit_logs', 'action_idx', 'action');
      await this.createIndexIfNotExists('audit_logs', 'created_at_idx', 'created_at');

      logger.info('✅ Índices optimizados creados');
    } catch (error) {
      logger.error('❌ Error creando índices:', error);
    }
  }

  /**
   * Crea un índice si no existe
   */
  private async createIndexIfNotExists(table: string, indexName: string, column: string): Promise<void> {
    try {
      const indexExists = await this.checkIndexExists(table, indexName);
      if (!indexExists) {
        await db.execute(sql`CREATE INDEX IF NOT EXISTS ${sql.identifier(indexName)} ON ${sql.identifier(table)} (${sql.identifier(column)})`);
        logger.debug(`📈 Índice creado: ${table}.${indexName} en ${column}`);
      }
    } catch (error) {
      logger.warn(`⚠️ No se pudo crear índice ${indexName} en ${table}:`, error);
    }
  }

  /**
   * Verifica si un índice existe
   */
  private async checkIndexExists(table: string, indexName: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = ${table} AND indexname = ${indexName}
      `);
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Configura connection pooling
   */
  private async configureConnectionPooling(): Promise<void> {
    try {
      logger.info('🔗 Configurando connection pooling...');

      // Configurar parámetros de conexión optimizados
      await db.execute(sql`SET max_connections = 100`);
      await db.execute(sql`SET shared_buffers = '256MB'`);
      await db.execute(sql`SET effective_cache_size = '1GB'`);
      await db.execute(sql`SET maintenance_work_mem = '64MB'`);
      await db.execute(sql`SET checkpoint_completion_target = 0.9`);
      await db.execute(sql`SET wal_buffers = '16MB'`);
      await db.execute(sql`SET default_statistics_target = 100`);
      await db.execute(sql`SET random_page_cost = 1.1`);
      await db.execute(sql`SET effective_io_concurrency = 200`);

      logger.info('✅ Connection pooling configurado');
    } catch (error) {
      logger.warn('⚠️ No se pudieron configurar parámetros de conexión:', error);
    }
  }

  /**
   * Inicia el monitoreo de consultas
   */
  private async startQueryMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('📊 Iniciando monitoreo de consultas...');

    // Configurar logging de consultas lentas
    await db.execute(sql`SET log_statement = 'all'`);
    await db.execute(sql`SET log_min_duration_statement = ${this.config.slowQueryThreshold}`);

    // Limpiar métricas cada hora
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    logger.info('✅ Monitoreo de consultas iniciado');
  }

  /**
   * Registra una métrica de consulta
   */
  recordQueryMetric(metric: QueryMetrics): void {
    if (!this.isMonitoring) return;

    this.queryMetrics.push(metric);

    // Verificar si es una consulta lenta
    if (metric.executionTime > this.config.slowQueryThreshold) {
      logger.warn(`🐌 Consulta lenta detectada: ${metric.query} (${metric.executionTime}ms)`);
    }

    // Limitar el tamaño del array de métricas
    if (this.queryMetrics.length > this.config.maxCacheSize) {
      this.queryMetrics = this.queryMetrics.slice(-this.config.maxCacheSize);
    }
  }

  /**
   * Ejecuta una consulta con caché
   */
  async executeWithCache<T>(
    queryFn: () => Promise<T>,
    cacheKey: string,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    if (!this.config.enableQueryCache) {
      return await queryFn();
    }

    const startTime = Date.now();
    
    try {
      const result = await cacheService.getOrSet(
        cacheKey,
        queryFn,
        {
          ttl: options.ttl || this.config.cacheTTL,
          tags: options.tags
        }
      );

      const executionTime = Date.now() - startTime;
      this.recordQueryMetric({
        query: cacheKey,
        executionTime,
        timestamp: new Date(),
        table: this.extractTableFromCacheKey(cacheKey),
        operation: 'SELECT'
      });

      return result;
    } catch (error) {
      logger.error('Error ejecutando consulta con caché:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una consulta sin caché (para operaciones de escritura)
   */
  async executeWithoutCache<T>(queryFn: () => Promise<T>, operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT'): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      
      const executionTime = Date.now() - startTime;
      this.recordQueryMetric({
        query: 'write_operation',
        executionTime,
        timestamp: new Date(),
        table: 'unknown',
        operation
      });

      return result;
    } catch (error) {
      logger.error('Error ejecutando consulta sin caché:', error);
      throw error;
    }
  }

  /**
   * Invalida el caché para una tabla específica
   */
  async invalidateCache(table: string, instituteId?: string): Promise<void> {
    try {
      const tags = cacheUtils.generateTags(table, instituteId);
      await cacheService.deleteByTags(tags);
      logger.debug(`🗑️ Caché invalidado para tabla: ${table}`);
    } catch (error) {
      logger.error('Error invalidando caché:', error);
    }
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const stats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `);

      const tableSizes = await this.getTableSizes();
      const cacheStats = await cacheService.getStats();

      return {
        totalQueries: this.queryMetrics.length,
        averageExecutionTime: this.calculateAverageExecutionTime(),
        slowQueries: this.queryMetrics.filter(q => q.executionTime > this.config.slowQueryThreshold).length,
        cacheHitRate: cacheStats.hitRate,
        activeConnections: await this.getActiveConnections(),
        tableSizes
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas de base de datos:', error);
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        activeConnections: 0,
        tableSizes: {}
      };
    }
  }

  /**
   * Obtiene el tamaño de las tablas
   */
  private async getTableSizes(): Promise<Record<string, number>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY size DESC
      `);

      const tableSizes: Record<string, number> = {};
      result.forEach((row: any) => {
        tableSizes[row.tablename] = parseInt(row.size);
      });

      return tableSizes;
    } catch (error) {
      logger.error('Error obteniendo tamaños de tabla:', error);
      return {};
    }
  }

  /**
   * Obtiene el número de conexiones activas
   */
  private async getActiveConnections(): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      
      return parseInt(result[0]?.active_connections || '0');
    } catch (error) {
      logger.error('Error obteniendo conexiones activas:', error);
      return 0;
    }
  }

  /**
   * Calcula el tiempo promedio de ejecución
   */
  private calculateAverageExecutionTime(): number {
    if (this.queryMetrics.length === 0) return 0;
    
    const totalTime = this.queryMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    return totalTime / this.queryMetrics.length;
  }

  /**
   * Limpia métricas antiguas
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.queryMetrics = this.queryMetrics.filter(metric => metric.timestamp > oneHourAgo);
    logger.debug('🧹 Métricas antiguas limpiadas');
  }

  /**
   * Extrae el nombre de la tabla de una clave de caché
   */
  private extractTableFromCacheKey(cacheKey: string): string {
    const match = cacheKey.match(/query:([^:]+):/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Optimiza una tabla específica
   */
  async optimizeTable(table: string): Promise<void> {
    try {
      logger.info(`🔧 Optimizando tabla: ${table}`);
      
      // Analizar tabla
      await db.execute(sql`ANALYZE ${sql.identifier(table)}`);
      
      // Vacuum tabla
      await db.execute(sql`VACUUM ${sql.identifier(table)}`);
      
      // Reindexar tabla
      await db.execute(sql`REINDEX TABLE ${sql.identifier(table)}`);
      
      logger.info(`✅ Tabla ${table} optimizada`);
    } catch (error) {
      logger.error(`❌ Error optimizando tabla ${table}:`, error);
    }
  }

  /**
   * Obtiene las consultas más lentas
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.queryMetrics
      .filter(q => q.executionTime > this.config.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Obtiene las consultas más frecuentes
   */
  getFrequentQueries(limit: number = 10): Array<{ query: string; count: number; avgTime: number }> {
    const queryCounts: Record<string, { count: number; totalTime: number }> = {};
    
    this.queryMetrics.forEach(metric => {
      if (!queryCounts[metric.query]) {
        queryCounts[metric.query] = { count: 0, totalTime: 0 };
      }
      queryCounts[metric.query].count++;
      queryCounts[metric.query].totalTime += metric.executionTime;
    });

    return Object.entries(queryCounts)
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Instancia singleton del optimizador
export const databaseOptimizer = new DatabaseOptimizer(); 