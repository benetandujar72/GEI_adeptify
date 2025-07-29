import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Validation error'
        });
      }
    }
  };
};

export const validateBody = (schema: z.ZodSchema) => {
  return validateRequest({ body: schema });
};

export const validateQuery = (schema: z.ZodSchema) => {
  return validateRequest({ query: schema });
};

export const validateParams = (schema: z.ZodSchema) => {
  return validateRequest({ params: schema });
};

export const validatePartial = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.partial().parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Validation error'
        });
      }
    }
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Input sanitization error'
    });
  }
};

const sanitizeObject = (obj: any): any => {
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
};

const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    // Basic XSS prevention
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value);
  }
  
  return value;
};

export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      res.status(400).json({
        success: false,
        error: 'Content-Type header required'
      });
      return;
    }
    
    const isValid = allowedTypes.some(type => 
      contentType.includes(type)
    );
    
    if (!isValid) {
      res.status(415).json({
        success: false,
        error: `Unsupported content type. Allowed: ${allowedTypes.join(', ')}`
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
        error: `File size exceeds maximum allowed size of ${maxSize} bytes`
      });
      return;
    }
    
    next();
  };
};

// Common schemas for reuse
export const commonSchemas = {
  pagination: z.object({
    page: z.string().optional().transform(val => parseInt(val || '1')),
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    offset: z.string().optional().transform(val => parseInt(val || '0'))
  }),
  
  idParam: z.object({
    id: z.string().uuid()
  }),
  
  serverIdParam: z.object({
    serverId: z.string().uuid()
  }),
  
  timeRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }),
  
  search: z.object({
    query: z.string().min(1),
    filters: z.record(z.any()).optional()
  }),
  
  fileUpload: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number().positive()
  })
};

// Custom validation functions
export const validateServerType = (type: string): boolean => {
  const validTypes = [
    'file-system', 'git', 'search', 'database', 'web-browser',
    'image-generation', 'text-to-speech', 'speech-to-text',
    'calendar', 'email', 'weather', 'news', 'translation',
    'code-analysis', 'document-processing'
  ];
  return validTypes.includes(type);
};

export const validateServerStatus = (status: string): boolean => {
  const validStatuses = ['online', 'offline', 'error', 'maintenance'];
  return validStatuses.includes(status);
};

export const validateOperationType = (operation: string): boolean => {
  const validOperations = [
    'read', 'write', 'delete', 'list', 'search', 'create',
    'update', 'execute', 'generate', 'analyze', 'translate', 'process'
  ];
  return validOperations.includes(operation);
};

export const validateResourceType = (type: string): boolean => {
  const validTypes = [
    'file', 'directory', 'repository', 'database', 'web-page',
    'image', 'audio', 'calendar-event', 'email', 'weather-data',
    'news-article', 'translation', 'code-snippet', 'document'
  ];
  return validTypes.includes(type);
};

export const validateContentLength = (content: string, maxLength: number = 1000000): boolean => {
  return content.length <= maxLength;
};

export const validateContentStyle = (style: string): boolean => {
  const validStyles = ['formal', 'casual', 'technical', 'creative', 'academic'];
  return validStyles.includes(style);
};