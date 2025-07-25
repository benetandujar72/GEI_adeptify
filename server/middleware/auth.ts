import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware para verificar si el usuario está autenticado
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      logger.warn(`🔒 Accés denegat: usuari no autenticat - ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'No autenticat',
        message: 'Has d\'iniciar sessió per accedir a aquest recurs'
      });
    }

    logger.info(`✅ Usuari autenticat: ${req.user?.id} - ${req.method} ${req.path}`);
    next();
  } catch (error) {
    logger.error('❌ Error en middleware d\'autenticació:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
}

/**
 * Middleware para verificar roles específicos
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        logger.warn(`🔒 Accés denegat: usuari no autenticat - ${req.method} ${req.path}`);
        return res.status(401).json({
          success: false,
          error: 'No autenticat',
          message: 'Has d\'iniciar sessió per accedir a aquest recurs'
        });
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`🔒 Accés denegat: rol insuficient - ${userRole} - ${req.method} ${req.path}`);
        return res.status(403).json({
          success: false,
          error: 'Accés denegat',
          message: 'No tens permisos per accedir a aquest recurs',
          requiredRoles: allowedRoles,
          userRole: userRole
        });
      }

      logger.info(`✅ Accés autoritzat: ${userRole} - ${req.method} ${req.path}`);
      next();
    } catch (error) {
      logger.error('❌ Error en middleware d\'autorització:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  };
}

/**
 * Middleware para verificar que el usuario pertenece al mismo instituto
 */
export function requireSameInstitute(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticat'
      });
    }

    const userInstituteId = req.user.instituteId;
    const targetInstituteId = req.params.instituteId || req.body.instituteId;

    if (!targetInstituteId) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'institut requerit'
      });
    }

    if (userInstituteId !== targetInstituteId && req.user.role !== 'admin') {
      logger.warn(`🔒 Accés denegat: institut diferent - ${req.user.id} - ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        error: 'Accés denegat',
        message: 'No pots accedir a recursos d\'un altre institut'
      });
    }

    next();
  } catch (error) {
    logger.error('❌ Error en middleware d\'institut:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
}

/**
 * Middleware para verificar que el usuario es propietario del recurso
 */
export function requireOwnership(resourceType: string, idParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'No autenticat'
        });
      }

      const resourceId = req.params[idParam];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: `ID de ${resourceType} requerit`
        });
      }

      // Los administradores pueden acceder a cualquier recurso
      if (req.user.role === 'admin' || req.user.role === 'institute_admin') {
        return next();
      }

      // Para otros roles, verificar que el recurso pertenece al usuario
      if (req.user.id !== resourceId) {
        logger.warn(`🔒 Accés denegat: propietari diferent - ${req.user.id} - ${resourceType} ${resourceId}`);
        return res.status(403).json({
          success: false,
          error: 'Accés denegat',
          message: `No pots accedir a aquest ${resourceType}`
        });
      }

      next();
    } catch (error) {
      logger.error('❌ Error en middleware de propietat:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  };
}

/**
 * Middleware para logging de requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
}

/**
 * Alias para isAuthenticated - para compatibilidad con código existente
 */
export const requireAuth = isAuthenticated;

/**
 * Alias para isAuthenticated - para compatibilidad con código existente
 */
export const authenticateToken = isAuthenticated; 