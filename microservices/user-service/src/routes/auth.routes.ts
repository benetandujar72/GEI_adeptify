import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { body, validationResult } from 'express-validator';

const router = Router();
const authService = new AuthService();

// Middleware para obtener IP y User Agent
const getClientInfo = (req: any) => ({
  ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
  userAgent: req.headers['user-agent'],
});

// Middleware para manejar errores de validación
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * @route POST /auth/register
 * @desc Registrar un nuevo usuario
 * @access Public
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').isLength({ min: 2 }),
  body('role').isIn(['teacher', 'student', 'parent', 'staff']),
  body('firstName').optional().isLength({ min: 1 }),
  body('lastName').optional().isLength({ min: 1 }),
  body('instituteId').optional().isUUID(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { ipAddress, userAgent } = getClientInfo(req);
    
    const result = await authService.register(req.body, ipAddress, userAgent);
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

/**
 * @route POST /auth/login
 * @desc Autenticar usuario
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);
    
    const result = await authService.login(email, password, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

/**
 * @route POST /auth/refresh
 * @desc Renovar token de acceso
 * @access Public
 */
router.post('/refresh', [
  body('refreshToken').notEmpty(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);
    
    const result = await authService.refreshToken(refreshToken, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    });
  }
});

/**
 * @route POST /auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    const accessToken = authHeader.substring(7);
    const { ipAddress, userAgent } = getClientInfo(req);
    
    const result = await authService.logout(accessToken, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    });
  }
});

/**
 * @route GET /auth/verify
 * @desc Verificar token de acceso
 * @access Private
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    const accessToken = authHeader.substring(7);
    const user = await authService.verifyToken(accessToken);
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    });
  }
});

export default router; 