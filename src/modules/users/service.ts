import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import type { UpdateProfileInput } from './schema';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
}
