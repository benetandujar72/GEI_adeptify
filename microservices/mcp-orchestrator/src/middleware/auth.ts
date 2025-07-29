import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include user
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
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: string;
      permissions: string[];
      iat: number;
      exp: number;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: string;
      permissions: string[];
      iat: number;
      exp: number;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    // For optional auth, we just continue without setting req.user
    next();
  }
};

// Role-based middleware
export const requireAdmin = requireRole(['admin']);
export const requireUser = requireRole(['user', 'admin']);
export const requireService = requireRole(['service', 'admin']);

// Permission-based middleware
export const requireServiceManagement = requirePermission(['service:manage']);
export const requireContextManagement = requirePermission(['context:manage']);
export const requireAgentManagement = requirePermission(['agent:manage']);
export const requireWorkflowManagement = requirePermission(['workflow:manage']);
export const requireSystemAccess = requirePermission(['system:access']);