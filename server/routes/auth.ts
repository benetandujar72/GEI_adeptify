import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { db } from '../index.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const router = Router();

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
    
    // Por ahora, solo aceptamos el superadmin con credenciales hardcoded
    if ((userIdentifier === 'superadmin@gei.es' || userIdentifier === 'superadmin') && 
        password === 'password123') {
      
      logger.info('✅ Login exitoso para super admin');
      
      // Establecer sesión
      req.session.userId = 1;
      req.session.userEmail = 'superadmin@gei.es';
      req.session.userRole = 'super_admin';
      
      // Guardar sesión antes de responder
      req.session.save((err) => {
        if (err) {
          logger.error('❌ Error guardando sesión:', err);
          return res.status(500).json({ 
            success: false,
            message: 'Error al guardar la sesión' 
          });
        }
        
        logger.info('✅ Sesión guardada correctamente');
        
        return res.json({ 
          success: true,
          user: {
            id: 1,
            email: 'superadmin@gei.es',
            displayName: 'Super Administrador',
            firstName: 'Super',
            lastName: 'Admin',
            role: 'super_admin',
            instituteId: null
          }
        });
      });
      
      return; // Importante: evitar continuar después de guardar sesión
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
  logger.info('Auth /me endpoint called');
  logger.info(`📋 Sesión: ${JSON.stringify({
    userId: req.session.userId,
    userEmail: req.session.userEmail,
    userRole: req.session.userRole
  })}`);
  
  // Verificar si hay sesión activa
  if (req.session.userId) {
    logger.info('✅ Usuario autenticado encontrado en sesión');
    return res.json({
      user: {
        id: req.session.userId.toString(),
        email: req.session.userEmail || 'superadmin@gei.es',
        displayName: 'Super Administrador',
        firstName: 'Super',
        lastName: 'Admin',
        role: req.session.userRole || 'super_admin',
        instituteId: null
      }
    });
  }
  
  logger.info('❌ No hay usuario autenticado en la sesión');
  res.status(401).json({ 
    message: 'No autenticado',
    sessionExists: !!req.session,
    sessionId: req.sessionID
  });
});

export default router; 