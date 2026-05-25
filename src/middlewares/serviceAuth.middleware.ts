import { Request, Response, NextFunction } from 'express';

/**
 * Service-to-service authentication for internal endpoints (e.g. recommendation export).
 * Expects Authorization: Bearer <RECOMMENDATION_SERVICE_TOKEN>
 */
export function requireServiceAuth(req: Request, res: Response, next: NextFunction) {
  const serviceToken = process.env.RECOMMENDATION_SERVICE_TOKEN;

  if (!serviceToken) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_AUTHENTICATION_REQUIRED',
        message: 'Service token is not configured on the server',
      },
    });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== serviceToken) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'SERVICE_AUTHENTICATION_REQUIRED',
        message: 'This endpoint requires a valid service token',
      },
    });
  }

  next();
}
