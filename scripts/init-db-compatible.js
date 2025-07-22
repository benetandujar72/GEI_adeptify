#!/usr/bin/env node

// Script de inicialización compatible con la estructura actual de las tablas
import postgres from 'postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

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

async function initializeDatabaseCompatible() {
  console.log('🗄️ Inicializando base de datos con datos de prueba (compatible)...');
  console.log('==============================================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión a base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida');
    
    // Verificar estructura de tabla modules
    console.log('🔍 Verificando estructura de tabla modules...');
    const moduleColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'modules' 
      ORDER BY ordinal_position
    `;
    
    const hasDisplayName = moduleColumns.some(col => col.column_name === 'display_name');
    const hasCode = moduleColumns.some(col => col.column_name === 'code');
    
    console.log(`  📝 Columnas disponibles en modules: ${moduleColumns.map(c => c.column_name).join(', ')}`);
    console.log(`  ✅ display_name: ${hasDisplayName ? 'SÍ' : 'NO'}`);
    console.log(`  ✅ code: ${hasCode ? 'SÍ' : 'NO'}`);
    
    console.log('\n📊 Creando datos de prueba...');
    
    // 1. Crear instituto
    console.log('🏫 Creando instituto de prueba...');
    let institute;
    const [instituteResult] = await sql`
      INSERT INTO institutes (name, code, address, phone, email, website)
      VALUES (
        'Institut de Prova GEI',
        'GEI001',
        'Carrer de Prova, 123, Barcelona',
        '+34 93 123 45 67',
        'info@gei-prova.es',
        'https://gei-prova.es'
      )
      ON CONFLICT (code) DO NOTHING
      RETURNING *
    `;
    
    if (instituteResult) {
      institute = instituteResult;
      console.log(`✅ Instituto creado: ${institute.name} (${institute.code})`);
    } else {
      console.log('✅ Instituto ya existe, usando el existente');
      const [existingInstitute] = await sql`SELECT * FROM institutes WHERE code = 'GEI001'`;
      institute = existingInstitute;
    }
    
    // 2. Crear año académico
    console.log('📅 Creando año académico...');
    const [academicYear] = await sql`
      INSERT INTO academic_years (institute_id, name, start_date, end_date, is_active)
      VALUES (
        ${institute.id},
        '2024-2025',
        '2024-09-01',
        '2025-06-30',
        true
      )
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    
    if (academicYear) {
      console.log(`✅ Año académico creado: ${academicYear.name}`);
    } else {
      console.log('✅ Año académico ya existe, usando el existente');
      const [existingYear] = await sql`SELECT * FROM academic_years WHERE name = '2024-2025' AND institute_id = ${institute.id}`;
      academicYear = existingYear;
    }
    
    // 3. Crear módulos (compatible con estructura actual)
    console.log('📚 Creando módulos...');
    let modulesData;
    
    if (hasDisplayName && !hasCode) {
      // Estructura nueva: name, display_name, description
      modulesData = [
        { name: 'Gestió d\'Avaluacions', display_name: 'Gestió d\'Avaluacions', description: 'Mòdul per gestionar avaluacions i notes' },
        { name: 'Control d\'Assistència', display_name: 'Control d\'Assistència', description: 'Mòdul per controlar l\'assistència dels alumnes' },
        { name: 'Gestió de Guàrdies', display_name: 'Gestió de Guàrdies', description: 'Mòdul per gestionar les guàrdies dels professors' },
        { name: 'Enquestes', display_name: 'Enquestes', description: 'Mòdul per crear i gestionar enquestes' },
        { name: 'Recursos', display_name: 'Recursos', description: 'Mòdul per gestionar recursos i reserves' },
        { name: 'Analítiques', display_name: 'Analítiques', description: 'Mòdul per visualitzar analítiques i informes' }
      ];
    } else if (hasCode && !hasDisplayName) {
      // Estructura antigua: name, code, description
      modulesData = [
        { name: 'Gestió d\'Avaluacions', code: 'EVAL', description: 'Mòdul per gestionar avaluacions i notes' },
        { name: 'Control d\'Assistència', code: 'ATT', description: 'Mòdul per controlar l\'assistència dels alumnes' },
        { name: 'Gestió de Guàrdies', code: 'GUARD', description: 'Mòdul per gestionar les guàrdies dels professors' },
        { name: 'Enquestes', code: 'SURV', description: 'Mòdul per crear i gestionar enquestes' },
        { name: 'Recursos', code: 'RES', description: 'Mòdul per gestionar recursos i reserves' },
        { name: 'Analítiques', code: 'ANAL', description: 'Mòdul per visualitzar analítiques i informes' }
      ];
    } else {
      // Solo name y description
      modulesData = [
        { name: 'Gestió d\'Avaluacions', description: 'Mòdul per gestionar avaluacions i notes' },
        { name: 'Control d\'Assistència', description: 'Mòdul per controlar l\'assistència dels alumnes' },
        { name: 'Gestió de Guàrdies', description: 'Mòdul per gestionar les guàrdies dels professors' },
        { name: 'Enquestes', description: 'Mòdul per crear i gestionar enquestes' },
        { name: 'Recursos', description: 'Mòdul per gestionar recursos i reserves' },
        { name: 'Analítiques', description: 'Mòdul per visualitzar analítiques i informes' }
      ];
    }
    
    // Insertar módulos uno por uno para evitar problemas de estructura
    const createdModules = [];
    for (const moduleData of modulesData) {
      try {
        const [module] = await sql`
          INSERT INTO modules ${sql(moduleData)}
          ON CONFLICT (name) DO NOTHING
          RETURNING *
        `;
        if (module) {
          createdModules.push(module);
          console.log(`  ✅ Módulo creado: ${module.name}`);
        } else {
          console.log(`  ⚠️ Módulo ya existe: ${moduleData.name}`);
          // Obtener el módulo existente
          const [existingModule] = await sql`SELECT * FROM modules WHERE name = ${moduleData.name}`;
          if (existingModule) {
            createdModules.push(existingModule);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error creando módulo ${moduleData.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${createdModules.length} módulos procesados`);
    
    // 4. Asignar módulos al instituto
    console.log('🔗 Asignando módulos al instituto...');
    for (const module of createdModules) {
      try {
        await sql`
          INSERT INTO institute_modules (institute_id, module_id, is_active, settings)
          VALUES (${institute.id}, ${module.id}, true, '{}')
          ON CONFLICT (institute_id, module_id) DO NOTHING
        `;
      } catch (error) {
        console.log(`  ⚠️ Error asignando módulo ${module.name}: ${error.message}`);
      }
    }
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
    
    const createdUsers = [];
    for (const userData of usersData) {
      try {
        const [user] = await sql`
          INSERT INTO users ${sql(userData)}
          ON CONFLICT (email) DO NOTHING
          RETURNING *
        `;
        if (user) {
          createdUsers.push(user);
          console.log(`  ✅ Usuario creado: ${user.display_name} (${user.email})`);
        } else {
          console.log(`  ⚠️ Usuario ya existe: ${userData.email}`);
        }
      } catch (error) {
        console.log(`  ❌ Error creando usuario ${userData.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${createdUsers.length} usuarios procesados`);
    
    // 6. Crear clases de prueba
    console.log('📚 Creando clases de prueba...');
    const classesData = [
      {
        institute_id: institute.id,
        academic_year_id: academicYear.id,
        name: '1r ESO A',
        description: 'Primer curs d\'ESO, grup A',
        max_students: 30,
        is_active: true
      },
      {
        institute_id: institute.id,
        academic_year_id: academicYear.id,
        name: '2n ESO B',
        description: 'Segon curs d\'ESO, grup B',
        max_students: 28,
        is_active: true
      }
    ];
    
    for (const classData of classesData) {
      try {
        await sql`
          INSERT INTO classes ${sql(classData)}
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✅ Clase creada: ${classData.name}`);
      } catch (error) {
        console.log(`  ⚠️ Error creando clase ${classData.name}: ${error.message}`);
      }
    }
    
    // 7. Crear competencias de prueba
    console.log('🎯 Creando competencias de prueba...');
    const competenciesData = [
      {
        institute_id: institute.id,
        academic_year_id: academicYear.id,
        code: 'CT_CC_1',
        abbreviation: 'CC1',
        subject: 'Matemàtiques',
        description: 'Competència matemàtica i competències bàsiques en ciència i tecnologia',
        type: 'CT_CC'
      },
      {
        institute_id: institute.id,
        academic_year_id: academicYear.id,
        code: 'CT_CD_1',
        abbreviation: 'CD1',
        subject: 'Llengua Catalana',
        description: 'Competència en comunicació lingüística',
        type: 'CT_CD'
      }
    ];
    
    for (const compData of competenciesData) {
      try {
        await sql`
          INSERT INTO competencies ${sql(compData)}
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✅ Competencia creada: ${compData.code}`);
      } catch (error) {
        console.log(`  ⚠️ Error creando competencia ${compData.code}: ${error.message}`);
      }
    }
    
    // 8. Crear recursos de prueba
    console.log('📦 Creando recursos de prueba...');
    const resourcesData = [
      {
        institute_id: institute.id,
        name: 'Aula d\'Informàtica 1',
        description: 'Aula amb 25 ordinadors per a classes d\'informàtica',
        type: 'classroom',
        capacity: 25,
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Projector Sala d\'Actes',
        description: 'Projector per a presentacions i actes',
        type: 'equipment',
        capacity: 1,
        is_active: true
      }
    ];
    
    for (const resData of resourcesData) {
      try {
        await sql`
          INSERT INTO resources ${sql(resData)}
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✅ Recurso creado: ${resData.name}`);
      } catch (error) {
        console.log(`  ⚠️ Error creando recurso ${resData.name}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Inicialización completada exitosamente!');
    console.log('📊 Resumen:');
    console.log(`  🏫 Instituto: ${institute.name}`);
    console.log(`  📅 Año académico: ${academicYear.name}`);
    console.log(`  📚 Módulos: ${createdModules.length}`);
    console.log(`  👥 Usuarios: ${createdUsers.length}`);
    console.log('  📚 Clases: 2');
    console.log('  🎯 Competencias: 2');
    console.log('  📦 Recursos: 2');
    
    console.log('\n🔑 Credenciales de acceso:');
    console.log('========================');
    console.log('👑 Super Admin: superadmin@gei.es / password123');
    console.log('👨‍💼 Admin: admin@gei.es / password123');
    console.log('👨‍🏫 Professor: professor@gei.es / password123');
    console.log('👨‍🎓 Alumne: alumne@gei.es / password123');
    
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

initializeDatabaseCompatible().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 