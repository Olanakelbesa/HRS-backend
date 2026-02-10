import prisma from '../../config/database';
import { AppError } from '../../core/AppError';

// Placeholder until Property model exists in Prisma
export async function listProperties(_opts: { page: number; limit: number; minPrice?: number; maxPrice?: number }) {
  return { list: [], total: 0 };
}

export async function getPropertyById(_id: string) {
  throw new AppError('Property not found', 404);
}
