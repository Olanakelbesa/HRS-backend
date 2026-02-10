import { Request, Response, NextFunction } from 'express';
import redisClient, { isRedisConnected } from '../config/redis';

const DEFAULT_TTL_SECONDS = 300; // 5 min

export function cache(ttlSeconds = DEFAULT_TTL_SECONDS) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isRedisConnected) return next();

    const key = `cache:${req.method}:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
    } catch {
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      redisClient.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}
