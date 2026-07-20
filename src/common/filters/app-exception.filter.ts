import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../../core/AppError';
import { logger } from '../../core/logger';
import { formatPrismaError, isSchemaDriftError } from '../../lib/prismaErrors';
import { InteractionApiError } from '../../modules/interactions/errors';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof InteractionApiError) {
      return response.status(exception.statusCode).json(exception.toJSON());
    }

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: Record<string, unknown> | undefined;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string) || message;
        if (Array.isArray(obj.message)) {
          message = 'Validation failed';
          errors = { issues: obj.message };
        }
        if (obj.errors && typeof obj.errors === 'object') {
          errors = obj.errors as Record<string, unknown>;
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError ||
      isSchemaDriftError(exception)
    ) {
      const formatted = formatPrismaError(exception);
      statusCode = formatted.statusCode;
      message = formatted.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (statusCode >= 500) {
      logger.error('Unhandled Error', {
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        path: request.url,
      });
    }

    const stack =
      process.env.NODE_ENV === 'development' && exception instanceof Error
        ? exception.stack
        : undefined;

    response.status(statusCode).json({
      status: 'error',
      message,
      ...(errors && { errors }),
      ...(stack && { stack }),
    });
  }
}
