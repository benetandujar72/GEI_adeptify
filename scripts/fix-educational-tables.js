#!/usr/bin/env node

// Script para verificar y corregir la estructura de las tablas educativas
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔧 VERIFICANDO Y CORRIGIENDO TABLAS EDUCATIVAS');
console.log('==============================================');

async function fixEducationalTables() {
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

    // Verificar qué tablas existen
    console.log('\n🔍 Verificando tablas existentes...');
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'courses', 'competencies', 'criteria', 'evaluations', 
        'evaluation_criteria', 'grades', 'attendance', 
        'educational_resources', 'enrollments', 'teacher_assignments'
      )
      ORDER BY table_name;
    `;

    console.log('📋 Tablas encontradas:');
    existingTables.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });

    // Eliminar tablas problemáticas y recrearlas
    console.log('\n🗑️ Eliminando tablas problemáticas...');
    
    const tablesToDrop = [
      'teacher_assignments',
      'enrollments', 
      'educational_resources',
      'attendance',
      'grades',
      'evaluation_criteria',
      'evaluations',
      'criteria',
      'competencies',
      'courses'
    ];

    for (const tableName of tablesToDrop) {
      try {
        await sql`DROP TABLE IF EXISTS ${sql(tableName)} CASCADE;`;
        console.log(`   ✅ ${tableName} eliminada`);
      } catch (error) {
        console.log(`   ⚠️ Error eliminando ${tableName}: ${error.message}`);
      }
    }

    // Recrear las tablas correctamente
    console.log('\n🏗️ Recreando tablas con estructura correcta...');

    // 1. Tabla de cursos/módulos
    console.log('📚 Creando tabla de cursos...');
    await sql`
      CREATE TABLE courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        academic_year VARCHAR(9) NOT NULL,
        semester INTEGER CHECK (semester IN (1, 2)),
        credits DECIMAL(3,1) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Tabla de competencias
    console.log('🎯 Creando tabla de competencias...');
    await sql`
      CREATE TABLE competencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        level VARCHAR(20) CHECK (level IN ('básico', 'intermedio', 'avanzado')),
        weight DECIMAL(3,2) DEFAULT 1.00,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(course_id, code)
      );
    `;

    // 3. Tabla de criterios de evaluación
    console.log('📋 Creando tabla de criterios...');
    await sql`
      CREATE TABLE criteria (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        max_score DECIMAL(5,2) DEFAULT 10.00,
        weight DECIMAL(3,2) DEFAULT 1.00,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 4. Tabla de evaluaciones
    console.log('📝 Creando tabla de evaluaciones...');
    await sql`
      CREATE TABLE evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) CHECK (type IN ('examen', 'trabajo', 'proyecto', 'presentación', 'práctica', 'otro')),
        date DATE NOT NULL,
        max_score DECIMAL(5,2) DEFAULT 10.00,
        weight DECIMAL(3,2) DEFAULT 1.00,
        is_active BOOLEAN DEFAULT true,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 5. Tabla de criterios de evaluación por evaluación
    console.log('🔗 Creando tabla de criterios por evaluación...');
    await sql`
      CREATE TABLE evaluation_criteria (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
        weight DECIMAL(3,2) DEFAULT 1.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(evaluation_id, criterion_id)
      );
    `;

    // 6. Tabla de calificaciones
    console.log('📊 Creando tabla de calificaciones...');
    await sql`
      CREATE TABLE grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
        score DECIMAL(5,2) NOT NULL,
        comments TEXT,
        graded_by UUID NOT NULL REFERENCES users(id),
        graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, evaluation_id, criterion_id)
      );
    `;

    // 7. Tabla de asistencia
    console.log('📅 Creando tabla de asistencia...');
    await sql`
      CREATE TABLE attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('presente', 'ausente', 'justificado', 'tardanza')),
        comments TEXT,
        recorded_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, course_id, date)
      );
    `;

    // 8. Tabla de recursos educativos
    console.log('📚 Creando tabla de recursos...');
    await sql`
      CREATE TABLE educational_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) CHECK (type IN ('documento', 'video', 'enlace', 'imagen', 'audio', 'otro')),
        url TEXT,
        file_path TEXT,
        file_size INTEGER,
        mime_type VARCHAR(100),
        is_public BOOLEAN DEFAULT false,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 9. Tabla de inscripciones de estudiantes
    console.log('👥 Creando tabla de inscripciones...');
    await sql`
      CREATE TABLE enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        enrollment_date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('activo', 'inactivo', 'suspendido', 'completado')) DEFAULT 'activo',
        final_grade DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, course_id)
      );
    `;

    // 10. Tabla de asignaciones de profesores
    console.log('👨‍🏫 Creando tabla de asignaciones...');
    await sql`
      CREATE TABLE teacher_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        role VARCHAR(50) CHECK (role IN ('profesor', 'coordinador', 'tutor')) DEFAULT 'profesor',
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(teacher_id, course_id)
      );
    `;

    // Crear índices para mejorar rendimiento
    console.log('\n🔍 Creando índices...');
    await sql`CREATE INDEX idx_courses_institute ON courses(institute_id);`;
    await sql`CREATE INDEX idx_competencies_course ON competencies(course_id);`;
    await sql`CREATE INDEX idx_criteria_competency ON criteria(competency_id);`;
    await sql`CREATE INDEX idx_evaluations_course ON evaluations(course_id);`;
    await sql`CREATE INDEX idx_grades_student ON grades(student_id);`;
    await sql`CREATE INDEX idx_grades_evaluation ON grades(evaluation_id);`;
    await sql`CREATE INDEX idx_attendance_student ON attendance(student_id);`;
    await sql`CREATE INDEX idx_attendance_course ON attendance(course_id);`;
    await sql`CREATE INDEX idx_enrollments_student ON enrollments(student_id);`;
    await sql`CREATE INDEX idx_enrollments_course ON enrollments(course_id);`;

    // Cerrar conexión
    await sql.end();
    
    console.log('\n🎉 TABLAS EDUCATIVAS CORREGIDAS EXITOSAMENTE');
    console.log('=============================================');
    console.log('\n📋 TABLAS CREADAS:');
    console.log('==================');
    console.log('✅ courses - Cursos y módulos');
    console.log('✅ competencies - Competencias educativas');
    console.log('✅ criteria - Criterios de evaluación');
    console.log('✅ evaluations - Evaluaciones');
    console.log('✅ evaluation_criteria - Criterios por evaluación');
    console.log('✅ grades - Calificaciones');
    console.log('✅ attendance - Asistencia');
    console.log('✅ educational_resources - Recursos educativos');
    console.log('✅ enrollments - Inscripciones de estudiantes');
    console.log('✅ teacher_assignments - Asignaciones de profesores');
    console.log('\n🔍 ÍNDICES CREADOS PARA OPTIMIZAR RENDIMIENTO');
    console.log('\n🚀 Base de datos educativa lista para usar!');
    
  } catch (error) {
    console.error('\n❌ ERROR AL CORREGIR TABLAS EDUCATIVAS:');
    console.error('=========================================');
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar el script
fixEducationalTables(); 