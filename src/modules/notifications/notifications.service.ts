import { Injectable } from '@nestjs/common';
import * as notificationService from './service';
import type { z } from 'zod';
import type { broadcastNotificationSchema } from './schema';

type BroadcastInput = z.infer<typeof broadcastNotificationSchema>;

@Injectable()
export class NotificationsService {
  listNotifications(input: {
    userId: string;
    role: string;
    page?: number;
    limit?: number;
  }) {
    return notificationService.listNotifications(input);
  }

  markNotificationRead(userId: string, notificationId: string) {
    return notificationService.markNotificationRead(userId, notificationId);
  }

  broadcastNotification(adminId: string, payload: BroadcastInput) {
    return notificationService.broadcastNotification(adminId, payload);
  }

  listAuditLogs() {
    return notificationService.listAuditLogs();
  }
}
