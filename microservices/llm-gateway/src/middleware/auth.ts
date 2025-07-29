import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authorization header missing',
          code: 'AUTH_HEADER_MISSING'
        }
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Token missing',
          code: 'TOKEN_MISSING'
        }
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Invalid token', { error: err.message, ip: req.ip });
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
          }
        });
        return;
      }

      // Agregar información del usuario a la request
      req.user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      logger.debug('User authenticated', { 
        userId: req.user.id, 
        email: req.user.email, 
        role: req.user.role 
      });

      next();
    });

  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR'
      }
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
      return;
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Insufficient permissions', { 
        userId: req.user.id, 
        userPermissions: req.user.permissions, 
        requiredPermissions: permissions 
      });
      
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
      return;
    }

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (err) {
        logger.debug('Optional auth failed, continuing without user', { error: err.message });
        next();
        return;
      }

      // Agregar información del usuario a la request
      req.user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      logger.debug('Optional auth successful', { 
        userId: req.user.id, 
        email: req.user.email 
      });

      next();
    });

  } catch (error: any) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};