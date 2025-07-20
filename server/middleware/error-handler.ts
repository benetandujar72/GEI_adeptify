import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Middleware de manejo de errores
 */
export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log del error
  logger.error('❌ Error en la aplicación:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determinar el código de estado
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // En desarrollo, enviar stack trace completo
  const errorResponse = {
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  };

  // En producción, no enviar detalles sensibles
  if (process.env.NODE_ENV === 'production') {
    if (statusCode === 500) {
      errorResponse.message = 'Error interno del servidor';
    }
  }

  // Enviar respuesta
  res.status(statusCode).json({
    success: false,
    error: errorResponse
  });

  // Si es un error operacional, no terminar el proceso
  if (!isOperational) {
    logger.error('💥 Error no operacional detectado, terminando proceso...');
    process.exit(1);
  }
}

/**
 * Middleware para capturar errores asíncronos
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Crear error personalizado
 */
export function createError(message: string, statusCode: number = 500): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

/**
 * Middleware para manejar rutas no encontradas
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn(`⚠️ Ruta no encontrada: ${req.method} ${req.url}`);
  
  res.status(404).json({
    success: false,
    error: {
      message: 'Ruta no encontrada',
      path: req.url,
      method: req.method
    }
  });
} 