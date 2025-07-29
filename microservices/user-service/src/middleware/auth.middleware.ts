import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { AuthService } from '../services/auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

const authService = new AuthService();

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token required'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    // Add user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions
    };

    logger.info('User authenticated', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      url: req.url,
      method: req.method
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token'
      }
    });
  }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        url: req.url,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

export const permissionMiddleware = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
    }

    if (!req.user.permissions?.includes(requiredPermission)) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        userPermissions: req.user.permissions,
        requiredPermission,
        url: req.url,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Permission denied'
        }
      });
    }

    next();
  };
};