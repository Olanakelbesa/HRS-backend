import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../core/AppError';

import crypto from 'crypto';

export interface TokenPayload {
  sub: string; // userId
  role: string;
  type: 'access' | 'refresh';
  jti?: string;
}

export interface DecodedToken {
  userId: string;
  role: string;
}

/**
 * Generate Access Token (short-lived, contains user identity and role)
 */
export function generateAccessToken(userId: string, role: string): string {
  const payload: TokenPayload = {
    sub: userId,
    role,
    type: 'access',
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

/**
 * Generate Refresh Token (long-lived, only contains user ID)
 */
export function generateRefreshToken(userId: string): string {
  const payload: TokenPayload = {
    sub: userId,
    role: '', // Refresh tokens don't need role
    type: 'refresh',
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

/**
 * Generate both Access and Refresh tokens
 */
export function generateTokenPair(userId: string, role: string) {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId),
  };
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }

    return {
      userId: decoded.sub,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid access token', 401);
    }
    throw error;
  }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    return {
      userId: decoded.sub,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401);
    }
    throw error;
  }
}

// Legacy support - deprecated
export function signToken(userId: string): string {
  return generateAccessToken(userId, 'RENTER');
}

export function verifyToken(token: string): { userId: string } {
  const decoded = verifyAccessToken(token);
  return { userId: decoded.userId };
}
