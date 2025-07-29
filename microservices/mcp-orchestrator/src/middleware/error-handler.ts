import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logError } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
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
  let details = error.details;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Handle rate limiting errors
  if (error.message && error.message.includes('Too many requests')) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  }

  // Handle authentication errors
  if (error.message && error.message.includes('Unauthorized')) {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Unauthorized access';
  }

  // Handle permission errors
  if (error.message && error.message.includes('Forbidden')) {
    statusCode = 403;
    code = 'FORBIDDEN';
    message = 'Access forbidden';
  }

  // Handle not found errors
  if (error.message && error.message.includes('not found')) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  // Handle conflict errors
  if (error.message && error.message.includes('already exists')) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Resource already exists';
  }

  // Handle timeout errors
  if (error.message && error.message.includes('timeout')) {
    statusCode = 408;
    code = 'TIMEOUT';
    message = 'Request timeout';
  }

  // Handle connection errors
  if (error.message && error.message.includes('ECONNREFUSED')) {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'Service unavailable';
  }

  // Log error
  logError(error, {
    url: req.url,
    method: req.method,
    statusCode,
    code,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error creation utilities
export const createError = (message: string, statusCode: number = 500, code?: string, details?: any): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

export const createValidationError = (message: string, details?: any): AppError => {
  return createError(message, 400, 'VALIDATION_ERROR', details);
};

export const createAuthError = (message: string): AppError => {
  return createError(message, 401, 'UNAUTHORIZED');
};

export const createPermissionError = (message: string): AppError => {
  return createError(message, 403, 'FORBIDDEN');
};

export const createNotFoundError = (message: string): AppError => {
  return createError(message, 404, 'NOT_FOUND');
};

export const createConflictError = (message: string): AppError => {
  return createError(message, 409, 'CONFLICT');
};

export const createTimeoutError = (message: string): AppError => {
  return createError(message, 408, 'TIMEOUT');
};

export const createServiceError = (message: string): AppError => {
  return createError(message, 503, 'SERVICE_UNAVAILABLE');
};

// Specific error types
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = 'UNAUTHORIZED';

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TimeoutError extends Error implements AppError {
  statusCode = 408;
  code = 'TIMEOUT';

  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}