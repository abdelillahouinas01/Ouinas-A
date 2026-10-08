// Error handling middleware
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Common error types
export const Errors = {
  UNAUTHORIZED: (message = 'Unauthorized') =>
    new AppError(401, 'UNAUTHORIZED', message),

  FORBIDDEN: (message = 'Access forbidden') =>
    new AppError(403, 'FORBIDDEN', message),

  NOT_FOUND: (message = 'Resource not found') =>
    new AppError(404, 'NOT_FOUND', message),

  VALIDATION_ERROR: (message = 'Validation failed', details?: any) =>
    new AppError(400, 'VALIDATION_ERROR', message, details),

  CONFLICT: (message = 'Resource conflict') =>
    new AppError(409, 'CONFLICT', message),

  RATE_LIMIT: (message = 'Too many requests') =>
    new AppError(429, 'RATE_LIMIT', message),

  INSUFFICIENT_CREDITS: (message = 'Insufficient credits') =>
    new AppError(402, 'INSUFFICIENT_CREDITS', message),

  INTERNAL_ERROR: (message = 'Internal server error') =>
    new AppError(500, 'INTERNAL_ERROR', message),

  SERVICE_UNAVAILABLE: (message = 'Service unavailable') =>
    new AppError(503, 'SERVICE_UNAVAILABLE', message),
};

// Error handler middleware
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    });
  } else {
    // Generic error - don't expose details
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
}

// Async route wrapper to catch errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
