import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import type { AuthenticatedRequest } from '../types/request';

/**
 * Middleware to require authentication
 * Verifies JWT access token and attaches userId and role to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Authorization token required' });
  }

  try {
    const { userId, role } = verifyAccessToken(token);
    (req as AuthenticatedRequest).userId = userId;
    (req as AuthenticatedRequest).userRole = role;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid or expired token';
    return res.status(401).json({ status: 'error', message });
  }
}

/**
 * Middleware to restrict access to specific roles
 * Must be used after requireAuth middleware
 *
 * @example
 * router.get('/admin-only', requireAuth, restrictTo('ADMIN'), controller)
 * router.post('/owners-only', requireAuth, restrictTo('OWNER', 'ADMIN'), controller)
 */
export function restrictTo(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as AuthenticatedRequest).userRole;

    if (!userRole) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const normalizedUserRole = String(userRole).trim().toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map((role) => role.trim().toLowerCase());

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const { userId, role } = verifyAccessToken(token);
    (req as AuthenticatedRequest).userId = userId;
    (req as AuthenticatedRequest).userRole = role;
  } catch {
    // Silently fail - optional auth
  }

  next();
}
