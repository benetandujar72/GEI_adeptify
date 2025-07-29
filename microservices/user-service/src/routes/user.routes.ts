import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { AuthService } from '../services/auth.service.js';

const router = Router();
const authService = new AuthService();

/**
 * @route GET /profile
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/profile', authMiddleware, async (req: any, res) => {
  try {
    const user = await authService.getUserById(req.user.id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
});

/**
 * @route PUT /profile
 * @desc Actualizar perfil del usuario
 * @access Private
 */
router.put('/profile', [
  authMiddleware,
  body('firstName').optional().isLength({ min: 1 }),
  body('lastName').optional().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone(),
  body('bio').optional().isLength({ max: 500 }),
  body('avatar').optional().isURL(),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']),
  body('location').optional().isLength({ max: 100 }),
  body('website').optional().isURL(),
  validateRequest
], async (req: any, res) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    });
  }
});

/**
 * @route POST /change-password
 * @desc Cambiar contraseña del usuario
 * @access Private
 */
router.post('/change-password', [
  authMiddleware,
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 }),
  body('confirmPassword').isLength({ min: 6 }),
  validateRequest
], async (req: any, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'New passwords do not match'
        }
      });
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
});

/**
 * @route POST /logout
 * @desc Cerrar sesión del usuario
 * @access Private
 */
router.post('/logout', authMiddleware, async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      await authService.logout(token, req.user.id);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to logout'
    });
  }
});

/**
 * @route GET /preferences
 * @desc Obtener preferencias del usuario
 * @access Private
 */
router.get('/preferences', authMiddleware, async (req: any, res) => {
  try {
    const preferences = await authService.getUserPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get preferences'
    });
  }
});

/**
 * @route PUT /preferences
 * @desc Actualizar preferencias del usuario
 * @access Private
 */
router.put('/preferences', [
  authMiddleware,
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('language').optional().isIn(['es', 'en', 'ca']),
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
  body('privacy.profileVisibility').optional().isIn(['public', 'private', 'friends']),
  body('privacy.showEmail').optional().isBoolean(),
  body('privacy.showPhone').optional().isBoolean(),
  validateRequest
], async (req: any, res) => {
  try {
    const preferences = await authService.updateUserPreferences(req.user.id, req.body);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences'
    });
  }
});

/**
 * @route GET /sessions
 * @desc Obtener sesiones activas del usuario
 * @access Private
 */
router.get('/sessions', authMiddleware, async (req: any, res) => {
  try {
    const sessions = await authService.getUserSessions(req.user.id);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sessions'
    });
  }
});

/**
 * @route DELETE /sessions/:sessionId
 * @desc Terminar una sesión específica
 * @access Private
 */
router.delete('/sessions/:sessionId', authMiddleware, async (req: any, res) => {
  try {
    await authService.terminateSession(req.user.id, req.params.sessionId);

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to terminate session'
    });
  }
});

/**
 * @route DELETE /sessions
 * @desc Terminar todas las sesiones excepto la actual
 * @access Private
 */
router.delete('/sessions', authMiddleware, async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.substring(7);

    await authService.terminateAllSessions(req.user.id, currentToken);

    res.json({
      success: true,
      message: 'All other sessions terminated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to terminate sessions'
    });
  }
});

/**
 * @route GET /activity
 * @desc Obtener actividad reciente del usuario
 * @access Private
 */
router.get('/activity', [
  authMiddleware,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isIn(['login', 'profile_update', 'password_change', 'all']),
  validateRequest
], async (req: any, res) => {
  try {
    const { page = 1, limit = 10, type = 'all' } = req.query;

    const activity = await authService.getUserActivity(req.user.id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as string
    });

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get activity'
    });
  }
});

/**
 * @route POST /avatar
 * @desc Subir avatar del usuario
 * @access Private
 */
router.post('/avatar', authMiddleware, async (req: any, res) => {
  try {
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Avatar URL is required'
        }
      });
    }

    const updatedUser = await authService.updateAvatar(req.user.id, avatarUrl);

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update avatar'
    });
  }
});

/**
 * @route DELETE /avatar
 * @desc Eliminar avatar del usuario
 * @access Private
 */
router.delete('/avatar', authMiddleware, async (req: any, res) => {
  try {
    const updatedUser = await authService.removeAvatar(req.user.id);

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove avatar'
    });
  }
});

/**
 * @route GET /stats
 * @desc Obtener estadísticas del usuario
 * @access Private
 */
router.get('/stats', authMiddleware, async (req: any, res) => {
  try {
    const stats = await authService.getUserStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
});

export default router;