import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { AuthService } from '../services/auth.service.js';

const router = Router();
const authService = new AuthService();

/**
 * @route GET /search
 * @desc Buscar usuarios (solo para admins y profesores)
 * @access Private/Admin/Teacher
 */
router.get('/search', [
  authMiddleware,
  roleMiddleware(['admin', 'teacher']),
  query('q').optional().isLength({ min: 2 }),
  query('role').optional().isIn(['student', 'teacher', 'admin']),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest
], async (req: any, res) => {
  try {
    const { q, role, status, page = 1, limit = 10 } = req.query;

    const users = await authService.searchUsers({
      query: q as string,
      role: role as string,
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search users'
    });
  }
});

/**
 * @route GET /bulk
 * @desc Obtener múltiples usuarios por IDs
 * @access Private/Admin
 */
router.get('/bulk', [
  authMiddleware,
  roleMiddleware(['admin']),
  query('ids').isArray(),
  validateRequest
], async (req: any, res) => {
  try {
    const { ids } = req.query;
    const userIds = Array.isArray(ids) ? ids : [ids];

    const users = await authService.getUsersByIds(userIds);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get users'
    });
  }
});

/**
 * @route POST /bulk/status
 * @desc Actualizar estado de múltiples usuarios
 * @access Private/Admin
 */
router.post('/bulk/status', [
  authMiddleware,
  roleMiddleware(['admin']),
  body('userIds').isArray(),
  body('status').isIn(['active', 'inactive', 'suspended']),
  validateRequest
], async (req: any, res) => {
  try {
    const { userIds, status } = req.body;

    const result = await authService.updateUsersStatus(userIds, status);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update users status'
    });
  }
});

/**
 * @route GET /export
 * @desc Exportar datos de usuarios (solo para admins)
 * @access Private/Admin
 */
router.get('/export', [
  authMiddleware,
  roleMiddleware(['admin']),
  query('format').optional().isIn(['csv', 'json', 'xlsx']),
  query('filters').optional().isJSON(),
  validateRequest
], async (req: any, res) => {
  try {
    const { format = 'json', filters } = req.query;
    const parsedFilters = filters ? JSON.parse(filters as string) : {};

    const exportData = await authService.exportUsers(format as string, parsedFilters);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.${format}`);
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export users'
    });
  }
});

/**
 * @route GET /analytics
 * @desc Obtener analytics de usuarios (solo para admins)
 * @access Private/Admin
 */
router.get('/analytics', [
  authMiddleware,
  roleMiddleware(['admin']),
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  validateRequest
], async (req: any, res) => {
  try {
    const { period = 'month' } = req.query;

    const analytics = await authService.getUserAnalytics(period as string);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics'
    });
  }
});

/**
 * @route POST /notifications/test
 * @desc Enviar notificación de prueba al usuario
 * @access Private
 */
router.post('/notifications/test', [
  authMiddleware,
  body('type').isIn(['email', 'push', 'sms']),
  body('message').optional().isLength({ max: 500 }),
  validateRequest
], async (req: any, res) => {
  try {
    const { type, message } = req.body;

    await authService.sendTestNotification(req.user.id, type, message);

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test notification'
    });
  }
});

/**
 * @route GET /security/audit
 * @desc Obtener auditoría de seguridad del usuario
 * @access Private
 */
router.get('/security/audit', authMiddleware, async (req: any, res) => {
  try {
    const securityAudit = await authService.getSecurityAudit(req.user.id);

    res.json({
      success: true,
      data: securityAudit
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get security audit'
    });
  }
});

/**
 * @route POST /security/2fa/enable
 * @desc Habilitar autenticación de dos factores
 * @access Private
 */
router.post('/security/2fa/enable', authMiddleware, async (req: any, res) => {
  try {
    const twoFactorData = await authService.enableTwoFactor(req.user.id);

    res.json({
      success: true,
      data: twoFactorData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable 2FA'
    });
  }
});

/**
 * @route POST /security/2fa/disable
 * @desc Deshabilitar autenticación de dos factores
 * @access Private
 */
router.post('/security/2fa/disable', [
  authMiddleware,
  body('code').isLength({ min: 6, max: 6 }),
  validateRequest
], async (req: any, res) => {
  try {
    const { code } = req.body;

    await authService.disableTwoFactor(req.user.id, code);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable 2FA'
    });
  }
});

export default router;