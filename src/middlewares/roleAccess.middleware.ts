import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/request';
import { canUseMessaging } from '../modules/messaging/access';

export function requireMessagingAccess(req: Request, res: Response, next: NextFunction) {
  const auth = req as AuthenticatedRequest;
  if (!canUseMessaging(auth.userRole)) {
    return res.status(403).json({
      status: 'error',
      message: 'Messaging is only available for owner and renter accounts',
    });
  }
  return next();
}
