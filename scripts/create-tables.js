#!/usr/bin/env node

// Script para crear las tablas de la base de datos
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🗄️ CREANDO TABLAS DE BASE DE DATOS');
console.log('==================================');

async function createTables() {
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

    console.log('🔄 Ejecutando migraciones...');
    
    // Ejecutar migraciones
    await migrate(db, { migrationsFolder: join(__dirname, '..', 'drizzle') });

    console.log('✅ Migraciones ejecutadas correctamente');
    
    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('\n📋 TABLAS CREADAS:');
    console.log('==================');
    
    if (tables.length === 0) {
      console.log('⚠️ No se encontraron tablas en la base de datos');
    } else {
      tables.forEach(table => {
        console.log(`✅ ${table.table_name}`);
      });
    }

    console.log(`\n🎉 Total de tablas: ${tables.length}`);
    
    // Cerrar conexión
    await sql.end();
    
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('\n❌ ERROR AL CREAR TABLAS:');
    console.error('==========================');
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
createTables(); 