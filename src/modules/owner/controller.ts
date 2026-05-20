import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import { getOwnerOverview } from './service';
import { getOwnerOverviewQuerySchema } from './schema';
import type { GetOwnerOverviewQueryInput } from './schema';

export async function overview(req: Request, res: Response) {
  try {
    const auth = req as AuthenticatedRequest;
    const ownerId = auth.userId;

    if (!ownerId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const query = getOwnerOverviewQuerySchema.parse(req.query) as GetOwnerOverviewQueryInput;
    const data = await getOwnerOverview(ownerId, query);

    return res.status(200).json({
      status: 'success',
      message: 'Owner overview loaded',
      data,
    });
  } catch (error: unknown) {
    console.error('Get owner overview error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ status: 'error', message });
  }
}
