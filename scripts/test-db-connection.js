#!/usr/bin/env node

// Script simple para probar la conexión a la base de datos
import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔌 PROBANDO CONEXIÓN A BASE DE DATOS');
console.log('====================================');

async function testConnection() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está definida');
    }
    
    console.log('📡 URL de la base de datos:', databaseUrl.replace(/:[^:@]*@/, ':****@'));
    
    // Crear conexión
    const sql = postgres(databaseUrl, { 
      max: 1,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('🔌 Probando conexión...');
    
    // Probar conexión
    const result = await sql`SELECT 1 as test, current_database() as db_name, version() as pg_version`;
    
    console.log('✅ Conexión exitosa!');
    console.log(`📊 Base de datos: ${result[0].db_name}`);
    console.log(`📊 PostgreSQL: ${result[0].pg_version.split(' ')[0]} ${result[0].pg_version.split(' ')[1]}`);
    
    // Verificar tablas existentes
    console.log('\n📋 Verificando tablas existentes...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    if (tables.length === 0) {
      console.log('⚠️ No se encontraron tablas en la base de datos');
      console.log('💡 Ejecuta: npm run db:create-tables');
    } else {
      console.log(`✅ ${tables.length} tablas encontradas:`);
      tables.forEach(table => {
        console.log(`  📊 ${table.table_name}`);
      });
    }
    
    // Cerrar conexión
    await sql.end();
    
    console.log('\n✅ Prueba de conexión completada exitosamente');
    
  } catch (error) {
    console.error('\n❌ ERROR DE CONEXIÓN:');
    console.error('=====================');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 SUGERENCIAS:');
      console.error('1. Verificar que la base de datos esté ejecutándose');
      console.error('2. Verificar que la URL sea correcta');
      console.error('3. Verificar permisos de conexión');
    } else if (error.message.includes('Invalid URL')) {
      console.error('\n💡 SUGERENCIAS:');
      console.error('1. Verificar el formato de la URL de la base de datos');
      console.error('2. Asegurar que DATABASE_URL esté bien configurada');
    }
    
    process.exit(1);
  }
}

// Ejecutar prueba
testConnection(); 