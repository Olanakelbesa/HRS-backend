import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../core/AppError';
import { logger } from '../core/logger';
import { formatPrismaError, isSchemaDriftError } from '../lib/prismaErrors';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    isSchemaDriftError(err)
  ) {
    const formatted = formatPrismaError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
  } else if (err instanceof Error) {
    if (isSchemaDriftError(err)) {
      statusCode = 503;
      message = formatPrismaError(err).message;
    } else {
      message = err.message;
    }
  }

  if (statusCode === 500) {
    logger.error('Unhandled Error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
    });
  }

  const stack = process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined;

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(stack && { stack }),
  });
}
