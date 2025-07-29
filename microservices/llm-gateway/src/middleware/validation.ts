import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '../utils/logger';

export const validateRequest = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Reemplazar los datos originales con los validados
      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error', { 
          errors: error.errors,
          path: req.path,
          method: req.method,
          ip: req.ip
        });

        res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        });
      } else {
        logger.error('Unexpected validation error:', error);
        res.status(500).json({
          success: false,
          error: {
            message: 'Internal validation error',
            code: 'INTERNAL_VALIDATION_ERROR'
          }
        });
      }
    }
  };
};

export const validatePartial = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.partial().parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Reemplazar solo los campos validados
      if (validatedData.body) req.body = { ...req.body, ...validatedData.body };
      if (validatedData.query) req.query = { ...req.query, ...validatedData.query };
      if (validatedData.params) req.params = { ...req.params, ...validatedData.params };

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Partial validation error', { 
          errors: error.errors,
          path: req.path,
          method: req.method
        });

        res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        });
      } else {
        logger.error('Unexpected partial validation error:', error);
        res.status(500).json({
          success: false,
          error: {
            message: 'Internal validation error',
            code: 'INTERNAL_VALIDATION_ERROR'
          }
        });
      }
    }
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitizar body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitizar query
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitizar params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Input sanitization error',
        code: 'SANITIZATION_ERROR'
      }
    });
  }
};

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeValue);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remover caracteres peligrosos y normalizar
    return value
      .trim()
      .replace(/[<>]/g, '') // Remover < y >
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, '') // Remover event handlers
      .substring(0, 10000); // Limitar longitud
  }

  if (typeof value === 'number') {
    // Validar que sea un número finito
    return isFinite(value) ? value : 0;
  }

  if (typeof value === 'boolean') {
    return Boolean(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value);
  }

  return value;
}

export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Content-Type header is required',
          code: 'CONTENT_TYPE_MISSING'
        }
      });
      return;
    }

    const isValidType = allowedTypes.some(type => 
      contentType.includes(type)
    );

    if (!isValidType) {
      res.status(415).json({
        success: false,
        error: {
          message: `Unsupported Content-Type. Allowed: ${allowedTypes.join(', ')}`,
          code: 'UNSUPPORTED_CONTENT_TYPE'
        }
      });
      return;
    }

    next();
  };
};

export const validateFileSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        error: {
          message: `Request too large. Maximum size: ${maxSize} bytes`,
          code: 'REQUEST_TOO_LARGE'
        }
      });
      return;
    }

    next();
  };
};