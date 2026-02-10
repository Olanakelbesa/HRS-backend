import bcrypt from 'bcryptjs';
import { Response } from 'express';
import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.utils';
import type { RegisterInput, LoginInput } from './schema';

const SALT_ROUNDS = 12;

/**
 * Set HTTP-Only cookie with refresh token
 */
export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear refresh token cookie
 */
export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });
}

/**
 * Register new user
 */
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name ?? null,
      role: 'RENTER', // Default role
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  return { user, accessToken, refreshToken };
}

/**
 * Login user with email and password
 */
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  const { password: _, failedAttempts: _fa, lockedUntil: _lu, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(oldRefreshToken: string) {
  // Verify the refresh token
  const decoded = verifyRefreshToken(oldRefreshToken);

  // Check if refresh token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (storedToken.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new AppError('Refresh token expired', 401);
  }

  // Delete old refresh token (token rotation)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  // Generate new token pair
  const { accessToken, refreshToken } = generateTokenPair(
    storedToken.user.id,
    storedToken.user.role
  );

  // Store new refresh token
  await storeRefreshToken(storedToken.user.id, refreshToken);

  const { password: _, failedAttempts: _fa, lockedUntil: _lu, ...safeUser } = storedToken.user;
  return { user: safeUser, accessToken, refreshToken };
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
}

/**
 * Get current user
 */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
}
