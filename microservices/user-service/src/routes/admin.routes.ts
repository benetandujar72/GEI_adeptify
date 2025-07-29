import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { AuthService } from '../services/auth.service.js';

const router = Router();
const authService = new AuthService();

/**
 * @route GET /admin/users
 * @desc Obtener lista de usuarios (solo admin)
 * @access Private/Admin
 */
router.get('/users', [
  authMiddleware,
  roleMiddleware(['admin']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['student', 'teacher', 'admin']),
  query('status').optional().isIn(['active', 'inactive', 'pending']),
  validateRequest
], async (req: any, res) => {
  try {
    const { page = 1, limit = 10, role, status } = req.query;
    
    const users = await authService.getUsers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      role: role as string,
      status: status as string
    });
    
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
 * @route GET /admin/users/:id
 * @desc Obtener usuario específico (solo admin)
 * @access Private/Admin
 */
router.get('/users/:id', [
  authMiddleware,
  roleMiddleware(['admin'])
], async (req: any, res) => {
  try {
    const user = await authService.getUserById(req.params.id);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
});

/**
 * @route PUT /admin/users/:id/status
 * @desc Actualizar estado de usuario (solo admin)
 * @access Private/Admin
 */
router.put('/users/:id/status', [
  authMiddleware,
  roleMiddleware(['admin']),
  body('status').isIn(['active', 'inactive', 'suspended']),
  validateRequest
], async (req: any, res) => {
  try {
    const updatedUser = await authService.updateUserStatus(req.params.id, req.body.status);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user status'
    });
  }
});

/**
 * @route PUT /admin/users/:id/role
 * @desc Actualizar rol de usuario (solo admin)
 * @access Private/Admin
 */
router.put('/users/:id/role', [
  authMiddleware,
  roleMiddleware(['admin']),
  body('role').isIn(['student', 'teacher', 'admin']),
  validateRequest
], async (req: any, res) => {
  try {
    const updatedUser = await authService.updateUserRole(req.params.id, req.body.role);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user role'
    });
  }
});

/**
 * @route DELETE /admin/users/:id
 * @desc Eliminar usuario (solo admin)
 * @access Private/Admin
 */
router.delete('/users/:id', [
  authMiddleware,
  roleMiddleware(['admin'])
], async (req: any, res) => {
  try {
    await authService.deleteUser(req.params.id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user'
    });
  }
});

/**
 * @route GET /admin/audit-logs
 * @desc Obtener logs de auditoría (solo admin)
 * @access Private/Admin
 */
router.get('/audit-logs', [
  authMiddleware,
  roleMiddleware(['admin']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isUUID(),
  query('action').optional().isString(),
  validateRequest
], async (req: any, res) => {
  try {
    const { page = 1, limit = 10, userId, action } = req.query;
    
    const logs = await authService.getAuditLogs({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      userId: userId as string,
      action: action as string
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audit logs'
    });
  }
});

export default router;