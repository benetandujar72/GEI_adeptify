import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET || 'default-secret';

    try {
      const decoded = jwt.verify(token, secret) as any;
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      next();
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
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
        error: 'Authentication required'
      });
      return;
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'default-secret';

      try {
        const decoded = jwt.verify(token, secret) as any;
        
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'user',
          permissions: decoded.permissions || []
        };
      } catch (jwtError) {
        // Token is invalid, but we continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Convenience middlewares
export const requireAdmin = requireRole(['admin']);
export const requireUser = requireRole(['user', 'admin']);
export const requireService = requireRole(['service', 'admin']);

// Specific permission middlewares
export const requireServerManagement = requirePermission(['server:manage']);
export const requireServerRead = requirePermission(['server:read']);
export const requireServerWrite = requirePermission(['server:write']);
export const requireServerDelete = requirePermission(['server:delete']);
export const requireMetricsRead = requirePermission(['metrics:read']);
export const requireEventsRead = requirePermission(['events:read']);