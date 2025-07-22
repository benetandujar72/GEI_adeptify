#!/usr/bin/env node

// Script de inicialización simple sin dependencias del schema
import postgres from 'postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

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

async function initializeDatabaseSimple() {
  try {
    console.log('🔍 Verificando conexión a base de datos...');
    
    // Verificar conexión
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida');

    // Verificar si ya existen datos
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;
    if (existingUsers[0].count > 0) {
      console.log('⚠️ Ya existen datos en la base de datos');
      console.log('💡 Para reinicializar, elimina los datos existentes primero');
      return;
    }

    console.log('📊 Creando datos de prueba...');

    // 1. Crear instituto de prueba
    console.log('🏫 Creando instituto de prueba...');
    const [institute] = await sql`
      INSERT INTO institutes (name, code, address, phone, email, website, settings)
      VALUES (
        'Institut de Prova GEI',
        'GEI001',
        'Carrer de Prova, 123, Barcelona',
        '+34 93 123 45 67',
        'info@gei-prova.es',
        'https://gei-prova.es',
        '{"theme": "default", "language": "ca", "timezone": "Europe/Madrid"}'
      )
      RETURNING *
    `;

    console.log(`✅ Instituto creado: ${institute.name} (${institute.code})`);

    // 2. Crear año académico
    console.log('📅 Creando año académico...');
    const [academicYear] = await sql`
      INSERT INTO academic_years (institute_id, name, start_date, end_date, status, settings)
      VALUES (
        ${institute.id},
        '2024-2025',
        '2024-09-01',
        '2025-06-30',
        'active',
        '{"evaluationPeriods": [{"name": "Primer Trimestre", "start": "2024-09-01", "end": "2024-12-20"}, {"name": "Segon Trimestre", "start": "2025-01-08", "end": "2025-03-28"}, {"name": "Tercer Trimestre", "start": "2025-04-07", "end": "2025-06-20"}]}'
      )
      RETURNING *
    `;

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

    const createdModules = await sql`
      INSERT INTO modules (name, code, description)
      SELECT * FROM json_populate_recordset(null::modules, ${JSON.stringify(modulesData)})
      RETURNING *
    `;
    console.log(`✅ ${createdModules.length} módulos creados`);

    // 4. Asignar módulos al instituto
    console.log('🔗 Asignando módulos al instituto...');
    const instituteModulesData = createdModules.map(module => ({
      institute_id: institute.id,
      module_id: module.id,
      is_active: true,
      settings: {}
    }));

    await sql`
      INSERT INTO institute_modules (institute_id, module_id, is_active, settings)
      SELECT * FROM json_populate_recordset(null::institute_modules, ${JSON.stringify(instituteModulesData)})
    `;
    console.log('✅ Módulos asignados al instituto');

    // 5. Crear usuarios de prueba
    console.log('👥 Creando usuarios de prueba...');
    
    // Hash de contraseñas
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const usersData = [
      {
        institute_id: institute.id,
        email: 'superadmin@gei.es',
        display_name: 'Super Administrador',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin',
        password_hash: passwordHash,
        preferences: {
          theme: 'dark',
          language: 'ca',
          notifications: true
        }
      },
      {
        institute_id: institute.id,
        email: 'admin@gei.es',
        display_name: 'Administrador Institut',
        first_name: 'Admin',
        last_name: 'Institut',
        role: 'institute_admin',
        password_hash: passwordHash,
        preferences: {
          theme: 'light',
          language: 'ca',
          notifications: true
        }
      },
      {
        institute_id: institute.id,
        email: 'professor@gei.es',
        display_name: 'Professor Prova',
        first_name: 'Professor',
        last_name: 'Prova',
        role: 'teacher',
        password_hash: passwordHash,
        preferences: {
          theme: 'system',
          language: 'ca',
          notifications: true
        }
      },
      {
        institute_id: institute.id,
        email: 'alumne@gei.es',
        display_name: 'Alumne Prova',
        first_name: 'Alumne',
        last_name: 'Prova',
        role: 'student',
        password_hash: passwordHash,
        preferences: {
          theme: 'light',
          language: 'ca',
          notifications: false
        }
      }
    ];

    const createdUsers = await sql`
      INSERT INTO users (institute_id, email, display_name, first_name, last_name, role, password_hash, preferences)
      SELECT * FROM json_populate_recordset(null::users, ${JSON.stringify(usersData)})
      RETURNING *
    `;
    console.log(`✅ ${createdUsers.length} usuarios creados`);

    // 6. Crear datos de prueba adicionales
    console.log('📊 Creando datos adicionales de prueba...');

    // Crear algunas clases
    const classesData = [
      {
        institute_id: institute.id,
        academic_year_id: academicYear.id,
        name: '1r ESO A',
        code: '1ESOA',
        description: 'Primer curs d\'ESO, grup A',
        max_students: 30,
        is_active: true
      },
      {
        institute_id: institute.id,
        academic_year_id: academicYear.id,
        name: '2n ESO B',
        code: '2ESOB',
        description: 'Segon curs d\'ESO, grup B',
        max_students: 28,
        is_active: true
      }
    ];

    const createdClasses = await sql`
      INSERT INTO classes (institute_id, academic_year_id, name, code, description, max_students, is_active)
      SELECT * FROM json_populate_recordset(null::classes, ${JSON.stringify(classesData)})
      RETURNING *
    `;
    console.log(`✅ ${createdClasses.length} clases creadas`);

    // Crear algunas competencias
    const competenciesData = [
      {
        institute_id: institute.id,
        name: 'Competència Digital',
        description: 'Ús segur i crític de les tecnologies de la informació',
        category: 'TIC',
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Competència Lingüística',
        description: 'Comunicació efectiva en català i altres llengües',
        category: 'Llengües',
        is_active: true
      }
    ];

    const createdCompetencies = await sql`
      INSERT INTO competencies (institute_id, name, description, category, is_active)
      SELECT * FROM json_populate_recordset(null::competencies, ${JSON.stringify(competenciesData)})
      RETURNING *
    `;
    console.log(`✅ ${createdCompetencies.length} competencias creadas`);

    // Crear algunos recursos
    const resourcesData = [
      {
        institute_id: institute.id,
        name: 'Aula d\'Informàtica 1',
        type: 'classroom',
        description: 'Aula amb 25 ordinadors per classes d\'informàtica',
        capacity: 25,
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Gimnas',
        type: 'sports',
        description: 'Gimnas per activitats esportives',
        capacity: 50,
        is_active: true
      }
    ];

    const createdResources = await sql`
      INSERT INTO resources (institute_id, name, type, description, capacity, is_active)
      SELECT * FROM json_populate_recordset(null::resources, ${JSON.stringify(resourcesData)})
      RETURNING *
    `;
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
initializeDatabaseSimple()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  }); 