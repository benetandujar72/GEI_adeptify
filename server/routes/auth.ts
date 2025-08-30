import { Router } from 'express';
import { logger } from '../utils/logger.js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const router = Router();

// Configuración de la base de datos
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified';
const sql = postgres(DATABASE_URL, { 
  max: 10,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// TEMPORAL: Almacén de sesiones en memoria
const sessionStore = new Map();

// Función para parsear cookies manualmente
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

// Función para establecer cookies manualmente
function setCookie(res: any, name: string, value: string, options: any = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path) cookie += `; Path=${options.path}`;
  
  res.setHeader('Set-Cookie', cookie);
}

// Login
router.post('/login', async (req, res) => {
  try {
    logger.info('🔐 ===== INTENTO DE LOGIN =====');
    logger.info(`📋 Body recibido: ${JSON.stringify(req.body)}`);
    
    const { email, username, password } = req.body;
    const userIdentifier = email || username;
    
    logger.info(`🔐 Intento de login con: ${userIdentifier}`);
    
    // Validación básica
    if (!userIdentifier || !password) {
      logger.warn('❌ Faltan credenciales');
      return res.status(400).json({ 
        success: false,
        message: 'Email/username y contraseña son requeridos' 
      });
    }
    
    // Buscar usuario en la base de datos
    logger.info('🔍 Buscando usuario en la base de datos...');
    const users = await sql`
      SELECT id, email, display_name, first_name, last_name, role, password_hash, institute_id
      FROM users 
      WHERE email = ${userIdentifier} AND is_active = true
    `;
    
    if (users.length === 0) {
      logger.warn(`❌ Usuario no encontrado: ${userIdentifier}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    const user = users[0];
    logger.info(`✅ Usuario encontrado: ${user.display_name} (${user.role})`);
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      logger.warn(`❌ Contraseña incorrecta para: ${userIdentifier}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    logger.info('✅ Contraseña válida');
    
    // Generar session ID único
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Crear sesión en nuestro almacén
    const sessionData = {
      userId: user.id.toString(),
      userEmail: user.email,
      userRole: user.role,
      createdAt: new Date().toISOString()
    };
    
    sessionStore.set(sessionId, sessionData);
    logger.info(`✅ Sesión creada con ID: ${sessionId}`);
    
    // Establecer cookie de sesión manualmente
    setCookie(res, 'sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60, // 24 horas en segundos
      path: '/'
    });
    
    return res.json({ 
      success: true,
      user: {
        id: user.id.toString(),
        email: user.email,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        instituteId: user.institute_id
      }
    });
    
  } catch (error) {
    logger.error('❌ Error en login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  logger.info('🚪 Logout solicitado');
  res.json({ 
    success: true,
    message: 'Logout exitoso' 
  });
});

// Register
router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint' });
});

// Google OAuth routes
router.get('/google', (req, res) => {
  try {
    logger.info('Google OAuth iniciado');
    
    // Por ahora, devolver una respuesta temporal
    // En el futuro, aquí se implementará la redirección a Google OAuth
    res.json({ 
      message: 'Google OAuth endpoint - Implementación pendiente',
      status: 'not_implemented'
    });
  } catch (error) {
    logger.error('Error en Google OAuth:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/google/callback', (req, res) => {
  try {
    logger.info('Google OAuth callback recibido');
    
    // Por ahora, devolver una respuesta temporal
    res.json({ 
      message: 'Google OAuth callback - Implementación pendiente',
      status: 'not_implemented'
    });
  } catch (error) {
    logger.error('Error en Google OAuth callback:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    logger.info('Auth /me endpoint called');
    
    // Obtener sessionId de la cookie manualmente
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.sessionId;
    logger.info(`📋 SessionId de cookie: ${sessionId}`);
    
    if (!sessionId) {
      logger.info('❌ No hay sessionId en la cookie');
      return res.status(401).json({ 
        message: 'No autenticado - No sessionId',
        sessionExists: false
      });
    }
    
    // Buscar sesión en nuestro almacén
    const sessionData = sessionStore.get(sessionId);
    logger.info(`📋 Datos de sesión encontrados: ${JSON.stringify(sessionData)}`);
    
    if (!sessionData) {
      logger.info('❌ Sesión no encontrada en el almacén');
      return res.status(401).json({ 
        message: 'No autenticado - Sesión no encontrada',
        sessionId: sessionId
      });
    }
    
    // Verificar si la sesión no ha expirado (24 horas)
    const sessionAge = Date.now() - new Date(sessionData.createdAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    if (sessionAge > maxAge) {
      logger.info('❌ Sesión expirada');
      sessionStore.delete(sessionId);
      return res.status(401).json({ 
        message: 'Sesión expirada',
        sessionId: sessionId
      });
    }
    
    // Obtener datos actualizados del usuario desde la base de datos
    const users = await sql`
      SELECT id, email, display_name, first_name, last_name, role, institute_id
      FROM users 
      WHERE id = ${sessionData.userId} AND is_active = true
    `;
    
    if (users.length === 0) {
      logger.info('❌ Usuario no encontrado en la base de datos');
      sessionStore.delete(sessionId);
      return res.status(401).json({ 
        message: 'Usuario no encontrado',
        sessionId: sessionId
      });
    }
    
    const user = users[0];
    logger.info('✅ Usuario autenticado encontrado en sesión y base de datos');
    return res.json({
      user: {
        id: user.id.toString(),
        email: user.email,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        instituteId: user.institute_id
      }
    });
  } catch (error) {
    logger.error('❌ Error en /me endpoint:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 