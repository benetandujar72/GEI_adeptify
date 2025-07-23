import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

// TEMPORAL: Almacén de sesiones en memoria
const sessionStore = new Map();

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
      
      // Generar session ID único
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear sesión en nuestro almacén
      const sessionData = {
        userId: "1",
        userEmail: 'superadmin@gei.es',
        userRole: 'super_admin',
        createdAt: new Date().toISOString()
      };
      
      sessionStore.set(sessionId, sessionData);
      logger.info(`✅ Sesión creada con ID: ${sessionId}`);
      
      // Establecer cookie de sesión
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      return res.json({ 
        success: true,
        user: {
          id: "1",
          email: 'superadmin@gei.es',
          displayName: 'Super Administrador',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          instituteId: null
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
  logger.info('Auth /me endpoint called');
  
  // Obtener sessionId de la cookie
  const sessionId = req.cookies?.sessionId;
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
  
  logger.info('✅ Usuario autenticado encontrado en sesión');
  return res.json({
    user: {
      id: sessionData.userId,
      email: sessionData.userEmail,
      displayName: 'Super Administrador',
      firstName: 'Super',
      lastName: 'Admin',
      role: sessionData.userRole,
      instituteId: null
    }
  });
});

export default router; 