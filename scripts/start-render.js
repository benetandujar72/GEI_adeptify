#!/usr/bin/env node

// Script de inicio específico para Render
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 INICIANDO APLICACIÓN EN RENDER');
console.log('==================================');

// Cargar variables de entorno
try {
  dotenv.config({ path: join(__dirname, '..', '.env') });
  console.log('✅ Variables de entorno cargadas');
} catch (error) {
  console.log('⚠️ No se pudo cargar .env, usando variables del sistema');
}

// Configurar variables de entorno
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('📊 Configuración:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || 3000}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '***configurada***' : 'NO CONFIGURADA'}`);

// Crear conexión a la base de datos
let sql;
if (process.env.DATABASE_URL) {
  try {
    sql = postgres(process.env.DATABASE_URL, { 
      max: 10,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Conexión a base de datos configurada');
  } catch (error) {
    console.log('⚠️ No se pudo configurar la conexión a la base de datos:', error.message);
  }
}

try {
  console.log('\n📦 Creando servidor Express...');
  const app = express();
  
  // Middleware de seguridad y rendimiento
  app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar CSP para desarrollo
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Verificar si existen archivos estáticos del cliente
  const clientDistPath = join(__dirname, '..', 'client', 'dist');
  const indexHtmlPath = join(clientDistPath, 'index.html');
  
  if (existsSync(clientDistPath)) {
    console.log('✅ Directorio client/dist encontrado');
    app.use(express.static(clientDistPath));
    
    if (existsSync(indexHtmlPath)) {
      console.log('✅ index.html encontrado');
    } else {
      console.log('⚠️ index.html no encontrado en client/dist');
    }
  } else {
    console.log('⚠️ Directorio client/dist no encontrado');
  }
  
  // Rutas de API básicas
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_URL ? 'configurada' : 'no configurada',
      version: '1.0.0',
      platform: 'render'
    });
  });
  
  app.get('/api/status', (req, res) => {
    res.json({ 
      message: 'GEI Unified Platform - API funcionando en Render!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: 'render'
    });
  });
  
  app.get('/api/info', (req, res) => {
    res.json({
      name: 'GEI Unified Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      platform: 'render',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Rutas de autenticación
  app.get('/api/auth/me', async (req, res) => {
    try {
      // Simular verificación de sesión
      // En producción, esto debería verificar un token JWT
      res.json({
        user: null,
        isAuthenticated: false,
        message: 'No autenticado'
      });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email y contraseña son requeridos' 
        });
      }

      if (!sql) {
        return res.status(500).json({ 
          error: 'Base de datos no disponible' 
        });
      }

      // Buscar usuario en la base de datos
      const users = await sql`
        SELECT id, email, display_name, first_name, last_name, role, password_hash, is_active, institute_id
        FROM users 
        WHERE email = ${email} AND is_active = true
        LIMIT 1
      `;

      if (users.length === 0) {
        return res.status(401).json({ 
          error: 'Credenciales inválidas' 
        });
      }

      const user = users[0];

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Credenciales inválidas' 
        });
      }

      // Obtener información del instituto
      let institute = null;
      if (user.institute_id) {
        const institutes = await sql`
          SELECT id, name, code 
          FROM institutes 
          WHERE id = ${user.institute_id}
          LIMIT 1
        `;
        if (institutes.length > 0) {
          institute = institutes[0];
        }
      }

      // Crear respuesta de usuario (sin password_hash)
      const userResponse = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        institute: institute
      };

      console.log(`✅ Login exitoso para: ${user.email} (${user.role})`);

      res.json({
        user: userResponse,
        isAuthenticated: true,
        message: 'Login exitoso',
        token: 'demo-token-' + Date.now() // Token demo para desarrollo
      });

    } catch (error) {
      console.error('❌ Error en login:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({
      message: 'Logout exitoso',
      isAuthenticated: false
    });
  });

  // Ruta para obtener información de usuarios (solo para testing)
  app.get('/api/users', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ 
          error: 'Base de datos no disponible' 
        });
      }

      const users = await sql`
        SELECT id, email, display_name, first_name, last_name, role, is_active
        FROM users 
        WHERE is_active = true
        ORDER BY display_name
      `;

      res.json({
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active
        }))
      });

    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  });

  // ========================================
  // ENDPOINTS EDUCATIVOS
  // ========================================

  // 1. ENDPOINTS DE CURSOS
  app.get('/api/courses', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const courses = await sql`
        SELECT c.*, i.name as institute_name
        FROM courses c
        LEFT JOIN institutes i ON c.institute_id = i.id
        WHERE c.is_active = true
        ORDER BY c.name
      `;

      res.json({ courses });
    } catch (error) {
      console.error('❌ Error obteniendo cursos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/courses', async (req, res) => {
    try {
      const { name, code, description, academic_year, semester, credits, institute_id } = req.body;
      
      if (!name || !code || !academic_year || !institute_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const newCourse = await sql`
        INSERT INTO courses (name, code, description, academic_year, semester, credits, institute_id)
        VALUES (${name}, ${code}, ${description}, ${academic_year}, ${semester || 1}, ${credits || 0}, ${institute_id})
        RETURNING *
      `;

      res.status(201).json({ course: newCourse[0] });
    } catch (error) {
      console.error('❌ Error creando curso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // 2. ENDPOINTS DE COMPETENCIAS
  app.get('/api/competencies', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { course_id } = req.query;
      let query = sql`
        SELECT c.*, co.name as course_name
        FROM competencies c
        LEFT JOIN courses co ON c.course_id = co.id
        WHERE c.is_active = true
      `;

      if (course_id) {
        query = sql`
          SELECT c.*, co.name as course_name
          FROM competencies c
          LEFT JOIN courses co ON c.course_id = co.id
          WHERE c.is_active = true AND c.course_id = ${course_id}
        `;
      }

      query = sql`${query} ORDER BY c.name`;
      const competencies = await query;

      res.json({ competencies });
    } catch (error) {
      console.error('❌ Error obteniendo competencias:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/competencies', async (req, res) => {
    try {
      const { name, code, description, level, weight, course_id } = req.body;
      
      if (!name || !code || !course_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const newCompetency = await sql`
        INSERT INTO competencies (name, code, description, level, weight, course_id)
        VALUES (${name}, ${code}, ${description}, ${level || 'básico'}, ${weight || 1.00}, ${course_id})
        RETURNING *
      `;

      res.status(201).json({ competency: newCompetency[0] });
    } catch (error) {
      console.error('❌ Error creando competencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // 3. ENDPOINTS DE CRITERIOS
  app.get('/api/criteria', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { competency_id } = req.query;
      let query = sql`
        SELECT c.*, comp.name as competency_name
        FROM criteria c
        LEFT JOIN competencies comp ON c.competency_id = comp.id
        WHERE c.is_active = true
      `;

      if (competency_id) {
        query = sql`
          SELECT c.*, comp.name as competency_name
          FROM criteria c
          LEFT JOIN competencies comp ON c.competency_id = comp.id
          WHERE c.is_active = true AND c.competency_id = ${competency_id}
        `;
      }

      query = sql`${query} ORDER BY c.name`;
      const criteria = await query;

      res.json({ criteria });
    } catch (error) {
      console.error('❌ Error obteniendo criterios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/criteria', async (req, res) => {
    try {
      const { name, description, max_score, weight, competency_id } = req.body;
      
      if (!name || !competency_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const newCriterion = await sql`
        INSERT INTO criteria (name, description, max_score, weight, competency_id)
        VALUES (${name}, ${description}, ${max_score || 10.00}, ${weight || 1.00}, ${competency_id})
        RETURNING *
      `;

      res.status(201).json({ criterion: newCriterion[0] });
    } catch (error) {
      console.error('❌ Error creando criterio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // 4. ENDPOINTS DE EVALUACIONES
  app.get('/api/evaluations', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { course_id } = req.query;
      let query = sql`
        SELECT e.*, c.name as course_name, u.display_name as created_by_name
        FROM evaluations e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.is_active = true
      `;

      if (course_id) {
        query = sql`
          SELECT e.*, c.name as course_name, u.display_name as created_by_name
          FROM evaluations e
          LEFT JOIN courses c ON e.course_id = c.id
          LEFT JOIN users u ON e.created_by = u.id
          WHERE e.is_active = true AND e.course_id = ${course_id}
        `;
      }

      query = sql`${query} ORDER BY e.date DESC`;
      const evaluations = await query;

      res.json({ evaluations });
    } catch (error) {
      console.error('❌ Error obteniendo evaluaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/evaluations', async (req, res) => {
    try {
      const { name, description, type, date, max_score, weight, course_id, created_by } = req.body;
      
      if (!name || !type || !date || !course_id || !created_by) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const newEvaluation = await sql`
        INSERT INTO evaluations (name, description, type, date, max_score, weight, course_id, created_by)
        VALUES (${name}, ${description}, ${type}, ${date}, ${max_score || 10.00}, ${weight || 1.00}, ${course_id}, ${created_by})
        RETURNING *
      `;

      res.status(201).json({ evaluation: newEvaluation[0] });
    } catch (error) {
      console.error('❌ Error creando evaluación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // 5. ENDPOINTS DE CALIFICACIONES
  app.get('/api/grades', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { student_id, evaluation_id } = req.query;
      let query = sql`
        SELECT g.*, 
               s.display_name as student_name,
               e.name as evaluation_name,
               c.name as criterion_name,
               u.display_name as graded_by_name
        FROM grades g
        LEFT JOIN users s ON g.student_id = s.id
        LEFT JOIN evaluations e ON g.evaluation_id = e.id
        LEFT JOIN criteria c ON g.criterion_id = c.id
        LEFT JOIN users u ON g.graded_by = u.id
      `;

      if (student_id) {
        query = sql`${query} WHERE g.student_id = ${student_id}`;
      } else if (evaluation_id) {
        query = sql`${query} WHERE g.evaluation_id = ${evaluation_id}`;
      }

      query = sql`${query} ORDER BY g.graded_at DESC`;
      const grades = await query;

      res.json({ grades });
    } catch (error) {
      console.error('❌ Error obteniendo calificaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/grades', async (req, res) => {
    try {
      const { student_id, evaluation_id, criterion_id, score, comments, graded_by } = req.body;
      
      if (!student_id || !evaluation_id || !criterion_id || !score || !graded_by) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const newGrade = await sql`
        INSERT INTO grades (student_id, evaluation_id, criterion_id, score, comments, graded_by)
        VALUES (${student_id}, ${evaluation_id}, ${criterion_id}, ${score}, ${comments}, ${graded_by})
        ON CONFLICT (student_id, evaluation_id, criterion_id) 
        DO UPDATE SET 
          score = EXCLUDED.score,
          comments = EXCLUDED.comments,
          graded_by = EXCLUDED.graded_by,
          graded_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `;

      res.status(201).json({ grade: newGrade[0] });
    } catch (error) {
      console.error('❌ Error creando calificación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // 6. ENDPOINTS DE ASISTENCIA
  app.get('/api/attendance', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { student_id, course_id, date } = req.query;
      let query = sql`
        SELECT a.*, 
               s.display_name as student_name,
               c.name as course_name,
               u.display_name as recorded_by_name
        FROM attendance a
        LEFT JOIN users s ON a.student_id = s.id
        LEFT JOIN courses c ON a.course_id = c.id
        LEFT JOIN users u ON a.recorded_by = u.id
      `;

      if (student_id) {
        query = sql`${query} WHERE a.student_id = ${student_id}`;
      } else if (course_id) {
        query = sql`${query} WHERE a.course_id = ${course_id}`;
      } else if (date) {
        query = sql`${query} WHERE a.date = ${date}`;
      }

      query = sql`${query} ORDER BY a.date DESC`;
      const attendance = await query;

      res.json({ attendance });
    } catch (error) {
      console.error('❌ Error obteniendo asistencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const { student_id, course_id, date, status, comments, recorded_by } = req.body;
      
      if (!student_id || !course_id || !date || !status || !recorded_by) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const newAttendance = await sql`
        INSERT INTO attendance (student_id, course_id, date, status, comments, recorded_by)
        VALUES (${student_id}, ${course_id}, ${date}, ${status}, ${comments}, ${recorded_by})
        ON CONFLICT (student_id, course_id, date) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          comments = EXCLUDED.comments,
          recorded_by = EXCLUDED.recorded_by,
          updated_at = NOW()
        RETURNING *
      `;

      res.status(201).json({ attendance: newAttendance[0] });
    } catch (error) {
      console.error('❌ Error creando asistencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // 7. ENDPOINTS DE ESTADÍSTICAS
  app.get('/api/statistics', async (req, res) => {
    try {
      if (!sql) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { course_id, student_id } = req.query;

      // Estadísticas generales
      const totalCourses = await sql`SELECT COUNT(*) as count FROM courses WHERE is_active = true`;
      const totalStudents = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true`;
      const totalTeachers = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND is_active = true`;

      // Estadísticas de calificaciones
      const gradeStats = await sql`
        SELECT 
          AVG(score) as average_score,
          MIN(score) as min_score,
          MAX(score) as max_score,
          COUNT(*) as total_grades
        FROM grades
      `;

      // Estadísticas de asistencia
      const attendanceStats = await sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM attendance
        GROUP BY status
      `;

      let courseStats = null;
      if (course_id) {
        courseStats = await sql`
          SELECT 
            c.name as course_name,
            COUNT(DISTINCT e.id) as total_evaluations,
            COUNT(DISTINCT en.student_id) as total_students,
            AVG(g.score) as average_grade
          FROM courses c
          LEFT JOIN evaluations e ON c.id = e.course_id
          LEFT JOIN enrollments en ON c.id = en.course_id
          LEFT JOIN grades g ON e.id = g.evaluation_id
          WHERE c.id = ${course_id}
          GROUP BY c.id, c.name
        `;
      }

      let studentStats = null;
      if (student_id) {
        studentStats = await sql`
          SELECT 
            u.display_name as student_name,
            COUNT(DISTINCT g.evaluation_id) as total_evaluations,
            AVG(g.score) as average_grade,
            COUNT(CASE WHEN a.status = 'presente' THEN 1 END) as present_days,
            COUNT(CASE WHEN a.status = 'ausente' THEN 1 END) as absent_days
          FROM users u
          LEFT JOIN grades g ON u.id = g.student_id
          LEFT JOIN attendance a ON u.id = a.student_id
          WHERE u.id = ${student_id}
          GROUP BY u.id, u.display_name
        `;
      }

      res.json({
        general: {
          totalCourses: totalCourses[0]?.count || 0,
          totalStudents: totalStudents[0]?.count || 0,
          totalTeachers: totalTeachers[0]?.count || 0
        },
        grades: gradeStats[0] || {},
        attendance: attendanceStats,
        course: courseStats?.[0] || null,
        student: studentStats?.[0] || null
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
  
  // Ruta para servir la aplicación React
  app.get('*', (req, res) => {
    if (existsSync(indexHtmlPath)) {
      res.sendFile(indexHtmlPath);
    } else {
      res.json({
        message: 'GEI Unified Platform - Servidor funcionando',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        note: 'Frontend no encontrado, solo API disponible',
        clientPath: clientDistPath,
        indexPath: indexHtmlPath,
        exists: existsSync(clientDistPath)
      });
    }
  });
  
  const port = process.env.PORT || 3000;
  
  console.log('🔌 Iniciando servidor en Render...');
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Servidor iniciado exitosamente en puerto ${port}`);
    console.log(`🌐 URL: http://0.0.0.0:${port}`);
    console.log(`🏥 Health check: http://0.0.0.0:${port}/api/health`);
    console.log(`📊 Status: http://0.0.0.0:${port}/api/status`);
    console.log(`ℹ️ Info: http://0.0.0.0:${port}/api/info`);
    console.log(`🔐 Auth endpoints: http://0.0.0.0:${port}/api/auth/*`);
    console.log(`👥 Users: http://0.0.0.0:${port}/api/users`);
    console.log('\n🚀 La aplicación está lista en Render!');
  });
  
  server.on('error', (error) => {
    console.error('❌ Error del servidor:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error('💡 El puerto ya está en uso');
    }
    process.exit(1);
  });
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    if (sql) {
      sql.end();
    }
    server.close(() => {
      console.log('✅ Servidor detenido exitosamente');
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo servidor...');
    if (sql) {
      sql.end();
    }
    server.close(() => {
      console.log('✅ Servidor detenido exitosamente');
      process.exit(0);
    });
  });
  
  // Manejar errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Error al crear el servidor:', error.message);
  console.error(error.stack);
  if (sql) {
    sql.end();
  }
  process.exit(1);
} 