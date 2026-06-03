import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import * as notificationService from './service';
import { broadcastNotificationSchema, listNotificationsQuerySchema } from './schema';

export async function listMine(req: Request, res: Response) {
  const auth = req as AuthenticatedRequest;
  const query = listNotificationsQuerySchema.parse(req.query);

  const data = await notificationService.listNotifications({
    userId: auth.userId,
    role: auth.userRole,
    page: query.page,
    limit: query.limit,
  });

  return res.status(200).json({ status: 'success', data });
}

export async function markRead(req: Request, res: Response) {
  const auth = req as AuthenticatedRequest;
  const notificationId = String(req.params.id);
  await notificationService.markNotificationRead(auth.userId, notificationId);
  return res.status(200).json({ status: 'success', data: { id: notificationId } });
}

export async function broadcast(req: Request, res: Response) {
  const auth = req as AuthenticatedRequest;
  const body = broadcastNotificationSchema.parse(req.body);
  const result = await notificationService.broadcastNotification(auth.userId, body);
  return res.status(200).json({ status: 'success', data: result });
}

export async function listAudit(req: Request, res: Response) {
  const logs = await notificationService.listAuditLogs();
  return res.status(200).json({ status: 'success', data: { logs } });
}
