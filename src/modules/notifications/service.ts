import prisma from '../../config/database';
import type { Prisma } from '@prisma/client';

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

export async function listUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
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
