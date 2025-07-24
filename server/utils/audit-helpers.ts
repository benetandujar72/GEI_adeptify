import { auditService } from '../services/audit-service.js';
import { logger } from './logger.js';

/**
 * Función helper para registrar acciones de CRUD automáticamente
 */
export const auditCRUD = {
  /**
   * Registra una acción de creación
   */
  async create(resource: string, data: any, req: any): Promise<void> {
    try {
      await auditService.logCreate(
        resource,
        data,
        req.user?.id,
        req.user?.instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging CREATE action:', error);
    }
  },

  /**
   * Registra una acción de lectura
   */
  async read(resource: string, filters: any, req: any): Promise<void> {
    try {
      await auditService.logRead(
        resource,
        filters,
        req.user?.id,
        req.user?.instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging READ action:', error);
    }
  },

  /**
   * Registra una acción de actualización
   */
  async update(resource: string, id: string, oldData: any, newData: any, req: any): Promise<void> {
    try {
      await auditService.logUpdate(
        resource,
        id,
        oldData,
        newData,
        req.user?.id,
        req.user?.instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging UPDATE action:', error);
    }
  },

  /**
   * Registra una acción de eliminación
   */
  async delete(resource: string, id: string, deletedData: any, req: any): Promise<void> {
    try {
      await auditService.logDelete(
        resource,
        id,
        deletedData,
        req.user?.id,
        req.user?.instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging DELETE action:', error);
    }
  },
};

/**
 * Función helper para registrar acciones de autenticación
 */
export const auditAuth = {
  /**
   * Registra un login exitoso
   */
  async login(userId: string, instituteId: string, req: any): Promise<void> {
    try {
      await auditService.logLogin(
        userId,
        instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging LOGIN action:', error);
    }
  },

  /**
   * Registra un intento de login fallido
   */
  async loginFailed(email: string, req: any): Promise<void> {
    try {
      await auditService.logLoginFailed(
        email,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging LOGIN_FAILED action:', error);
    }
  },

  /**
   * Registra un logout
   */
  async logout(userId: string, instituteId: string, req: any): Promise<void> {
    try {
      await auditService.logLogout(
        userId,
        instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging LOGOUT action:', error);
    }
  },
};

/**
 * Función helper para registrar exportaciones e importaciones
 */
export const auditData = {
  /**
   * Registra una exportación
   */
  async export(resource: string, format: string, filters: any, req: any): Promise<void> {
    try {
      await auditService.logExport(
        resource,
        format,
        filters,
        req.user?.id,
        req.user?.instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging EXPORT action:', error);
    }
  },

  /**
   * Registra una importación
   */
  async import(resource: string, format: string, recordCount: number, req: any): Promise<void> {
    try {
      await auditService.logImport(
        resource,
        format,
        recordCount,
        req.user?.id,
        req.user?.instituteId,
        getClientIP(req),
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Error logging IMPORT action:', error);
    }
  },
};

/**
 * Función helper para registrar acciones personalizadas
 */
export const auditCustom = {
  /**
   * Registra una acción personalizada
   */
  async action(action: string, resource: string, details: any, req: any): Promise<void> {
    try {
      await auditService.logAction({
        userId: req.user?.id,
        instituteId: req.user?.instituteId,
        action,
        resource,
        details,
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent'),
      });
    } catch (error) {
      logger.error('Error logging custom action:', error);
    }
  },

  /**
   * Registra un cambio de contraseña
   */
  async passwordChange(userId: string, instituteId: string, req: any): Promise<void> {
    await this.action('PASSWORD_CHANGE', 'auth', { userId }, req);
  },

  /**
   * Registra una actualización de perfil
   */
  async profileUpdate(userId: string, instituteId: string, changes: any, req: any): Promise<void> {
    await this.action('PROFILE_UPDATE', 'users', { userId, changes }, req);
  },

  /**
   * Registra un cambio de configuración
   */
  async settingsChange(userId: string, instituteId: string, settings: any, req: any): Promise<void> {
    await this.action('SETTINGS_CHANGE', 'settings', { userId, settings }, req);
  },
};

/**
 * Obtiene la IP real del cliente
 */
function getClientIP(req: any): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Función helper para crear un wrapper de auditoría para funciones
 */
export function withAudit<T extends any[], R>(
  action: string,
  resource: string,
  fn: (...args: T) => Promise<R>
) {
  return async (req: any, ...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      
      // Registrar acción exitosa
      await auditService.logAction({
        userId: req.user?.id,
        instituteId: req.user?.instituteId,
        action,
        resource,
        details: {
          success: true,
          duration: Date.now() - startTime,
          result: typeof result === 'object' ? 'object' : typeof result,
        },
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent'),
      });
      
      return result;
    } catch (error) {
      // Registrar acción fallida
      await auditService.logAction({
        userId: req.user?.id,
        instituteId: req.user?.instituteId,
        action,
        resource,
        details: {
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent'),
      });
      
      throw error;
    }
  };
}

/**
 * Función helper para crear un decorador de auditoría para métodos de clase
 */
export function auditMethod(action: string, resource: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const req = args.find(arg => arg && typeof arg === 'object' && arg.headers);
      
      try {
        const result = await method.apply(this, args);
        
        // Registrar acción exitosa
        if (req) {
          await auditService.logAction({
            userId: req.user?.id,
            instituteId: req.user?.instituteId,
            action,
            resource,
            details: {
              success: true,
              duration: Date.now() - startTime,
              method: propertyName,
            },
            ipAddress: getClientIP(req),
            userAgent: req.get('User-Agent'),
          });
        }
        
        return result;
      } catch (error) {
        // Registrar acción fallida
        if (req) {
          await auditService.logAction({
            userId: req.user?.id,
            instituteId: req.user?.instituteId,
            action,
            resource,
            details: {
              success: false,
              duration: Date.now() - startTime,
              method: propertyName,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            ipAddress: getClientIP(req),
            userAgent: req.get('User-Agent'),
          });
        }
        
        throw error;
      }
    };
  };
} 