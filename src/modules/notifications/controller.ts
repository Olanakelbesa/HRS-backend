import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import * as notificationService from './service';

export async function listMine(req: Request, res: Response) {
  const auth = req as AuthenticatedRequest;
  const notifications = await notificationService.listUserNotifications(auth.userId);
  return res.status(200).json({ status: 'success', data: { notifications } });
}

export async function markRead(req: Request, res: Response) {
  const auth = req as AuthenticatedRequest;
  const notificationId = String(req.params.id);
  await notificationService.markNotificationRead(auth.userId, notificationId);
  return res.status(200).json({ status: 'success', data: { id: notificationId } });
}

export async function listAudit(req: Request, res: Response) {
  const logs = await notificationService.listAuditLogs();
  return res.status(200).json({ status: 'success', data: { logs } });
}
