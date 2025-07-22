#!/usr/bin/env node

// Script simple para verificar la base de datos
import postgres from 'postgres';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

console.log('🔍 Verificación simple de base de datos...');
console.log('==========================================');

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

async function checkDatabaseSimple() {
  try {
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');

    // Verificar tablas principales
    console.log('\n📋 Verificando tablas principales...');
    
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

    // Verificar datos específicos
    console.log('\n👥 Verificando usuarios...');
    try {
      const usersData = await sql`SELECT email, role FROM users LIMIT 5`;
      
      if (usersData.length === 0) {
        console.log('  ⚠️ No hay usuarios en la base de datos');
        console.log('  💡 Ejecuta: npm run db:init');
      } else {
        console.log(`  ✅ ${usersData.length} usuarios encontrados:`);
        usersData.forEach(user => {
          console.log(`    - ${user.email} (${user.role})`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error verificando usuarios: ${error.message}`);
    }

    // Verificar institutos
    console.log('\n🏫 Verificando institutos...');
    try {
      const institutesData = await sql`SELECT name, code FROM institutes LIMIT 5`;
      
      if (institutesData.length === 0) {
        console.log('  ⚠️ No hay institutos en la base de datos');
      } else {
        console.log(`  ✅ ${institutesData.length} institutos encontrados:`);
        institutesData.forEach(institute => {
          console.log(`    - ${institute.name} (${institute.code})`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error verificando institutos: ${error.message}`);
    }

    console.log('\n🎯 Estado de la base de datos:');
    try {
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      const instituteCount = await sql`SELECT COUNT(*) as count FROM institutes`;
      
      if (userCount[0].count > 0 && instituteCount[0].count > 0) {
        console.log('  ✅ Base de datos configurada correctamente');
        console.log('  🚀 La aplicación debería funcionar correctamente');
      } else {
        console.log('  ⚠️ Base de datos incompleta');
        console.log('  💡 Ejecuta: npm run db:init');
      }
    } catch (error) {
      console.log('  ❌ Error verificando estado: ' + error.message);
    }

  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Ejecutar verificación
checkDatabaseSimple()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la verificación:', error);
    process.exit(1);
  }); 