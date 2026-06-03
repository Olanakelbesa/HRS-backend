import prisma from '../../config/database';
import type { Prisma } from '@prisma/client';
import {
  excludePeerMessageNotifications,
  isAdminRole,
} from './access';

export async function createNotification(input: {
  userId: string;
  type: 'MESSAGE_NEW' | 'APPOINTMENT_BOOKED' | 'APPOINTMENT_UPDATED';
  title: string;
  body: string;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload,
    },
  });
}

export async function createAuditLog(input: {
  actorId?: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}

export type ListNotificationsInput = {
  userId: string;
  role: string;
  page?: number;
  limit?: number;
};

/**
 * Single entry for GET /api/v1/notifications — scope depends on role.
 * - admin: platform feed (excludes renter↔owner MESSAGE_NEW), paginated
 * - owner / renter: own inbox, all notification types
 */
export async function listNotifications(input: ListNotificationsInput) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));

  if (isAdminRole(input.role)) {
    const where = excludePeerMessageNotifications();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, role: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return { notifications };
}

export async function broadcastNotification(adminId: string, payload: {
  audience: string;
  title: string;
  message: string;
}) {
  const { audience, title, message } = payload;

  let userFilter: Prisma.UserWhereInput = { role: { not: 'admin' } };
  if (audience === 'renters') userFilter = { role: 'renter' };
  else if (audience === 'owners') userFilter = { role: 'owner' };
  else if (audience === 'verified_owners') userFilter = { role: 'owner', isVerified: true };

  const users = await prisma.user.findMany({ where: userFilter, select: { id: true } });

  const notifications = users.map((u) => ({
    userId: u.id,
    type: 'APPOINTMENT_UPDATED' as const,
    title,
    body: message,
    payload: { broadcast: true, audience },
  }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'BROADCAST_SENT',
      entityType: 'Notification',
      metadata: { audience, title, count: notifications.length },
    },
  });

  return { success: true, count: notifications.length };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function listAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
