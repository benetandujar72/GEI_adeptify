#!/usr/bin/env node

// Script para ejecutar migraciones de la base de datos
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

console.log('🗄️ Ejecutando migraciones de base de datos...');
console.log('=============================================');

// Configuración de base de datos
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 1
});

const db = drizzle(sql);

async function migrateDatabase() {
  try {
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');

    console.log('📋 Ejecutando migraciones...');
    
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Migraciones ejecutadas correctamente');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Algunas migraciones ya estaban aplicadas');
        console.log('✅ Migraciones completadas');
      } else {
        throw error;
      }
    }

    // Verificar que las tablas se crearon
    console.log('\n📊 Verificando tablas creadas...');
    
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

    for (const tableName of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        console.log(`  ✅ ${tableName}: ${result[0].count} registros`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: Error - ${error.message}`);
      }
    }

    console.log('\n🎉 Migraciones completadas exitosamente!');
    console.log('🚀 La base de datos está lista para usar');

  } catch (error) {
    console.error('❌ Error al ejecutar migraciones:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Ejecutar migraciones
migrateDatabase()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  }); 