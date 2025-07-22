#!/usr/bin/env node

// Script para limpiar completamente la base de datos
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

async function cleanDatabase() {
  console.log('🧹 LIMPIANDO BASE DE DATOS COMPLETAMENTE');
  console.log('========================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');
    
    // Lista de tablas en orden de eliminación (respetando foreign keys)
    const tablesToDrop = [
      'audit_logs',
      'notifications',
      'sessions',
      'institute_modules',
      'modules',
      'academic_years',
      'users',
      'institutes'
    ];
    
    console.log('🗑️ Eliminando datos de todas las tablas...');
    
    for (const tableName of tablesToDrop) {
      try {
        const result = await sql`DELETE FROM ${sql(tableName)}`;
        console.log(`  ✅ ${tableName}: ${result.count} registros eliminados`);
      } catch (error) {
        console.log(`  ⚠️ ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Base de datos limpiada exitosamente!');
    console.log('💡 Ahora puedes ejecutar: npm run db:init-simple');
    
  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

cleanDatabase().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 