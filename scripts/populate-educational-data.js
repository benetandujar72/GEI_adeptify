#!/usr/bin/env node

// Script para poblar la base de datos con datos educativos de ejemplo
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('📚 POBLANDO BASE DE DATOS CON DATOS EDUCATIVOS');
console.log('==============================================');

async function populateEducationalData() {
  try {
    // Verificar variables de entorno
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está definida en las variables de entorno');
    }

    console.log('📡 Conectando a la base de datos...');
    
    // Crear conexión a la base de datos
    const sql = postgres(databaseUrl, { 
      max: 1,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('✅ Conexión establecida');

    // Obtener instituto existente
    const institutes = await sql`SELECT id FROM institutes LIMIT 1`;
    if (institutes.length === 0) {
      throw new Error('No se encontró ningún instituto. Ejecuta primero: npm run db:init-simple');
    }
    const instituteId = institutes[0].id;

    // Obtener usuarios existentes
    const users = await sql`SELECT id, role FROM users WHERE is_active = true`;
    const teachers = users.filter(u => u.role === 'teacher' || u.role === 'institute_admin' || u.role === 'super_admin');
    const students = users.filter(u => u.role === 'student');

    if (teachers.length === 0 || students.length === 0) {
      throw new Error('No se encontraron profesores o estudiantes. Ejecuta primero: npm run create:admin');
    }

    console.log(`✅ Encontrados ${teachers.length} profesores y ${students.length} estudiantes`);

    // 1. Crear cursos de ejemplo
    console.log('\n📚 Creando cursos de ejemplo...');
    const courses = [
      {
        name: 'Matemáticas 3º ESO',
        code: 'MAT3ESO',
        description: 'Matemáticas para 3º de Educación Secundaria Obligatoria',
        academic_year: '2024-2025',
        semester: 1,
        credits: 4.0
      },
      {
        name: 'Lengua Castellana 3º ESO',
        code: 'LEN3ESO',
        description: 'Lengua Castellana y Literatura para 3º ESO',
        academic_year: '2024-2025',
        semester: 1,
        credits: 4.0
      },
      {
        name: 'Ciencias Naturales 3º ESO',
        code: 'CN3ESO',
        description: 'Ciencias Naturales para 3º ESO',
        academic_year: '2024-2025',
        semester: 1,
        credits: 3.0
      },
      {
        name: 'Historia 3º ESO',
        code: 'HIS3ESO',
        description: 'Historia para 3º ESO',
        academic_year: '2024-2025',
        semester: 1,
        credits: 3.0
      }
    ];

    const createdCourses = [];
    for (const courseData of courses) {
      const course = await sql`
        INSERT INTO courses (name, code, description, academic_year, semester, credits, institute_id)
        VALUES (${courseData.name}, ${courseData.code}, ${courseData.description}, ${courseData.academic_year}, ${courseData.semester}, ${courseData.credits}, ${instituteId})
        ON CONFLICT (code) DO NOTHING
        RETURNING *
      `;
      
      if (course.length > 0) {
        createdCourses.push(course[0]);
        console.log(`   ✅ ${courseData.name}`);
      } else {
        console.log(`   ⚠️ ${courseData.name} ya existe`);
      }
    }

    // 2. Crear competencias de ejemplo
    console.log('\n🎯 Creando competencias de ejemplo...');
    const competencies = [
      // Matemáticas
      {
        name: 'Resolución de problemas matemáticos',
        code: 'MAT_PROB',
        description: 'Capacidad para resolver problemas matemáticos complejos',
        level: 'intermedio',
        weight: 1.5,
        courseCode: 'MAT3ESO'
      },
      {
        name: 'Cálculo algebraico',
        code: 'MAT_ALG',
        description: 'Manejo de expresiones algebraicas y ecuaciones',
        level: 'básico',
        weight: 1.0,
        courseCode: 'MAT3ESO'
      },
      {
        name: 'Geometría y medida',
        code: 'MAT_GEO',
        description: 'Comprensión de conceptos geométricos y medición',
        level: 'básico',
        weight: 1.0,
        courseCode: 'MAT3ESO'
      },
      // Lengua
      {
        name: 'Comprensión lectora',
        code: 'LEN_COMP',
        description: 'Capacidad de comprensión y análisis de textos',
        level: 'intermedio',
        weight: 1.5,
        courseCode: 'LEN3ESO'
      },
      {
        name: 'Expresión escrita',
        code: 'LEN_EXPR',
        description: 'Habilidad para expresarse por escrito correctamente',
        level: 'básico',
        weight: 1.0,
        courseCode: 'LEN3ESO'
      },
      {
        name: 'Análisis literario',
        code: 'LEN_LIT',
        description: 'Análisis y comprensión de obras literarias',
        level: 'avanzado',
        weight: 1.2,
        courseCode: 'LEN3ESO'
      }
    ];

    const createdCompetencies = [];
    for (const compData of competencies) {
      const course = createdCourses.find(c => c.code === compData.courseCode);
      if (!course) continue;

      const competency = await sql`
        INSERT INTO competencies (name, code, description, level, weight, course_id)
        VALUES (${compData.name}, ${compData.code}, ${compData.description}, ${compData.level}, ${compData.weight}, ${course.id})
        ON CONFLICT (course_id, code) DO NOTHING
        RETURNING *
      `;
      
      if (competency.length > 0) {
        createdCompetencies.push(competency[0]);
        console.log(`   ✅ ${compData.name} (${compData.courseCode})`);
      } else {
        console.log(`   ⚠️ ${compData.name} ya existe`);
      }
    }

    // 3. Crear criterios de evaluación
    console.log('\n📋 Creando criterios de evaluación...');
    const criteria = [
      // Criterios para resolución de problemas matemáticos
      {
        name: 'Identificación del problema',
        description: 'Capacidad para identificar qué se pide en el problema',
        max_score: 2.0,
        weight: 1.0,
        competencyCode: 'MAT_PROB'
      },
      {
        name: 'Estrategia de resolución',
        description: 'Elección y aplicación de estrategias adecuadas',
        max_score: 3.0,
        weight: 1.5,
        competencyCode: 'MAT_PROB'
      },
      {
        name: 'Cálculos correctos',
        description: 'Realización de cálculos sin errores',
        max_score: 3.0,
        weight: 1.0,
        competencyCode: 'MAT_PROB'
      },
      {
        name: 'Presentación de resultados',
        description: 'Claridad en la presentación de la solución',
        max_score: 2.0,
        weight: 0.8,
        competencyCode: 'MAT_PROB'
      },
      // Criterios para comprensión lectora
      {
        name: 'Comprensión literal',
        description: 'Comprensión del contenido explícito del texto',
        max_score: 3.0,
        weight: 1.0,
        competencyCode: 'LEN_COMP'
      },
      {
        name: 'Comprensión inferencial',
        description: 'Capacidad para extraer información implícita',
        max_score: 4.0,
        weight: 1.5,
        competencyCode: 'LEN_COMP'
      },
      {
        name: 'Análisis crítico',
        description: 'Capacidad de análisis y valoración crítica',
        max_score: 3.0,
        weight: 1.2,
        competencyCode: 'LEN_COMP'
      }
    ];

    const createdCriteria = [];
    for (const critData of criteria) {
      const competency = createdCompetencies.find(c => c.code === critData.competencyCode);
      if (!competency) continue;

      const criterion = await sql`
        INSERT INTO criteria (name, description, max_score, weight, competency_id)
        VALUES (${critData.name}, ${critData.description}, ${critData.max_score}, ${critData.weight}, ${competency.id})
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      
      if (criterion.length > 0) {
        createdCriteria.push(criterion[0]);
        console.log(`   ✅ ${critData.name} (${critData.competencyCode})`);
      } else {
        console.log(`   ⚠️ ${critData.name} ya existe`);
      }
    }

    // 4. Crear evaluaciones de ejemplo
    console.log('\n📝 Creando evaluaciones de ejemplo...');
    const evaluations = [
      {
        name: 'Examen de Matemáticas - Unidad 1',
        description: 'Evaluación de la primera unidad de matemáticas',
        type: 'examen',
        date: '2024-10-15',
        max_score: 10.0,
        weight: 1.0,
        courseCode: 'MAT3ESO',
        created_by: teachers[0].id
      },
      {
        name: 'Trabajo de Lengua - Análisis de texto',
        description: 'Trabajo de análisis de un texto literario',
        type: 'trabajo',
        date: '2024-10-20',
        max_score: 10.0,
        weight: 0.8,
        courseCode: 'LEN3ESO',
        created_by: teachers[0].id
      },
      {
        name: 'Examen de Matemáticas - Unidad 2',
        description: 'Evaluación de la segunda unidad de matemáticas',
        type: 'examen',
        date: '2024-11-10',
        max_score: 10.0,
        weight: 1.0,
        courseCode: 'MAT3ESO',
        created_by: teachers[0].id
      }
    ];

    const createdEvaluations = [];
    for (const evalData of evaluations) {
      const course = createdCourses.find(c => c.code === evalData.courseCode);
      if (!course) continue;

      const evaluation = await sql`
        INSERT INTO evaluations (name, description, type, date, max_score, weight, course_id, created_by)
        VALUES (${evalData.name}, ${evalData.description}, ${evalData.type}, ${evalData.date}, ${evalData.max_score}, ${evalData.weight}, ${course.id}, ${evalData.created_by})
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      
      if (evaluation.length > 0) {
        createdEvaluations.push(evaluation[0]);
        console.log(`   ✅ ${evalData.name} (${evalData.courseCode})`);
      } else {
        console.log(`   ⚠️ ${evalData.name} ya existe`);
      }
    }

    // 5. Crear calificaciones de ejemplo
    console.log('\n📊 Creando calificaciones de ejemplo...');
    let gradeCount = 0;
    
    for (const evaluation of createdEvaluations) {
      const course = createdCourses.find(c => c.id === evaluation.course_id);
      const courseCompetencies = createdCompetencies.filter(c => c.course_id === course.id);
      
      for (const student of students.slice(0, 5)) { // Solo primeros 5 estudiantes
        for (const competency of courseCompetencies) {
          const competencyCriteria = createdCriteria.filter(c => c.competency_id === competency.id);
          
          for (const criterion of competencyCriteria) {
            // Generar calificación aleatoria entre 5 y 10
            const score = Math.round((Math.random() * 5 + 5) * 10) / 10;
            const comments = score >= 7 ? 'Buen trabajo' : score >= 5 ? 'Aceptable' : 'Necesita mejorar';
            
            await sql`
              INSERT INTO grades (student_id, evaluation_id, criterion_id, score, comments, graded_by)
              VALUES (${student.id}, ${evaluation.id}, ${criterion.id}, ${score}, ${comments}, ${teachers[0].id})
              ON CONFLICT (student_id, evaluation_id, criterion_id) DO NOTHING
            `;
            
            gradeCount++;
          }
        }
      }
    }
    console.log(`   ✅ ${gradeCount} calificaciones creadas`);

    // 6. Crear asistencia de ejemplo
    console.log('\n📅 Creando asistencia de ejemplo...');
    let attendanceCount = 0;
    
    // Últimos 30 días
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const student of students.slice(0, 5)) {
        for (const course of createdCourses.slice(0, 2)) {
          const statuses = ['presente', 'presente', 'presente', 'presente', 'ausente', 'tardanza'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await sql`
            INSERT INTO attendance (student_id, course_id, date, status, recorded_by)
            VALUES (${student.id}, ${course.id}, ${dateStr}, ${status}, ${teachers[0].id})
            ON CONFLICT (student_id, course_id, date) DO NOTHING
          `;
          
          attendanceCount++;
        }
      }
    }
    console.log(`   ✅ ${attendanceCount} registros de asistencia creados`);

    // 7. Crear inscripciones de estudiantes
    console.log('\n👥 Creando inscripciones de estudiantes...');
    let enrollmentCount = 0;
    
    for (const student of students.slice(0, 5)) {
      for (const course of createdCourses) {
        await sql`
          INSERT INTO enrollments (student_id, course_id, enrollment_date)
          VALUES (${student.id}, ${course.id}, '2024-09-01')
          ON CONFLICT (student_id, course_id) DO NOTHING
        `;
        enrollmentCount++;
      }
    }
    console.log(`   ✅ ${enrollmentCount} inscripciones creadas`);

    // 8. Crear asignaciones de profesores
    console.log('\n👨‍🏫 Creando asignaciones de profesores...');
    let assignmentCount = 0;
    
    for (const teacher of teachers.slice(0, 2)) {
      for (const course of createdCourses.slice(0, 2)) {
        await sql`
          INSERT INTO teacher_assignments (teacher_id, course_id, role)
          VALUES (${teacher.id}, ${course.id}, 'profesor')
          ON CONFLICT (teacher_id, course_id) DO NOTHING
        `;
        assignmentCount++;
      }
    }
    console.log(`   ✅ ${assignmentCount} asignaciones de profesores creadas`);

    // Cerrar conexión
    await sql.end();
    
    console.log('\n🎉 DATOS EDUCATIVOS CREADOS EXITOSAMENTE');
    console.log('=========================================');
    console.log('\n📊 RESUMEN DE DATOS CREADOS:');
    console.log('============================');
    console.log(`✅ ${createdCourses.length} cursos`);
    console.log(`✅ ${createdCompetencies.length} competencias`);
    console.log(`✅ ${createdCriteria.length} criterios de evaluación`);
    console.log(`✅ ${createdEvaluations.length} evaluaciones`);
    console.log(`✅ ${gradeCount} calificaciones`);
    console.log(`✅ ${attendanceCount} registros de asistencia`);
    console.log(`✅ ${enrollmentCount} inscripciones`);
    console.log(`✅ ${assignmentCount} asignaciones de profesores`);
    console.log('\n🚀 ¡Base de datos lista para usar con datos reales!');
    console.log('\n💡 Puedes probar los endpoints:');
    console.log('   GET /api/courses');
    console.log('   GET /api/competencies');
    console.log('   GET /api/evaluations');
    console.log('   GET /api/grades');
    console.log('   GET /api/statistics');
    
  } catch (error) {
    console.error('\n❌ ERROR AL POBLAR DATOS EDUCATIVOS:');
    console.error('=====================================');
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar el script
populateEducationalData(); 