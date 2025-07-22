import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { db } from '../index.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const router = Router();

// Login funcional
router.post('/login', async (req, res) => {
  try {
    const { username, password, instituteId } = req.body;
    
    logger.info(`🔐 Intento de login: ${username} (instituto: ${instituteId})`);
    logger.info(`📋 Body completo:`, req.body);
    logger.info(`📋 Headers:`, req.headers);
    
    if (!username || !password) {
      logger.warn(`❌ Datos faltantes - username: ${!!username}, password: ${!!password}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos',
        received: {
          username: !!username,
          password: !!password,
          instituteId: !!instituteId
        }
      });
    }
    
    // Buscar usuario por email o username
    let user = null;
    if (username.includes('@')) {
      logger.info(`🔍 Buscando usuario por email: ${username}`);
      [user] = await db.select().from(users).where(eq(users.email, username));
    } else {
      logger.info(`🔍 Buscando usuario por username: ${username}`);
      [user] = await db.select().from(users).where(eq(users.username, username));
    }
    
    if (!user) {
      logger.warn(`❌ Usuario no encontrado: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    logger.info(`✅ Usuario encontrado: ${user.email} (role: ${user.role})`);
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      logger.warn(`❌ Contraseña incorrecta para usuario: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    logger.info(`✅ Contraseña válida para usuario: ${username}`);
    
    // Si es super_admin, no necesita instituteId
    if (user.role === 'super_admin') {
      logger.info(`✅ Login exitoso para super admin: ${username}`);
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          institute_id: user.institute_id
        }
      });
    }
    
    // Para otros roles, verificar instituteId
    if (!instituteId) {
      logger.warn(`❌ instituteId requerido para usuario ${username} (role: ${user.role})`);
      return res.status(400).json({ 
        success: false, 
        message: 'Selección de instituto requerida' 
      });
    }
    
    if (user.institute_id && user.institute_id !== parseInt(instituteId)) {
      logger.warn(`❌ Usuario ${username} no pertenece al instituto ${instituteId}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Usuario no pertenece al instituto seleccionado' 
      });
    }
    
    logger.info(`✅ Login exitoso: ${username} (instituto: ${instituteId})`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        institute_id: user.institute_id
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
router.get('/me', (req, res) => {
  try {
    logger.info('Auth /me endpoint called');
    
    // Por ahora, devolver null para indicar que no hay usuario autenticado
    // Esto permitirá que la aplicación cargue sin problemas
    res.json({ 
      user: null,
      authenticated: false,
      message: 'No user authenticated'
    });
  } catch (error) {
    logger.error('Error in /me endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 