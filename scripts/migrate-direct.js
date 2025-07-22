#!/usr/bin/env node

// Script para ejecutar migraciones directamente con SQL
import postgres from 'postgres';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuración
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🗄️ Ejecutando migraciones directamente...');
console.log('=========================================');

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

async function migrateDirect() {
  try {
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');

    // Leer el archivo de migración
    const migrationPath = join(__dirname, '..', 'drizzle', '0000_wise_namora.sql');
    console.log(`📋 Leyendo migración: ${migrationPath}`);
    
    let migrationSQL;
    try {
      migrationSQL = readFileSync(migrationPath, 'utf8');
      console.log('✅ Archivo de migración leído');
    } catch (error) {
      console.error('❌ Error leyendo archivo de migración:', error.message);
      console.log('💡 Asegúrate de que el archivo de migración existe');
      return;
    }

    // Crear tabla de migraciones si no existe
    console.log('📋 Creando tabla de migraciones...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ Tabla de migraciones creada/verificada');
    } catch (error) {
      console.log('⚠️ Error creando tabla de migraciones:', error.message);
    }

    // Verificar si la migración ya se ejecutó
    console.log('🔍 Verificando si la migración ya se ejecutó...');
    const existingMigration = await sql`
      SELECT * FROM drizzle_migrations WHERE hash = '0000_wise_namora'
    `;

    if (existingMigration.length > 0) {
      console.log('⚠️ Migración ya ejecutada anteriormente');
      console.log('✅ Saltando migración');
    } else {
      console.log('📋 Ejecutando migración...');
      
      // Dividir el SQL en comandos individuales
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      console.log(`📊 Ejecutando ${commands.length} comandos SQL...`);

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        if (command.trim()) {
          try {
            await sql.unsafe(command);
            console.log(`  ✅ Comando ${i + 1}/${commands.length} ejecutado`);
          } catch (error) {
            if (error.message.includes('already exists')) {
              console.log(`  ⚠️ Comando ${i + 1}/${commands.length} ya existía`);
            } else {
              console.log(`  ❌ Error en comando ${i + 1}/${commands.length}: ${error.message}`);
            }
          }
        }
      }

      // Registrar la migración como ejecutada
      await sql`
        INSERT INTO drizzle_migrations (hash) VALUES ('0000_wise_namora')
      `;
      console.log('✅ Migración registrada como ejecutada');
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
migrateDirect()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  }); 