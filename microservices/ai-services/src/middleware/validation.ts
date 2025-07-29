import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { aiLogger } from '../utils/logger';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        aiLogger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Request data is invalid',
          details: validationErrors
        });
      }

      aiLogger.error('Validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during validation'
      });
    }
  };
};

/**
 * Middleware to validate request query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        aiLogger.warn('Query validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          message: 'Query parameters are invalid',
          details: validationErrors
        });
      }

      aiLogger.error('Query validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during query validation'
      });
    }
  };
};

/**
 * Middleware to validate request parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        aiLogger.warn('Params validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Parameters validation failed',
          message: 'URL parameters are invalid',
          details: validationErrors
        });
      }

      aiLogger.error('Params validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during parameters validation'
      });
    }
  };
};

/**
 * Middleware to validate partial request data
 */
export const validatePartial = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.partial().parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        aiLogger.warn('Partial validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Partial validation failed',
          message: 'Request data is invalid',
          details: validationErrors
        });
      }

      aiLogger.error('Partial validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during partial validation'
      });
    }
  };
};

/**
 * Middleware to sanitize input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
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
    aiLogger.error('Input sanitization failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({
      success: false,
      error: 'Input sanitization failed',
      message: 'An error occurred during input sanitization'
    });
  }
};

/**
 * Middleware to validate content type
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing Content-Type',
        message: 'Content-Type header is required'
      });
    }

    const isValidType = allowedTypes.some(type => 
      contentType.includes(type)
    );

    if (!isValidType) {
      aiLogger.warn('Invalid content type', {
        contentType,
        allowedTypes,
        path: req.path,
        method: req.method
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid Content-Type',
        message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to validate file size
 */
export const validateFileSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      aiLogger.warn('File size exceeded', {
        contentLength,
        maxSize,
        path: req.path,
        method: req.method
      });

      return res.status(413).json({
        success: false,
        error: 'File too large',
        message: `File size exceeds maximum allowed size of ${maxSize} bytes`
      });
    }

    next();
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize an object by removing potentially dangerous content
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a single value
 */
function sanitizeValue(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove potentially dangerous HTML/script tags
  let sanitized = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  // Pagination schema
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // ID parameter schema
  idParam: z.object({
    id: z.string().min(1, 'ID is required')
  }),

  // Model ID parameter schema
  modelIdParam: z.object({
    modelId: z.string().min(1, 'Model ID is required')
  }),

  // User ID parameter schema
  userIdParam: z.object({
    userId: z.string().min(1, 'User ID is required')
  }),

  // Course ID parameter schema
  courseIdParam: z.object({
    courseId: z.string().min(1, 'Course ID is required')
  }),

  // Time range schema
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).refine(data => new Date(data.start) < new Date(data.end), {
    message: 'Start date must be before end date'
  }),

  // Search query schema
  searchQuery: z.object({
    q: z.string().min(1, 'Search query is required').max(500),
    filters: z.record(z.any()).optional()
  }),

  // File upload schema
  fileUpload: z.object({
    file: z.any(),
    type: z.enum(['pdf', 'docx', 'txt', 'csv', 'xlsx', 'image']),
    size: z.number().max(10 * 1024 * 1024) // 10MB max
  })
};

// ============================================================================
// CUSTOM VALIDATION FUNCTIONS
// ============================================================================

/**
 * Custom validation function for AI model types
 */
export const validateModelType = (type: string): boolean => {
  const validTypes = ['regression', 'classification', 'clustering', 'nlp', 'recommendation'];
  return validTypes.includes(type);
};

/**
 * Custom validation function for content types
 */
export const validateContentType = (type: string): boolean => {
  const validTypes = ['lesson', 'quiz', 'exercise', 'summary', 'explanation', 'transcript'];
  return validTypes.includes(type);
};

/**
 * Custom validation function for analytics types
 */
export const validateAnalyticsType = (type: string): boolean => {
  const validTypes = ['performance', 'engagement', 'progress', 'prediction', 'recommendation'];
  return validTypes.includes(type);
};

/**
 * Custom validation function for personalization types
 */
export const validatePersonalizationType = (type: string): boolean => {
  const validTypes = ['content', 'difficulty', 'pace', 'style', 'recommendation'];
  return validTypes.includes(type);
};

/**
 * Custom validation function for difficulty levels
 */
export const validateDifficultyLevel = (level: string): boolean => {
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  return validLevels.includes(level);
};

/**
 * Custom validation function for content length
 */
export const validateContentLength = (length: string): boolean => {
  const validLengths = ['short', 'medium', 'long'];
  return validLengths.includes(length);
};

/**
 * Custom validation function for content style
 */
export const validateContentStyle = (style: string): boolean => {
  const validStyles = ['formal', 'casual', 'academic', 'conversational'];
  return validStyles.includes(style);
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  validateRequest,
  validateQuery,
  validateParams,
  validatePartial,
  sanitizeInput,
  validateContentType,
  validateFileSize,
  commonSchemas
};