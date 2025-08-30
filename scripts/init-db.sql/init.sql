-- Script de inicialización de la base de datos GEI
-- Ejecutar este script para crear las tablas y usuarios iniciales

-- Crear tabla de institutos
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
);

-- Crear tabla de usuarios
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
);

-- Crear tabla de cursos
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
);

-- Crear tabla de competencias
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
);

-- Crear tabla de criterios
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
);

-- Crear tabla de evaluaciones
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
);

-- Crear tabla de calificaciones
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
);

-- Crear tabla de asistencia
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
);

-- Crear tabla de inscripciones
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id),
  course_id INTEGER REFERENCES courses(id),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Insertar instituto por defecto
INSERT INTO institutes (name, code, email, website)
VALUES ('GEI Institute', 'GEI001', 'info@gei.edu', 'https://gei.edu')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  website = EXCLUDED.website;

-- Insertar usuario administrador (password: admin123)
INSERT INTO users (email, display_name, first_name, last_name, role, password_hash, institute_id)
VALUES (
  'admin@gei.edu',
  'Administrador GEI',
  'Admin',
  'GEI',
  'admin',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqQKqK', -- admin123
  (SELECT id FROM institutes WHERE code = 'GEI001')
)
ON CONFLICT (email) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  institute_id = EXCLUDED.institute_id;

-- Insertar usuario profesor (password: teacher123)
INSERT INTO users (email, display_name, first_name, last_name, role, password_hash, institute_id)
VALUES (
  'teacher@gei.edu',
  'Profesor Ejemplo',
  'Profesor',
  'Ejemplo',
  'teacher',
  '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- teacher123
  (SELECT id FROM institutes WHERE code = 'GEI001')
)
ON CONFLICT (email) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  institute_id = EXCLUDED.institute_id;

-- Insertar usuario estudiante (password: student123)
INSERT INTO users (email, display_name, first_name, last_name, role, password_hash, institute_id)
VALUES (
  'student@gei.edu',
  'Estudiante Ejemplo',
  'Estudiante',
  'Ejemplo',
  'student',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- student123
  (SELECT id FROM institutes WHERE code = 'GEI001')
)
ON CONFLICT (email) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  institute_id = EXCLUDED.institute_id;

-- Insertar curso de ejemplo
INSERT INTO courses (name, code, description, academic_year, semester, credits, institute_id)
VALUES (
  'Matemáticas Avanzadas',
  'MATH101',
  'Curso de matemáticas para estudiantes avanzados',
  2025,
  1,
  6,
  (SELECT id FROM institutes WHERE code = 'GEI001')
)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  academic_year = EXCLUDED.academic_year,
  semester = EXCLUDED.semester,
  credits = EXCLUDED.credits,
  institute_id = EXCLUDED.institute_id;

-- Inscribir estudiante en el curso
INSERT INTO enrollments (student_id, course_id)
VALUES (
  (SELECT id FROM users WHERE email = 'student@gei.edu'),
  (SELECT id FROM courses WHERE code = 'MATH101')
)
ON CONFLICT (student_id, course_id) DO NOTHING;

-- Mostrar mensaje de confirmación
SELECT 'Base de datos inicializada correctamente' as status;
