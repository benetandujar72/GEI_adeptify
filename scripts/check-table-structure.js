#!/usr/bin/env node

// Script para verificar la estructura real de las tablas en producción
import postgres from 'postgres';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function checkTableStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLAS EN PRODUCCIÓN');
  console.log('================================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');
    
    // Lista de tablas principales
    const tables = [
      'institutes',
      'users', 
      'academic_years',
      'modules',
      'institute_modules',
      'classes',
      'competencies',
      'resources'
    ];
    
    console.log('\n📋 ESTRUCTURA DE TABLAS:');
    console.log('========================');
    
    for (const tableName of tables) {
      try {
        console.log(`\n🏗️ Tabla: ${tableName}`);
        console.log('─'.repeat(50));
        
        // Obtener información de columnas
        const columns = await sql`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `;
        
        if (columns.length === 0) {
          console.log(`  ❌ Tabla ${tableName} no existe`);
        } else {
          columns.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            console.log(`  📝 ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
          });
        }
        
        // Contar registros
        try {
          const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
          console.log(`  📊 Registros: ${countResult[0].count}`);
        } catch (error) {
          console.log(`  📊 Registros: Error - ${error.message}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error verificando ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 RESUMEN:');
    console.log('===========');
    console.log('✅ Verificación completada');
    console.log('💡 Revisa la estructura de las tablas arriba');
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkTableStructure().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 