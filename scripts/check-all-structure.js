#!/usr/bin/env node

// Script para verificar la estructura completa de todas las tablas
import postgres from 'postgres';

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

async function checkAllStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA COMPLETA DE TODAS LAS TABLAS');
  console.log('======================================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');
    
    // Obtener todas las tablas del esquema público
    console.log('\n📋 OBTENIENDO LISTA DE TABLAS...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log(`✅ Encontradas ${tables.length} tablas`);
    
    console.log('\n📋 ESTRUCTURA DETALLADA DE CADA TABLA:');
    console.log('========================================');
    
    for (const tableRow of tables) {
      const tableName = tableRow.table_name;
      
      try {
        console.log(`\n🏗️ TABLA: ${tableName.toUpperCase()}`);
        console.log('─'.repeat(60));
        
        // Obtener información detallada de columnas
        const columns = await sql`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        if (columns.length === 0) {
          console.log(`  ❌ No se encontraron columnas para ${tableName}`);
        } else {
          console.log(`  📝 Columnas (${columns.length}):`);
          columns.forEach((col, index) => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            let dataType = col.data_type;
            
            if (col.character_maximum_length) {
              dataType += `(${col.character_maximum_length})`;
            } else if (col.numeric_precision) {
              dataType += `(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})`;
            }
            
            console.log(`    ${index + 1}. ${col.column_name}: ${dataType} ${nullable}${defaultVal}`);
          });
        }
        
        // Contar registros
        try {
          const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
          console.log(`  📊 Registros: ${countResult[0].count}`);
        } catch (error) {
          console.log(`  📊 Registros: Error - ${error.message}`);
        }
        
        // Mostrar algunos registros de ejemplo (máximo 3)
        try {
          const sampleData = await sql`SELECT * FROM ${sql(tableName)} LIMIT 3`;
          if (sampleData.length > 0) {
            console.log(`  📄 Muestra de datos (${sampleData.length} registros):`);
            sampleData.forEach((row, index) => {
              console.log(`    Registro ${index + 1}:`, JSON.stringify(row, null, 2));
            });
          } else {
            console.log(`  📄 Tabla vacía`);
          }
        } catch (error) {
          console.log(`  📄 Error obteniendo muestra: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error verificando ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 RESUMEN:');
    console.log('===========');
    console.log(`✅ Verificación completada para ${tables.length} tablas`);
    console.log('💡 Revisa la estructura detallada arriba');
    console.log('🔧 Usa esta información para crear un script de inicialización compatible');
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkAllStructure().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 