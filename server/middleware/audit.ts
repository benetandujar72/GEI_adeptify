import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit-service.js';
import { logger } from '../utils/logger.js';

export interface AuditRequest extends Request {
  auditData?: {
    resource: string;
    action: string;
    details?: Record<string, any>;
  };
}

/**
 * Middleware para registrar automáticamente acciones de auditoría
 */
export const auditMiddleware = (resource: string, action?: string) => {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Guardar información de auditoría en el request
    req.auditData = {
      resource,
      action: action || getActionFromMethod(req.method),
      details: {
        path: req.path,
        method: req.method,
        query: req.query,
        body: sanitizeBody(req.body),
      },
    };

    // Interceptar la respuesta para registrar el resultado
    const originalSend = res.send;
    res.send = function(data) {
      // Registrar la acción después de que se complete
      setTimeout(() => {
        logAuditAction(req, res, data);
      }, 0);

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para registrar acciones CRUD específicas
 */
export const auditCRUD = (resource: string) => {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    const action = getCRUDAction(req.method, req.path);
    
    req.auditData = {
      resource,
      action,
      details: {
        path: req.path,
        method: req.method,
        id: req.params.id,
        query: req.query,
        body: sanitizeBody(req.body),
      },
    };

    // Interceptar la respuesta
    const originalSend = res.send;
    res.send = function(data) {
      setTimeout(() => {
        logAuditAction(req, res, data);
      }, 0);

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para registrar exportaciones
 */
export const auditExport = (resource: string) => {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    req.auditData = {
      resource,
      action: 'EXPORT',
      details: {
        format: req.query.format || 'unknown',
        filters: req.query,
        path: req.path,
      },
    };

    const originalSend = res.send;
    res.send = function(data) {
      setTimeout(() => {
        logAuditAction(req, res, data);
      }, 0);

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para registrar importaciones
 */
export const auditImport = (resource: string) => {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    req.auditData = {
      resource,
      action: 'IMPORT',
      details: {
        format: req.query.format || 'unknown',
        recordCount: req.body?.length || 0,
        path: req.path,
      },
    };

    const originalSend = res.send;
    res.send = function(data) {
      setTimeout(() => {
        logAuditAction(req, res, data);
      }, 0);

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para registrar autenticación
 */
export const auditAuth = () => {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    const isLogin = req.path.includes('/login') || req.path.includes('/auth');
    const isLogout = req.path.includes('/logout');
    
    if (isLogin || isLogout) {
      req.auditData = {
        resource: 'auth',
        action: isLogin ? 'LOGIN' : 'LOGOUT',
        details: {
          path: req.path,
          method: req.method,
          email: req.body?.email,
        },
      };

      const originalSend = res.send;
      res.send = function(data) {
        setTimeout(() => {
          logAuditAction(req, res, data);
        }, 0);

        return originalSend.call(this, data);
      };
    }

    next();
  };
};

/**
 * Función auxiliar para registrar la acción de auditoría
 */
async function logAuditAction(req: AuditRequest, res: Response, responseData: any) {
  try {
    if (!req.auditData) return;

    const user = (req as any).user;
    const userId = user?.id;
    const instituteId = user?.instituteId;

    // Obtener información del cliente
    const ipAddress = getClientIP(req);
    const userAgent = req.get('User-Agent');

    // Determinar si la acción fue exitosa
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    
    // Añadir información de respuesta al detalle
    const details = {
      ...req.auditData.details,
      statusCode: res.statusCode,
      success: isSuccess,
      responseSize: typeof responseData === 'string' ? responseData.length : 0,
    };

    // Registrar la acción
    await auditService.logAction({
      userId,
      instituteId,
      action: req.auditData.action,
      resource: req.auditData.resource,
      details,
      ipAddress,
      userAgent,
    });

  } catch (error) {
    logger.error('Error in audit middleware:', error);
    // No lanzamos el error para no interrumpir el flujo
  }
}

/**
 * Obtiene la acción basada en el método HTTP
 */
function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'READ';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Obtiene la acción CRUD basada en el método y la ruta
 */
function getCRUDAction(method: string, path: string): string {
  const isIdPath = /\/([^\/]+)$/.test(path) && !path.includes('/search') && !path.includes('/stats');
  
  switch (method.toUpperCase()) {
    case 'GET':
      return isIdPath ? 'READ_ONE' : 'READ_LIST';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Obtiene la IP real del cliente
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Sanitiza el body para eliminar información sensible
 */
function sanitizeBody(body: any): any {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Función helper para registrar acciones manualmente
 */
export const logManualAction = async (
  req: Request,
  action: string,
  resource: string,
  details?: Record<string, any>
) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const instituteId = user?.instituteId;
    const ipAddress = getClientIP(req);
    const userAgent = req.get('User-Agent');

    await auditService.logAction({
      userId,
      instituteId,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error('Error logging manual action:', error);
  }
}; 