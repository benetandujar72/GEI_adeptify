#!/usr/bin/env node

// Script para inicializar la base de datos con datos de prueba
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { 
  institutes, 
  users, 
  academicYears, 
  modules,
  instituteModules,
  sessions,
  notifications,
  auditLogs,
  competencies,
  criteria,
  students,
  teachers,
  evaluations,
  grades,
  classes,
  attendance,
  schedules,
  absences,
  guardDuties,
  surveys,
  surveyQuestions,
  surveyResponses,
  resources,
  reservations,
  achievements
} from '../dist/shared/schema.js';

// Cargar variables de entorno
config();

console.log('🗄️ Inicializando base de datos con datos de prueba...');
console.log('==================================================');

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

async function initializeDatabase() {
  try {
    console.log('🔍 Verificando conexión a base de datos...');
    
    // Verificar conexión
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida');

    // Ejecutar migraciones
    console.log('📋 Ejecutando migraciones...');
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Migraciones ejecutadas');
    } catch (error) {
      console.log('⚠️ No se encontraron migraciones, continuando...');
    }

    // Verificar si ya existen datos
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('⚠️ Ya existen datos en la base de datos');
      console.log('💡 Para reinicializar, elimina los datos existentes primero');
      return;
    }

    console.log('📊 Creando datos de prueba...');

    // 1. Crear instituto de prueba
    console.log('🏫 Creando instituto de prueba...');
    const [institute] = await db.insert(institutes).values({
      name: 'Institut de Prova GEI',
      code: 'GEI001',
      address: 'Carrer de Prova, 123, Barcelona',
      phone: '+34 93 123 45 67',
      email: 'info@gei-prova.es',
      website: 'https://gei-prova.es',
      settings: {
        theme: 'default',
        language: 'ca',
        timezone: 'Europe/Madrid'
      }
    }).returning();

    console.log(`✅ Instituto creado: ${institute.name} (${institute.code})`);

    // 2. Crear año académico
    console.log('📅 Creando año académico...');
    const [academicYear] = await db.insert(academicYears).values({
      instituteId: institute.id,
      name: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      status: 'active',
      settings: {
        evaluationPeriods: [
          { name: 'Primer Trimestre', start: '2024-09-01', end: '2024-12-20' },
          { name: 'Segon Trimestre', start: '2025-01-08', end: '2025-03-28' },
          { name: 'Tercer Trimestre', start: '2025-04-07', end: '2025-06-20' }
        ]
      }
    }).returning();

    console.log(`✅ Año académico creado: ${academicYear.name}`);

    // 3. Crear módulos
    console.log('📚 Creando módulos...');
    const modulesData = [
      { name: 'Gestió d\'Avaluacions', code: 'EVAL', description: 'Mòdul per gestionar avaluacions i notes' },
      { name: 'Control d\'Assistència', code: 'ATT', description: 'Mòdul per controlar l\'assistència dels alumnes' },
      { name: 'Gestió de Guàrdies', code: 'GUARD', description: 'Mòdul per gestionar les guàrdies dels professors' },
      { name: 'Enquestes', code: 'SURV', description: 'Mòdul per crear i gestionar enquestes' },
      { name: 'Recursos', code: 'RES', description: 'Mòdul per gestionar recursos i reserves' },
      { name: 'Analítiques', code: 'ANAL', description: 'Mòdul per visualitzar analítiques i informes' }
    ];

    const createdModules = await db.insert(modules).values(modulesData).returning();
    console.log(`✅ ${createdModules.length} módulos creados`);

    // 4. Asignar módulos al instituto
    console.log('🔗 Asignando módulos al instituto...');
    const instituteModulesData = createdModules.map(module => ({
      instituteId: institute.id,
      moduleId: module.id,
      isActive: true,
      settings: {}
    }));

    await db.insert(instituteModules).values(instituteModulesData);
    console.log('✅ Módulos asignados al instituto');

    // 5. Crear usuarios de prueba
    console.log('👥 Creando usuarios de prueba...');
    
    // Hash de contraseñas
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const usersData = [
      {
        instituteId: institute.id,
        email: 'superadmin@gei.es',
        displayName: 'Super Administrador',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        passwordHash,
        preferences: {
          theme: 'dark',
          language: 'ca',
          notifications: true
        }
      },
      {
        instituteId: institute.id,
        email: 'admin@gei.es',
        displayName: 'Administrador Institut',
        firstName: 'Admin',
        lastName: 'Institut',
        role: 'institute_admin',
        passwordHash,
        preferences: {
          theme: 'light',
          language: 'ca',
          notifications: true
        }
      },
      {
        instituteId: institute.id,
        email: 'professor@gei.es',
        displayName: 'Professor Prova',
        firstName: 'Professor',
        lastName: 'Prova',
        role: 'teacher',
        passwordHash,
        preferences: {
          theme: 'system',
          language: 'ca',
          notifications: true
        }
      },
      {
        instituteId: institute.id,
        email: 'alumne@gei.es',
        displayName: 'Alumne Prova',
        firstName: 'Alumne',
        lastName: 'Prova',
        role: 'student',
        passwordHash,
        preferences: {
          theme: 'light',
          language: 'ca',
          notifications: false
        }
      }
    ];

    const createdUsers = await db.insert(users).values(usersData).returning();
    console.log(`✅ ${createdUsers.length} usuarios creados`);

    // 6. Crear datos de prueba adicionales
    console.log('📊 Creando datos adicionales de prueba...');

    // Crear algunas clases
    const classesData = [
      {
        instituteId: institute.id,
        academicYearId: academicYear.id,
        name: '1r ESO A',
        code: '1ESOA',
        description: 'Primer curs d\'ESO, grup A',
        maxStudents: 30,
        isActive: true
      },
      {
        instituteId: institute.id,
        academicYearId: academicYear.id,
        name: '2n ESO B',
        code: '2ESOB',
        description: 'Segon curs d\'ESO, grup B',
        maxStudents: 28,
        isActive: true
      }
    ];

    const createdClasses = await db.insert(classes).values(classesData).returning();
    console.log(`✅ ${createdClasses.length} clases creadas`);

    // Crear algunas competencias
    const competenciesData = [
      {
        instituteId: institute.id,
        name: 'Competència Digital',
        description: 'Ús segur i crític de les tecnologies de la informació',
        category: 'TIC',
        isActive: true
      },
      {
        instituteId: institute.id,
        name: 'Competència Lingüística',
        description: 'Comunicació efectiva en català i altres llengües',
        category: 'Llengües',
        isActive: true
      }
    ];

    const createdCompetencies = await db.insert(competencies).values(competenciesData).returning();
    console.log(`✅ ${createdCompetencies.length} competencias creadas`);

    // Crear algunos recursos
    const resourcesData = [
      {
        instituteId: institute.id,
        name: 'Aula d\'Informàtica 1',
        type: 'classroom',
        description: 'Aula amb 25 ordinadors per classes d\'informàtica',
        capacity: 25,
        isActive: true
      },
      {
        instituteId: institute.id,
        name: 'Gimnas',
        type: 'sports',
        description: 'Gimnas per activitats esportives',
        capacity: 50,
        isActive: true
      }
    ];

    const createdResources = await db.insert(resources).values(resourcesData).returning();
    console.log(`✅ ${createdResources.length} recursos creados`);

    console.log('\n🎉 Base de datos inicializada correctamente!');
    console.log('==================================================');
    console.log('📋 Resumen de datos creados:');
    console.log(`  🏫 Instituto: ${institute.name}`);
    console.log(`  📅 Año académico: ${academicYear.name}`);
    console.log(`  📚 Módulos: ${createdModules.length}`);
    console.log(`  👥 Usuarios: ${createdUsers.length}`);
    console.log(`  🏫 Clases: ${createdClasses.length}`);
    console.log(`  🎯 Competencias: ${createdCompetencies.length}`);
    console.log(`  📦 Recursos: ${createdResources.length}`);

    console.log('\n🔑 Credenciales de acceso:');
    console.log('  👑 Super Admin: superadmin@gei.es / password123');
    console.log('  👨‍💼 Admin: admin@gei.es / password123');
    console.log('  👨‍🏫 Professor: professor@gei.es / password123');
    console.log('  👨‍🎓 Alumne: alumne@gei.es / password123');

  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Ejecutar inicialización
initializeDatabase()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  }); 