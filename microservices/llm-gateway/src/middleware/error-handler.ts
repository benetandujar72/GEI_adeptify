import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';

  // Log del error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Manejar errores específicos
  if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation error';
  }

  // Errores de LLM específicos
  if (error.provider) {
    const llmError = error as any;
    statusCode = llmError.statusCode || 500;
    code = llmError.code || 'LLM_ERROR';
    message = llmError.message || 'LLM provider error';
  }

  // Errores de rate limiting
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  }

  // Errores de autenticación
  if (error.code === 'AUTH_ERROR' || error.code === 'INVALID_TOKEN') {
    statusCode = 401;
    code = error.code;
    message = error.message;
  }

  // Errores de permisos
  if (error.code === 'INSUFFICIENT_PERMISSIONS') {
    statusCode = 403;
    code = error.code;
    message = error.message;
  }

  // Errores de recursos no encontrados
  if (error.code === 'NOT_FOUND') {
    statusCode = 404;
    code = error.code;
    message = error.message;
  }

  // Errores de conflicto
  if (error.code === 'CONFLICT') {
    statusCode = 409;
    code = error.code;
    message = error.message;
  }

  // Errores de validación
  if (error.code === 'VALIDATION_ERROR') {
    statusCode = 400;
    code = error.code;
    message = error.message;
  }

  // Errores de timeout
  if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
    statusCode = 408;
    code = 'TIMEOUT';
    message = 'Request timeout';
  }

  // Errores de conexión
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'Service temporarily unavailable';
  }

  // Construir respuesta de error
  const errorResponse: any = {
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString()
    }
  };

  // Agregar detalles adicionales en desarrollo
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    errorResponse.error.url = req.url;
    errorResponse.error.method = req.method;
  }

  // Agregar detalles específicos para errores de validación
  if (error instanceof ZodError) {
    errorResponse.error.details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  }

  // Agregar detalles específicos para errores de LLM
  if (error.provider) {
    const llmError = error as any;
    errorResponse.error.provider = llmError.provider;
    errorResponse.error.model = llmError.model;
    errorResponse.error.retryable = llmError.retryable;
  }

  // Agregar headers de retry si es apropiado
  if (code === 'RATE_LIMIT_EXCEEDED' || code === 'TIMEOUT') {
    res.set('Retry-After', '60');
  }

  // Enviar respuesta
  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      path: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (message: string, statusCode: number = 500, code?: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

export const createValidationError = (message: string, details?: any): AppError => {
  const error = createError(message, 400, 'VALIDATION_ERROR');
  if (details) {
    (error as any).details = details;
  }
  return error;
};

export const createAuthError = (message: string = 'Authentication required'): AppError => {
  return createError(message, 401, 'AUTH_ERROR');
};

export const createPermissionError = (message: string = 'Insufficient permissions'): AppError => {
  return createError(message, 403, 'INSUFFICIENT_PERMISSIONS');
};

export const createNotFoundError = (message: string = 'Resource not found'): AppError => {
  return createError(message, 404, 'NOT_FOUND');
};

export const createConflictError = (message: string = 'Resource conflict'): AppError => {
  return createError(message, 409, 'CONFLICT');
};

export const createRateLimitError = (message: string = 'Rate limit exceeded'): AppError => {
  return createError(message, 429, 'RATE_LIMIT_EXCEEDED');
};

export const createTimeoutError = (message: string = 'Request timeout'): AppError => {
  return createError(message, 408, 'TIMEOUT');
};

export const createServiceUnavailableError = (message: string = 'Service unavailable'): AppError => {
  return createError(message, 503, 'SERVICE_UNAVAILABLE');
};