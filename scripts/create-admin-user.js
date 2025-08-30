#!/usr/bin/env node

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔧 === CREANDO USUARIO ADMINISTRADOR ===');

// Configuración de la base de datos
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified';

let sql;

try {
  // Conectar a la base de datos
  sql = postgres(DATABASE_URL, { 
    max: 10,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log('✅ Conexión a base de datos establecida');

  // Crear tablas si no existen
  console.log('📋 Creando tablas...');
  
  // Tabla de institutos
  await sql`
    CREATE TABLE IF NOT EXISTS institutes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      website VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tabla de usuarios
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) NOT NULL DEFAULT 'student',
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      institute_id INTEGER REFERENCES institutes(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tabla de cursos
  await sql`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      academic_year INTEGER NOT NULL,
      semester INTEGER DEFAULT 1,
      credits INTEGER DEFAULT 0,
      institute_id INTEGER REFERENCES institutes(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tabla de competencias
  await sql`
    CREATE TABLE IF NOT EXISTS competencies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL,
      description TEXT,
      level VARCHAR(50) DEFAULT 'básico',
      weight DECIMAL(3,2) DEFAULT 1.00,
      course_id INTEGER REFERENCES courses(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tabla de criterios
  await sql`
    CREATE TABLE IF NOT EXISTS criteria (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      max_score DECIMAL(5,2) DEFAULT 10.00,
      weight DECIMAL(3,2) DEFAULT 1.00,
      competency_id INTEGER REFERENCES competencies(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tabla de evaluaciones
  await sql`
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      max_score DECIMAL(5,2) DEFAULT 10.00,
      weight DECIMAL(3,2) DEFAULT 1.00,
      course_id INTEGER REFERENCES courses(id),
      created_by INTEGER REFERENCES users(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tabla de calificaciones
  await sql`
    CREATE TABLE IF NOT EXISTS grades (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id),
      evaluation_id INTEGER REFERENCES evaluations(id),
      criterion_id INTEGER REFERENCES criteria(id),
      score DECIMAL(5,2) NOT NULL,
      comments TEXT,
      graded_by INTEGER REFERENCES users(id),
      graded_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, evaluation_id, criterion_id)
    )
  `;

  // Tabla de asistencia
  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      date DATE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'presente',
      comments TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, course_id, date)
    )
  `;

  // Tabla de inscripciones
  await sql`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      enrollment_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, course_id)
    )
  `;

  console.log('✅ Tablas creadas correctamente');

  // Crear instituto por defecto
  console.log('🏫 Creando instituto por defecto...');
  const institute = await sql`
    INSERT INTO institutes (name, code, email, website)
    VALUES ('GEI Institute', 'GEI001', 'info@gei.edu', 'https://gei.edu')
    ON CONFLICT (code) DO UPDATE SET 
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      website = EXCLUDED.website
    RETURNING id, name, code
  `;

  console.log(`✅ Instituto creado: ${institute[0].name} (${institute[0].code})`);

  // Crear usuario administrador
  console.log('👤 Creando usuario administrador...');
  
  const adminPassword = 'admin123'; // Contraseña por defecto
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  const adminUser = await sql`
    INSERT INTO users (email, display_name, first_name, last_name, role, password_hash, institute_id)
    VALUES (
      'admin@gei.edu',
      'Administrador GEI',
      'Admin',
      'GEI',
      'admin',
      ${hashedPassword},
      ${institute[0].id}
    )
    ON CONFLICT (email) DO UPDATE SET 
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      institute_id = EXCLUDED.institute_id
    RETURNING id, email, display_name, role
  `;

  console.log(`✅ Usuario administrador creado: ${adminUser[0].display_name} (${adminUser[0].email})`);

  // Crear usuario profesor de ejemplo
  console.log('👨‍🏫 Creando usuario profesor...');
  
  const teacherPassword = 'teacher123';
  const hashedTeacherPassword = await bcrypt.hash(teacherPassword, 12);
  
  const teacherUser = await sql`
    INSERT INTO users (email, display_name, first_name, last_name, role, password_hash, institute_id)
    VALUES (
      'teacher@gei.edu',
      'Profesor Ejemplo',
      'Profesor',
      'Ejemplo',
      'teacher',
      ${hashedTeacherPassword},
      ${institute[0].id}
    )
    ON CONFLICT (email) DO UPDATE SET 
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      institute_id = EXCLUDED.institute_id
    RETURNING id, email, display_name, role
  `;

  console.log(`✅ Usuario profesor creado: ${teacherUser[0].display_name} (${teacherUser[0].email})`);

  // Crear usuario estudiante de ejemplo
  console.log('👨‍🎓 Creando usuario estudiante...');
  
  const studentPassword = 'student123';
  const hashedStudentPassword = await bcrypt.hash(studentPassword, 12);
  
  const studentUser = await sql`
    INSERT INTO users (email, display_name, first_name, last_name, role, password_hash, institute_id)
    VALUES (
      'student@gei.edu',
      'Estudiante Ejemplo',
      'Estudiante',
      'Ejemplo',
      'student',
      ${hashedStudentPassword},
      ${institute[0].id}
    )
    ON CONFLICT (email) DO UPDATE SET 
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      institute_id = EXCLUDED.institute_id
    RETURNING id, email, display_name, role
  `;

  console.log(`✅ Usuario estudiante creado: ${studentUser[0].display_name} (${studentUser[0].email})`);

  // Crear curso de ejemplo
  console.log('📚 Creando curso de ejemplo...');
  
  const course = await sql`
    INSERT INTO courses (name, code, description, academic_year, semester, credits, institute_id)
    VALUES (
      'Matemáticas Avanzadas',
      'MATH101',
      'Curso de matemáticas para estudiantes avanzados',
      2025,
      1,
      6,
      ${institute[0].id}
    )
    ON CONFLICT (code) DO UPDATE SET 
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      academic_year = EXCLUDED.academic_year,
      semester = EXCLUDED.semester,
      credits = EXCLUDED.credits,
      institute_id = EXCLUDED.institute_id
    RETURNING id, name, code
  `;

  console.log(`✅ Curso creado: ${course[0].name} (${course[0].code})`);

  // Inscribir estudiante en el curso
  await sql`
    INSERT INTO enrollments (student_id, course_id)
    VALUES (${studentUser[0].id}, ${course[0].id})
    ON CONFLICT (student_id, course_id) DO NOTHING
  `;

  console.log(`✅ Estudiante inscrito en el curso`);

  console.log('\n🎉 === USUARIOS CREADOS EXITOSAMENTE ===');
  console.log('\n📋 Credenciales de acceso:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 ADMINISTRADOR:');
  console.log(`   Email: admin@gei.edu`);
  console.log(`   Contraseña: ${adminPassword}`);
  console.log(`   Rol: admin`);
  console.log('');
  console.log('👨‍🏫 PROFESOR:');
  console.log(`   Email: teacher@gei.edu`);
  console.log(`   Contraseña: ${teacherPassword}`);
  console.log(`   Rol: teacher`);
  console.log('');
  console.log('👨‍🎓 ESTUDIANTE:');
  console.log(`   Email: student@gei.edu`);
  console.log(`   Contraseña: ${studentPassword}`);
  console.log(`   Rol: student`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🌐 Accede a: http://localhost:3000');
  console.log('🔐 Usa las credenciales del administrador para acceder');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
} finally {
  if (sql) {
    await sql.end();
  }
  console.log('\n✅ Script completado');
} 