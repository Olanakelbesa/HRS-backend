import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/AppError';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const stack = process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined;

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(stack && { stack }),
  });
}
