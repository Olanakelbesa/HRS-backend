import { Request, Response, NextFunction } from 'express';

const windowMs = 15 * 60 * 1000; // 15 min
const maxRequests = 100;
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return next();
  }

  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return next();
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return res.status(429).json({
      status: 'error',
      message: 'Too many requests. Try again later.',
    });
  }

  next();
}
