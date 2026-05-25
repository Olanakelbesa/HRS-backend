import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import { InteractionApiError } from './errors';
import interactionService from './service';
import {
  exportParamsSchema,
  exportQuerySchema,
  historyQuerySchema,
  likePropertySchema,
  propertyStateParamsSchema,
  recordContactSchema,
  recordScheduleSchema,
  recordShareSchema,
  recordViewSchema,
  savePropertySchema,
} from './schema';

function handleInteractionError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof InteractionApiError) {
    return res.status(error.statusCode).json(error.toJSON());
  }
  return next(error);
}

function parseBody<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fieldErrors = (result as { error?: { flatten: () => { fieldErrors: Record<string, string[]> } } }).error?.flatten()
      .fieldErrors;
    const idempotencyMissing = fieldErrors?.idempotencyKey?.length;
    if (idempotencyMissing) {
      throw new InteractionApiError(
        'MISSING_IDEMPOTENCY_KEY',
        'idempotencyKey is required for all mutating requests',
        400
      );
    }
    throw new InteractionApiError('INVALID_SOURCE', 'Validation failed', 400, { fieldErrors });
  }
  return result.data as T;
}

async function runMutation(
  req: Request,
  res: Response,
  next: NextFunction,
  handler: (userId: string, data: ReturnType<typeof parseBody>) => Promise<{ statusCode: number; body: unknown }>
) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const result = await handler(userId, req.body);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function recordView(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const data = parseBody(recordViewSchema, req.body);
    const source = interactionService.validateSource(data.source);
    const result = await interactionService.recordView(userId, { ...data, source });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function likeProperty(req: Request, res: Response, next: NextFunction) {
  return runMutation(req, res, next, async (userId, body) => {
    const data = parseBody(likePropertySchema, body);
    const source = interactionService.validateSource(data.source);
    return interactionService.likeProperty(userId, { ...data, source });
  });
}

export async function unlikeProperty(req: Request, res: Response, next: NextFunction) {
  return runMutation(req, res, next, async (userId, body) => {
    const data = parseBody(likePropertySchema, body);
    const source = interactionService.validateSource(data.source);
    return interactionService.unlikeProperty(userId, { ...data, source });
  });
}

export async function saveProperty(req: Request, res: Response, next: NextFunction) {
  return runMutation(req, res, next, async (userId, body) => {
    const data = parseBody(savePropertySchema, body);
    const source = interactionService.validateSource(data.source);
    return interactionService.saveProperty(userId, { ...data, source });
  });
}

export async function unsaveProperty(req: Request, res: Response, next: NextFunction) {
  return runMutation(req, res, next, async (userId, body) => {
    const data = parseBody(savePropertySchema, body);
    const source = interactionService.validateSource(data.source);
    return interactionService.unsaveProperty(userId, { ...data, source });
  });
}

export async function recordContact(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const data = parseBody(recordContactSchema, req.body);
    const source = interactionService.validateSource(data.source);
    const result = await interactionService.recordContact(userId, { ...data, source });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function recordShare(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const data = parseBody(recordShareSchema, req.body);
    const source = interactionService.validateSource(data.source);
    const result = await interactionService.recordShare(userId, { ...data, source });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function recordSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const data = parseBody(recordScheduleSchema, req.body);
    const source = interactionService.validateSource(data.source);
    const result = await interactionService.recordSchedule(userId, { ...data, source });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function getPropertyState(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const params = propertyStateParamsSchema.parse(req.params);
    const result = await interactionService.getPropertyState(userId, params.propertyId);
    return res.status(200).json(result);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const query = historyQuerySchema.parse(req.query);
    const result = await interactionService.getHistory(userId, query);
    return res.status(200).json(result);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}

export async function exportUserEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const params = exportParamsSchema.parse(req.params);
    const query = exportQuerySchema.parse(req.query);
    const result = await interactionService.exportUserEvents(params.userId, query.after);
    return res.status(200).json(result);
  } catch (error) {
    return handleInteractionError(error, res, next);
  }
}
