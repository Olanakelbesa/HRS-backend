import { Prisma } from '@prisma/client';

const SCHEMA_DRIFT_PATTERNS = [
  /PaymentStatus/i,
  /paymentStatus/i,
  /does not exist/i,
  /42704/,
  /P2022/i,
];

export function isSchemaDriftError(error: unknown): boolean {
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return SCHEMA_DRIFT_PATTERNS.some((pattern) => pattern.test(message));
}

export function schemaDriftUserMessage(): string {
  return 'The server database schema is out of sync. Please redeploy the latest backend or contact support.';
}

import * as fs from 'fs';

export function formatPrismaError(error: unknown): { statusCode: number; message: string } {
  console.error('[formatPrismaError] Original Error:', error);
  try {
    fs.writeFileSync('prisma_error_log.txt', String(error) + '\n' + (error instanceof Error ? error.stack : '') + '\n' + JSON.stringify(error));
  } catch (e) { }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (isSchemaDriftError(error)) {
      return { statusCode: 503, message: schemaDriftUserMessage() };
    }

    switch (error.code) {
      case 'P2002': {
        const fields = (error.meta?.target as string[]) || [];
        return {
          statusCode: 409,
          message: `A record with this ${fields.join(', ')} already exists`,
        };
      }
      case 'P2003':
        return { statusCode: 400, message: 'Related record not found' };
      case 'P2025':
        return { statusCode: 404, message: 'Record not found' };
      default:
        return { statusCode: 400, message: 'Database request failed' };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 503, message: schemaDriftUserMessage() };
  }

  if (isSchemaDriftError(error)) {
    return { statusCode: 503, message: schemaDriftUserMessage() };
  }

  if (error instanceof Error) {
    return { statusCode: 500, message: error.message };
  }

  return { statusCode: 500, message: 'Internal server error' };
}
