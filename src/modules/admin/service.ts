import prisma from '../../config/database';
import type { Prisma } from '@prisma/client';
import type {
  AdminUpdatePropertyBodyInput,
  GetAuditLogsQueryInput,
  GetPendingVerificationsQueryInput,
} from './schema';

function getRangeStart(range?: '7d' | '30d' | '90d') {
  const now = new Date();

  if (!range) {
    return new Date(0);
  }

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const msInDay = 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - days * msInDay);
}

export async function getPlatformAnalytics(range?: '7d' | '30d' | '90d') {
  const since = getRangeStart(range);

  const [
    totalUsers,
    totalOwners,
    totalRenters,
    verifiedOwners,
    totalProperties,
    activeProperties,
    pendingProperties,
    rentedProperties,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    totalConversations,
    totalMessages,
    totalNotifications,
    unreadNotifications,
    totalAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'owner' } }),
    prisma.user.count({ where: { role: 'renter' } }),
    prisma.user.count({ where: { role: 'owner', isVerified: true } }),
    prisma.property.count({ where: { isDeleted: false } }),
    prisma.property.count({ where: { isDeleted: false, status: 'AVAILABLE' } }),
    prisma.property.count({ where: { isDeleted: false, status: 'PENDING' } }),
    prisma.property.count({ where: { isDeleted: false, status: 'RENTED' } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: 'PENDING' } }),
    prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.notification.count(),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.auditLog.count(),
  ]);

  const [newUsersInRange, newPropertiesInRange, newMessagesInRange, newAuditLogsInRange] =
    await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.property.count({ where: { createdAt: { gte: since } } }),
      prisma.message.count({ where: { createdAt: { gte: since } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
    ]);

  return {
    range: range ?? 'all',
    users: {
      total: totalUsers,
      owners: totalOwners,
      renters: totalRenters,
      verifiedOwners,
      newlyCreated: newUsersInRange,
    },
    properties: {
      total: totalProperties,
      available: activeProperties,
      pending: pendingProperties,
      rented: rentedProperties,
      newlyCreated: newPropertiesInRange,
    },
    appointments: {
      total: totalAppointments,
      pending: pendingAppointments,
      confirmed: confirmedAppointments,
    },
    engagement: {
      conversations: totalConversations,
      messages: totalMessages,
      newMessagesInRange,
    },
    notifications: {
      total: totalNotifications,
      unread: unreadNotifications,
    },
    audit: {
      total: totalAuditLogs,
      newInRange: newAuditLogsInRange,
    },
  };
}

export async function getPendingVerifications(query: GetPendingVerificationsQueryInput) {
  const skip = (query.page - 1) * query.limit;
  const where: Prisma.UserWhereInput = {
    role: 'owner' as const,
    isVerified: false,
    ...(query.emailVerified !== undefined ? { emailVerified: query.emailVerified } : {}),
    ...(query.search
      ? {
          OR: [
            { first_name: { contains: query.search, mode: 'insensitive' } },
            { last_name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { [query.sortBy]: query.order },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        emailVerified: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getAuditLogs(query: GetAuditLogsQueryInput) {
  const skip = (query.page - 1) * query.limit;
  const where: Prisma.AuditLogWhereInput = {
    ...(query.search
      ? {
          OR: [
            { eventType: { contains: query.search, mode: 'insensitive' } },
            { entityType: { contains: query.search, mode: 'insensitive' } },
            { entityId: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.eventType ? { eventType: query.eventType } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { [query.sortBy]: query.order },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function adminOverrideUpdateProperty(
  adminId: string,
  propertyId: string,
  payload: AdminUpdatePropertyBodyInput
) {
  const existing = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: payload,
  });

  const changedFields = Object.keys(payload);

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'ADMIN_PROPERTY_OVERRIDE_UPDATE',
      entityType: 'Property',
      entityId: propertyId,
      metadata: {
        changedFields,
      } as Prisma.InputJsonValue,
    },
  });

  return updated;
}
