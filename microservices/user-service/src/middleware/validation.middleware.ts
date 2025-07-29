import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Esquemas de validación comunes
export const CommonSchemas = {
  // Validación de email
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email demasiado corto')
    .max(254, 'Email demasiado largo')
    .transform(val => val.toLowerCase().trim()),

  // Validación de contraseña
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número')
    .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/, 'La contraseña contiene caracteres no permitidos'),

  // Validación de nombre
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre es demasiado largo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'El nombre solo puede contener letras y espacios')
    .transform(val => val.trim().replace(/\s+/g, ' ')),

  // Validación de UUID
  uuid: z.string()
    .uuid('ID inválido'),

  // Validación de paginación
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // Validación de búsqueda
  search: z.object({
    query: z.string().min(1, 'Query de búsqueda requerida').max(100, 'Query demasiado larga'),
    filters: z.record(z.any()).optional()
  })
};

// Esquemas específicos para usuarios
export const UserSchemas = {
  // Registro de usuario
  register: z.object({
    email: CommonSchemas.email,
    password: CommonSchemas.password,
    firstName: CommonSchemas.name,
    lastName: CommonSchemas.name,
    role: z.enum(['student', 'teacher', 'admin']).default('student'),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Número de teléfono inválido').optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
    preferences: z.object({
      language: z.enum(['es', 'ca', 'en']).default('es'),
      theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      notifications: z.object({
        email: z.boolean().default(true),
        push: z.boolean().default(true),
        sms: z.boolean().default(false)
      }).default({})
    }).optional()
  }),

  // Login
  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Contraseña requerida'),
    rememberMe: z.boolean().default(false),
    deviceInfo: z.object({
      userAgent: z.string().optional(),
      ip: z.string().optional(),
      deviceId: z.string().optional()
    }).optional()
  }),

  // Actualización de perfil
  updateProfile: z.object({
    firstName: CommonSchemas.name.optional(),
    lastName: CommonSchemas.name.optional(),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Número de teléfono inválido').optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
    avatar: z.string().url('URL de avatar inválida').optional(),
    bio: z.string().max(500, 'Biografía demasiado larga').optional(),
    preferences: z.object({
      language: z.enum(['es', 'ca', 'en']).optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      notifications: z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional()
      }).optional()
    }).optional()
  }),

  // Cambio de contraseña
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Contraseña actual requerida'),
    newPassword: CommonSchemas.password,
    confirmPassword: z.string().min(1, 'Confirmación de contraseña requerida')
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }),

  // Recuperación de contraseña
  forgotPassword: z.object({
    email: CommonSchemas.email
  }),

  // Reset de contraseña
  resetPassword: z.object({
    token: z.string().min(1, 'Token requerido'),
    newPassword: CommonSchemas.password,
    confirmPassword: z.string().min(1, 'Confirmación de contraseña requerida')
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  })
};

// Esquemas para administración
export const AdminSchemas = {
  // Crear usuario (admin)
  createUser: UserSchemas.register.extend({
    role: z.enum(['student', 'teacher', 'admin']),
    isActive: z.boolean().default(true),
    permissions: z.array(z.string()).optional()
  }),

  // Actualizar usuario (admin)
  updateUser: z.object({
    firstName: CommonSchemas.name.optional(),
    lastName: CommonSchemas.name.optional(),
    email: CommonSchemas.email.optional(),
    role: z.enum(['student', 'teacher', 'admin']).optional(),
    isActive: z.boolean().optional(),
    permissions: z.array(z.string()).optional(),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Número de teléfono inválido').optional()
  }),

  // Listar usuarios
  listUsers: CommonSchemas.pagination.extend({
    search: z.string().optional(),
    role: z.enum(['student', 'teacher', 'admin']).optional(),
    isActive: z.boolean().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional()
  })
};

// Función para sanitizar datos
function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return data.trim().replace(/\s+/g, ' ');
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  return data;
}

// Middleware de validación genérico
export function validateSchema(schema: z.ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const sanitizedData = sanitizeData(data);
      
      const result = schema.safeParse(sanitizedData);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });

        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors
          }
        });
      }

      // Reemplazar datos con datos validados
      req[target] = result.data;
      
      logger.debug('Validation successful', {
        path: req.path,
        method: req.method,
        fields: Object.keys(result.data)
      });

      next();
    } catch (error) {
      logger.error('Validation middleware error', { error });
      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal validation error'
        }
      });
    }
  };
}

// Middleware para validar IDs
export function validateId(paramName: string = 'id') {
  return validateSchema(
    z.object({ [paramName]: CommonSchemas.uuid }),
    'params'
  );
}

// Middleware para validar paginación
export function validatePagination() {
  return validateSchema(CommonSchemas.pagination, 'query');
}

// Middleware para validar búsqueda
export function validateSearch() {
  return validateSchema(CommonSchemas.search, 'query');
}

// Middleware para sanitizar headers
export function sanitizeHeaders(req: Request, res: Response, next: NextFunction) {
  // Sanitizar headers sensibles
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  for (const header of sensitiveHeaders) {
    if (req.headers[header]) {
      const value = req.headers[header] as string;
      if (value.length > 1000) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Header value too long'
          }
        });
      }
    }
  }

  next();
}

// Middleware para validar Content-Type
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Content-Type header required'
        }
      });
    }

    const isValidType = allowedTypes.some(type => 
      contentType.includes(type)
    );

    if (!isValidType) {
      return res.status(415).json({
        success: false,
        error: {
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
        }
      });
    }

    next();
  };
}