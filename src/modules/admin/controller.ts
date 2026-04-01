import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import {
  adminOverrideUpdateProperty,
  getAuditLogs,
  getPendingVerifications,
  getPlatformAnalytics,
} from './service';
import {
  adminUpdatePropertyBodySchema,
  adminUpdatePropertyParamsSchema,
  getAnalyticsQuerySchema,
  getAuditLogsQuerySchema,
  getPendingVerificationsQuerySchema,
} from './schema';
import type {
  AdminUpdatePropertyBodyInput,
  AdminUpdatePropertyParamsInput,
  GetAnalyticsQueryInput,
  GetAuditLogsQueryInput,
  GetPendingVerificationsQueryInput,
} from './schema';

export async function analytics(req: Request, res: Response) {
  const query = getAnalyticsQuerySchema.parse(req.query) as GetAnalyticsQueryInput;
  const data = await getPlatformAnalytics(query.range);
  return res.status(200).json({ status: 'success', data });
}

export async function pendingVerifications(req: Request, res: Response) {
  const query = getPendingVerificationsQuerySchema.parse(
    req.query
  ) as GetPendingVerificationsQueryInput;
  const data = await getPendingVerifications(query);
  return res.status(200).json({ status: 'success', data });
}

export async function auditLogs(req: Request, res: Response) {
  const query = getAuditLogsQuerySchema.parse(req.query) as GetAuditLogsQueryInput;
  const data = await getAuditLogs(query);
  return res.status(200).json({ status: 'success', data });
}

export async function overrideProperty(req: Request, res: Response) {
  const auth = req as AuthenticatedRequest;
  const params = adminUpdatePropertyParamsSchema.parse(
    req.params
  ) as AdminUpdatePropertyParamsInput;
  const body = adminUpdatePropertyBodySchema.parse(req.body) as AdminUpdatePropertyBodyInput;

  const updated = await adminOverrideUpdateProperty(auth.userId, params.id, body);

  if (!updated) {
    return res.status(404).json({
      status: 'error',
      message: 'Property not found',
    });
  }

  return res.status(200).json({
    status: 'success',
    data: updated,
  });
}
