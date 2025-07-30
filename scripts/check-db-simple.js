#!/usr/bin/env node

// Script para verificar el estado de la base de datos
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS');
console.log('========================================');

async function checkDatabase() {
  try {
    // Verificar variables de entorno
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está definida en las variables de entorno');
    }

    console.log('📡 Conectando a la base de datos...');
    
    // Crear conexión a la base de datos
    const sql = postgres(databaseUrl, { max: 1 });
    const db = drizzle(sql);

    // Verificar conexión
    console.log('🔌 Probando conexión...');
    await sql`SELECT 1 as test`;
    console.log('✅ Conexión exitosa');

    // Verificar tablas
    console.log('\n📋 VERIFICANDO ESTRUCTURA DE TABLAS');
    console.log('====================================');

    const tables = await sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      console.log('❌ No se encontraron tablas en la base de datos');
      console.log('💡 Ejecuta: npm run db:create-tables');
      return;
    }

    console.log(`✅ ${tables.length} tablas encontradas:`);
    tables.forEach(table => {
      console.log(`  📊 ${table.table_name} (${table.column_count} columnas)`);
    });

    // Verificar datos en tablas principales
    console.log('\n📊 VERIFICANDO DATOS EN TABLAS PRINCIPALES');
    console.log('==========================================');

    const dataChecks = [
      { table: 'institutes', description: 'Institutos' },
      { table: 'users', description: 'Usuarios' },
      { table: 'modules', description: 'Módulos' },
      { table: 'institute_modules', description: 'Módulos de instituto' },
      { table: 'academic_years', description: 'Años académicos' },
      { table: 'classes', description: 'Clases' },
      { table: 'competencies', description: 'Competencias' },
      { table: 'resources', description: 'Recursos' }
    ];

    for (const check of dataChecks) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(check.table)}`;
        const count = result[0].count;
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`${status} ${check.description}: ${count} registros`);
      } catch (error) {
        console.log(`❌ ${check.description}: Error - ${error.message}`);
      }
    }

    // Verificar ENUMs
    console.log('\n🎭 VERIFICANDO TIPOS ENUM');
    console.log('=========================');

    const enums = await sql`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `;

    if (enums.length > 0) {
      const enumGroups = {};
      enums.forEach(enumItem => {
        if (!enumGroups[enumItem.enum_name]) {
          enumGroups[enumItem.enum_name] = [];
        }
        enumGroups[enumItem.enum_name].push(enumItem.enum_value);
      });

      Object.entries(enumGroups).forEach(([enumName, values]) => {
        console.log(`✅ ${enumName}: [${values.join(', ')}]`);
      });
    } else {
      console.log('⚠️ No se encontraron tipos ENUM');
    }

    // Verificar índices
    console.log('\n🔍 VERIFICANDO ÍNDICES');
    console.log('======================');

    const indexes = await sql`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname NOT LIKE 'pg_%'
      ORDER BY tablename, indexname;
    `;

    if (indexes.length > 0) {
      console.log(`✅ ${indexes.length} índices encontrados:`);
      indexes.forEach(index => {
        console.log(`  📌 ${index.indexname} en ${index.tablename}`);
      });
    } else {
      console.log('⚠️ No se encontraron índices personalizados');
    }

    // Verificar restricciones de clave foránea
    console.log('\n🔗 VERIFICANDO CLAVES FORÁNEAS');
    console.log('==============================');

    const foreignKeys = await sql`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    if (foreignKeys.length > 0) {
      console.log(`✅ ${foreignKeys.length} claves foráneas encontradas:`);
      foreignKeys.forEach(fk => {
        console.log(`  🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('⚠️ No se encontraron claves foráneas');
    }

    // Verificar tamaño de la base de datos
    console.log('\n💾 VERIFICANDO TAMAÑO DE LA BASE DE DATOS');
    console.log('==========================================');

    const dbSize = await sql`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_database_size(current_database()) as size_bytes;
    `;

    console.log(`📊 Tamaño de la base de datos: ${dbSize[0].database_size}`);

    // Verificar estadísticas de tablas
    const tableStats = await sql`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
      LIMIT 10;
    `;

    if (tableStats.length > 0) {
      console.log('\n📈 ESTADÍSTICAS DE TABLAS (primeras 10):');
      console.log('========================================');
      tableStats.forEach(stat => {
        console.log(`  📊 ${stat.tablename}.${stat.attname}: ${stat.n_distinct} valores distintos`);
      });
    }

    // Cerrar conexión
    await sql.end();
    
    console.log('\n✅ Verificación completada exitosamente');
    console.log('🎉 La base de datos está en buen estado');
    
  } catch (error) {
    console.error('\n❌ ERROR AL VERIFICAR BASE DE DATOS:');
    console.error('====================================');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 SUGERENCIAS:');
      console.error('===============');
      console.error('1. Verificar que la base de datos esté ejecutándose');
      console.error('2. Verificar que DATABASE_URL sea correcta');
      console.error('3. Verificar permisos de conexión');
    }
    
    process.exit(1);
  }
}

// Ejecutar el script
checkDatabase(); 