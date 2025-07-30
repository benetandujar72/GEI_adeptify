#!/usr/bin/env node

// Script para inicializar la base de datos con datos básicos
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🚀 INICIALIZANDO BASE DE DATOS CON DATOS BÁSICOS');
console.log('==============================================');

async function initDatabase() {
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

    // Verificar que las tablas existan
    console.log('🔍 Verificando estructura de la base de datos...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      throw new Error('No se encontraron tablas. Ejecuta primero: npm run db:create-tables');
    }

    console.log(`✅ ${tables.length} tablas encontradas`);

    // Datos básicos para inicializar
    const initData = {
      institutes: [
        {
          name: 'Instituto Demo',
          code: 'DEMO001',
          address: 'Calle Demo 123, Ciudad Demo',
          phone: '+34 123 456 789',
          email: 'info@institutodemo.es',
          website: 'https://institutodemo.es',
          is_active: true
        }
      ],
      modules: [
        {
          name: 'Gestión de Usuarios',
          code: 'USERS',
          description: 'Módulo para gestión de usuarios y roles',
          status: 'active'
        },
        {
          name: 'Gestión Académica',
          code: 'ACADEMIC',
          description: 'Módulo para gestión académica y evaluaciones',
          status: 'active'
        },
        {
          name: 'Asistencia',
          code: 'ATTENDANCE',
          description: 'Módulo para control de asistencia',
          status: 'active'
        },
        {
          name: 'Guardias',
          code: 'GUARD_DUTY',
          description: 'Módulo para gestión de guardias',
          status: 'active'
        },
        {
          name: 'Recursos',
          code: 'RESOURCES',
          description: 'Módulo para gestión de recursos',
          status: 'active'
        },
        {
          name: 'Analíticas',
          code: 'ANALYTICS',
          description: 'Módulo para análisis y reportes',
          status: 'active'
        }
      ],
      competencies: [
        {
          name: 'Comunicación Lingüística',
          description: 'Capacidad de comunicarse de forma efectiva',
          category: 'Lengua'
        },
        {
          name: 'Competencia Matemática',
          description: 'Capacidad de aplicar razonamientos matemáticos',
          category: 'Matemáticas'
        },
        {
          name: 'Competencia Digital',
          description: 'Uso seguro y crítico de las tecnologías',
          category: 'Tecnología'
        },
        {
          name: 'Aprender a Aprender',
          description: 'Desarrollo de estrategias de aprendizaje',
          category: 'Metacognición'
        },
        {
          name: 'Competencias Sociales',
          description: 'Habilidades para la convivencia y cooperación',
          category: 'Social'
        },
        {
          name: 'Sentido de Iniciativa',
          description: 'Capacidad de emprender y crear',
          category: 'Emprendimiento'
        },
        {
          name: 'Conciencia y Expresiones Culturales',
          description: 'Apreciación y expresión artística',
          category: 'Cultura'
        }
      ]
    };

    console.log('\n📝 INSERTANDO DATOS BÁSICOS');
    console.log('============================');

    // Insertar instituto demo
    console.log('🏫 Insertando instituto demo...');
    const instituteResult = await sql`
      INSERT INTO institutes (name, code, address, phone, email, website, is_active)
      VALUES (${initData.institutes[0].name}, ${initData.institutes[0].code}, 
              ${initData.institutes[0].address}, ${initData.institutes[0].phone}, 
              ${initData.institutes[0].email}, ${initData.institutes[0].website}, 
              ${initData.institutes[0].is_active})
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `;

    let instituteId;
    if (instituteResult.length > 0) {
      instituteId = instituteResult[0].id;
      console.log(`✅ Instituto creado con ID: ${instituteId}`);
    } else {
      // Obtener el ID del instituto existente
      const existingInstitute = await sql`
        SELECT id FROM institutes WHERE code = ${initData.institutes[0].code}
      `;
      instituteId = existingInstitute[0].id;
      console.log(`✅ Instituto ya existía con ID: ${instituteId}`);
    }

    // Insertar módulos
    console.log('📦 Insertando módulos...');
    for (const module of initData.modules) {
      const moduleResult = await sql`
        INSERT INTO modules (name, code, description, status)
        VALUES (${module.name}, ${module.code}, ${module.description}, ${module.status})
        ON CONFLICT (code) DO NOTHING
        RETURNING id;
      `;
      
      if (moduleResult.length > 0) {
        console.log(`  ✅ Módulo ${module.name} creado`);
        
        // Asociar módulo al instituto
        await sql`
          INSERT INTO institute_modules (institute_id, module_id, is_active)
          VALUES (${instituteId}, ${moduleResult[0].id}, true)
          ON CONFLICT (institute_id, module_id) DO NOTHING;
        `;
      } else {
        console.log(`  ⚠️ Módulo ${module.name} ya existía`);
      }
    }

    // Insertar competencias
    console.log('🎯 Insertando competencias...');
    for (const competency of initData.competencies) {
      await sql`
        INSERT INTO competencies (institute_id, name, description, category, is_active)
        VALUES (${instituteId}, ${competency.name}, ${competency.description}, ${competency.category}, true)
        ON CONFLICT (institute_id, name) DO NOTHING;
      `;
      console.log(`  ✅ Competencia ${competency.name} insertada`);
    }

    // Crear año académico demo
    console.log('📅 Creando año académico demo...');
    const currentYear = new Date().getFullYear();
    const academicYearResult = await sql`
      INSERT INTO academic_years (institute_id, name, start_date, end_date, status)
      VALUES (${instituteId}, '${currentYear}-${currentYear + 1}', 
              '${currentYear}-09-01', '${currentYear + 1}-06-30', 'active')
      ON CONFLICT (institute_id, name) DO NOTHING
      RETURNING id;
    `;

    if (academicYearResult.length > 0) {
      console.log(`✅ Año académico ${currentYear}-${currentYear + 1} creado`);
    } else {
      console.log(`✅ Año académico ${currentYear}-${currentYear + 1} ya existía`);
    }

    // Verificar datos insertados
    console.log('\n📊 VERIFICANDO DATOS INSERTADOS');
    console.log('===============================');

    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM institutes) as institutes_count,
        (SELECT COUNT(*) FROM modules) as modules_count,
        (SELECT COUNT(*) FROM competencies) as competencies_count,
        (SELECT COUNT(*) FROM academic_years) as academic_years_count,
        (SELECT COUNT(*) FROM institute_modules) as institute_modules_count;
    `;

    console.log(`🏫 Institutos: ${counts[0].institutes_count}`);
    console.log(`📦 Módulos: ${counts[0].modules_count}`);
    console.log(`🎯 Competencias: ${counts[0].competencies_count}`);
    console.log(`📅 Años académicos: ${counts[0].academic_years_count}`);
    console.log(`🔗 Módulos de instituto: ${counts[0].institute_modules_count}`);

    // Cerrar conexión
    await sql.end();
    
    console.log('\n✅ Base de datos inicializada exitosamente');
    console.log('🚀 La aplicación está lista para usar');
    
  } catch (error) {
    console.error('\n❌ ERROR AL INICIALIZAR BASE DE DATOS:');
    console.error('=====================================');
    console.error(error.message);
    
    if (error.message.includes('No se encontraron tablas')) {
      console.error('\n💡 EJECUTA PRIMERO:');
      console.error('==================');
      console.error('npm run db:create-tables');
    }
    
    process.exit(1);
  }
}

// Ejecutar el script
initDatabase(); 