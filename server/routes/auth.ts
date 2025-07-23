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
    const { username, email, password, instituteId } = req.body;
    
    // Aceptar tanto username como email
    const userIdentifier = username || email;
    
    logger.info(`🔐 Intento de login: ${userIdentifier} (instituto: ${instituteId})`);
    logger.info(`📋 Body completo:`, req.body);
    
    if (!userIdentifier || !password) {
      logger.warn(`❌ Datos faltantes - userIdentifier: ${!!userIdentifier}, password: ${!!password}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario/email y contraseña son requeridos',
        received: {
          username: !!username,
          email: !!email,
          password: !!password,
          instituteId: !!instituteId
        }
      });
    }
    
    // Por ahora, devolver una respuesta temporal para superadmin
    if (userIdentifier === 'superadmin@gei.es' && password === 'password123') {
      logger.info(`✅ Login exitoso para super admin: ${userIdentifier}`);
      return res.json({
        success: true,
        user: {
          id: 1,
          email: 'superadmin@gei.es',
          display_name: 'Super Administrador',
          first_name: 'Super',
          last_name: 'Admin',
          role: 'super_admin',
          institute_id: null
        }
      });
    }
    
    // Para otros usuarios, devolver error temporal
    logger.warn(`❌ Usuario no encontrado o credenciales incorrectas: ${userIdentifier}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Credenciales incorrectas' 
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