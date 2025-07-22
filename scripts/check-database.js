#!/usr/bin/env node

// Script para verificar el estado de la base de datos
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { 
  institutes, 
  users, 
  academicYears, 
  modules,
  instituteModules,
  classes,
  competencies,
  resources
} from '../shared/schema.js';

// Cargar variables de entorno
config();

console.log('🔍 Verificando estado de la base de datos...');
console.log('============================================');

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

async function checkDatabase() {
  try {
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');

    // Verificar tablas principales
    console.log('\n📋 Verificando tablas principales...');
    
    const tables = [
      { name: 'institutes', query: () => db.select().from(institutes) },
      { name: 'users', query: () => db.select().from(users) },
      { name: 'academic_years', query: () => db.select().from(academicYears) },
      { name: 'modules', query: () => db.select().from(modules) },
      { name: 'institute_modules', query: () => db.select().from(instituteModules) },
      { name: 'classes', query: () => db.select().from(classes) },
      { name: 'competencies', query: () => db.select().from(competencies) },
      { name: 'resources', query: () => db.select().from(resources) }
    ];

    for (const table of tables) {
      try {
        const result = await table.query();
        console.log(`  ✅ ${table.name}: ${result.length} registros`);
      } catch (error) {
        console.log(`  ❌ ${table.name}: Error - ${error.message}`);
      }
    }

    // Verificar datos específicos
    console.log('\n👥 Verificando usuarios...');
    const usersData = await db.select().from(users);
    
    if (usersData.length === 0) {
      console.log('  ⚠️ No hay usuarios en la base de datos');
      console.log('  💡 Ejecuta: npm run db:init');
    } else {
      console.log(`  ✅ ${usersData.length} usuarios encontrados:`);
      usersData.forEach(user => {
        console.log(`    - ${user.email} (${user.role})`);
      });
    }

    // Verificar institutos
    console.log('\n🏫 Verificando institutos...');
    const institutesData = await db.select().from(institutes);
    
    if (institutesData.length === 0) {
      console.log('  ⚠️ No hay institutos en la base de datos');
    } else {
      console.log(`  ✅ ${institutesData.length} institutos encontrados:`);
      institutesData.forEach(institute => {
        console.log(`    - ${institute.name} (${institute.code})`);
      });
    }

    // Verificar años académicos
    console.log('\n📅 Verificando años académicos...');
    const academicYearsData = await db.select().from(academicYears);
    
    if (academicYearsData.length === 0) {
      console.log('  ⚠️ No hay años académicos en la base de datos');
    } else {
      console.log(`  ✅ ${academicYearsData.length} años académicos encontrados:`);
      academicYearsData.forEach(year => {
        console.log(`    - ${year.name} (${year.status})`);
      });
    }

    // Verificar módulos
    console.log('\n📚 Verificando módulos...');
    const modulesData = await db.select().from(modules);
    
    if (modulesData.length === 0) {
      console.log('  ⚠️ No hay módulos en la base de datos');
    } else {
      console.log(`  ✅ ${modulesData.length} módulos encontrados:`);
      modulesData.forEach(module => {
        console.log(`    - ${module.name} (${module.code})`);
      });
    }

    // Verificar asignaciones de módulos
    console.log('\n🔗 Verificando asignaciones de módulos...');
    const instituteModulesData = await db.select().from(instituteModules);
    
    if (instituteModulesData.length === 0) {
      console.log('  ⚠️ No hay asignaciones de módulos');
    } else {
      console.log(`  ✅ ${instituteModulesData.length} asignaciones encontradas`);
    }

    console.log('\n🎯 Estado de la base de datos:');
    if (usersData.length > 0 && institutesData.length > 0) {
      console.log('  ✅ Base de datos configurada correctamente');
      console.log('  🚀 La aplicación debería funcionar correctamente');
    } else {
      console.log('  ⚠️ Base de datos incompleta');
      console.log('  💡 Ejecuta: npm run db:init');
    }

  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Ejecutar verificación
checkDatabase()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la verificación:', error);
    process.exit(1);
  }); 