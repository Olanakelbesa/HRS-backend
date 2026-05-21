import { logger } from '../core/logger';
import { isSchemaDriftError } from './prismaErrors';

export type SafePrismaResult<T> = {
  value: T;
  warning?: string;
};

export async function safePrisma<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<SafePrismaResult<T>> {
  try {
    return { value: await fn() };
  } catch (error) {
    if (isSchemaDriftError(error)) {
      logger.warn(`Prisma schema drift (${label})`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { value: fallback, warning: label };
    }
    throw error;
  }
}
