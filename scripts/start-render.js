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
  const clientDistPath = join(__dirname, '..', 'dist', 'client');
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
  
  // Ruta para servir la aplicación React
  app.get('*', (req, res) => {
    if (existsSync(indexHtmlPath)) {
      res.sendFile(indexHtmlPath);
    } else {
      res.json({
        message: 'GEI Unified Platform - Servidor funcionando',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        note: 'Frontend no encontrado, solo API disponible'
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