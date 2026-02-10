import { Response } from 'express';

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ status: 'success', data });
}

export function error(res: Response, message: string, statusCode = 500, errors?: Record<string, unknown>) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && Object.keys(errors).length > 0 && { errors }),
  });
}
