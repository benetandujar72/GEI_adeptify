import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      next(error);
    }
  };
};

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid path parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      next(error);
    }
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }

    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type header is required'
      });
    }

    const isValidType = allowedTypes.some(type => 
      contentType.includes(type)
    );

    if (!isValidType) {
      return res.status(415).json({
        success: false,
        error: `Unsupported Content-Type. Allowed: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
};

export const validateFileSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: `File size too large. Maximum allowed: ${maxSize} bytes`
      });
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  pagination: z.object({
    page: z.string().optional().transform(val => parseInt(val || '1')),
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  idParam: z.object({
    id: z.string().uuid()
  }),

  timeRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  searchQuery: z.object({
    q: z.string().min(1).max(100).optional(),
    filters: z.record(z.any()).optional()
  }),

  fileUpload: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number().positive(),
    buffer: z.instanceof(Buffer)
  })
};

// Custom validation functions
export const validateServiceName = (name: string): boolean => {
  return /^[a-z0-9-]+$/.test(name) && name.length >= 3 && name.length <= 50;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validatePriority = (priority: number): boolean => {
  return Number.isInteger(priority) && priority >= 1 && priority <= 10;
};

export const validateTimeout = (timeout: number): boolean => {
  return Number.isInteger(timeout) && timeout >= 1000 && timeout <= 300000;
};

export const validateContextType = (type: string): boolean => {
  const validTypes = ['user_session', 'learning_session', 'ai_interaction', 'system_operation'];
  return validTypes.includes(type);
};

export const validateAgentType = (type: string): boolean => {
  const validTypes = ['routing', 'context', 'ai_coordinator', 'load_balancer'];
  return validTypes.includes(type);
};