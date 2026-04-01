import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (result.success) {
      if (source === 'query') {
        Object.assign(req.query as Record<string, unknown>, result.data);
      } else if (source === 'params') {
        Object.assign(req.params as Record<string, unknown>, result.data);
      } else {
        (req as any)[source] = result.data;
      }
      return next();
    }

    const error = result.error as ZodError;
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: error.flatten().fieldErrors,
    });
  };
}
