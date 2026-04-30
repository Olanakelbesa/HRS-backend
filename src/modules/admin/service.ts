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
    prisma.appointment.count({ where: { status: 'ACCEPTED' } }),
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
      accepted: confirmedAppointments,
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

// -------------------------------------------------------------------------------- //
// NEW ADMIN SERVICES FOR FULL MODULE SUPPORT (Users, Properties, Agreements, etc.) //
// -------------------------------------------------------------------------------- //

export async function getUsers(query: import('./schema').GetUsersQueryInput) {
  const skip = (query.page - 1) * query.limit;
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { first_name: { contains: query.search, mode: 'insensitive' } },
            { last_name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        verificationState: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: { total, page: query.page, limit: query.limit } };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateUserStatus(adminId: string, id: string, status: any) {
  const user = await prisma.user.update({
    where: { id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'USER_STATUS_UPDATE',
      entityType: 'User',
      entityId: id,
      metadata: { status },
    },
  });

  return user;
}

export async function updateUserVerificationState(
  adminId: string,
  id: string,
  verificationState: any
) {
  const user = await prisma.user.update({
    where: { id },
    data: { verificationState },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'USER_VERIFICATION_UPDATE',
      entityType: 'User',
      entityId: id,
      metadata: { verificationState },
    },
  });

  return user;
}

export async function getProperties(query: any) {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.property.findMany({
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: { owner: true },
    }),
    prisma.property.count(),
  ]);
  return { items, meta: { total, page: query.page, limit: query.limit } };
}

export async function getAgreements(query: any) {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.agreement.findMany({ skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
    prisma.agreement.count(),
  ]);
  return { items, meta: { total, page: query.page, limit: query.limit } };
}

export async function getAgreementById(id: string) {
  return prisma.agreement.findUnique({ where: { id } });
}

export async function createAgreement(adminId: string, data: any) {
  const agreement = await prisma.agreement.create({ data });
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'AGREEMENT_CREATED',
      entityType: 'Agreement',
      entityId: agreement.id,
    },
  });
  return agreement;
}

export async function updateAgreementStatus(adminId: string, id: string, status: any) {
  const agreement = await prisma.agreement.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'AGREEMENT_STATUS_UPDATE',
      entityType: 'Agreement',
      entityId: id,
      metadata: { status },
    },
  });
  return agreement;
}

export async function getReports(query: any) {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.report.findMany({
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: { reportedBy: true },
    }),
    prisma.report.count(),
  ]);
  return { items, meta: { total, page: query.page, limit: query.limit } };
}

export async function updateReportStatus(adminId: string, id: string, status: any) {
  const report = await prisma.report.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'REPORT_STATUS_UPDATE',
      entityType: 'Report',
      entityId: id,
      metadata: { status },
    },
  });
  return report;
}

export async function resolveVerification(adminId: string, id: string, status: any) {
  const doc = await prisma.verificationDocument.update({
    where: { id },
    data: { status, reviewedAt: new Date(), reviewedById: adminId },
  });

  if (status === 'approved') {
    await prisma.user.update({
      where: { id: doc.userId },
      data: { verificationState: 'verified', isVerified: true },
    });
  } else if (status === 'rejected') {
    await prisma.user.update({
      where: { id: doc.userId },
      data: { verificationState: 'rejected' },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'VERIFICATION_RESOLVED',
      entityType: 'VerificationDocument',
      entityId: id,
      metadata: { status },
    },
  });

  return doc;
}

export async function getPropertyById(id: string) {
  return await prisma.property.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, first_name: true, last_name: true, image: true, phone: true } },
    },
  });
}

export async function getReportById(id: string) {
  return await prisma.report.findUnique({
    where: { id },
    include: { reportedBy: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function getNotifications(query: any) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const data = await prisma.notification.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
  const total = await prisma.notification.count();

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function broadcastNotification(adminId: string, payload: any) {
  const { audience, title, message } = payload;

  let userFilter: any = {};
  if (audience === 'renters') userFilter = { role: 'renter' };
  else if (audience === 'owners') userFilter = { role: 'owner' };
  else if (audience === 'verified_owners') userFilter = { role: 'owner', isVerified: true };

  const users = await prisma.user.findMany({ where: userFilter, select: { id: true } });

  const notifications = users.map((u) => ({
    userId: u.id,
    type: 'MESSAGE_NEW' as const,
    title,
    body: message,
    payload: { broadcast: true },
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

export async function getReviews(query: any) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;
  // Use 'any' type temporarily to bypass strict Prisma type checking if the schema isn't generated yet
  const prismaAny = prisma as any;
  if (!prismaAny.review) return { data: [], meta: { total: 0 } };

  const data = await prismaAny.review.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { reviewer: { select: { id: true, first_name: true, last_name: true } } },
  });
  const total = await prismaAny.review.count();

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function updateReviewStatus(adminId: string, id: string, status: any) {
  const prismaAny = prisma as any;
  if (!prismaAny.review) throw new Error('Review model not generated');

  const updated = await prismaAny.review.update({
    where: { id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      eventType: 'REVIEW_STATUS_UPDATED',
      entityType: 'Review',
      entityId: id,
      metadata: { status },
    },
  });

  return updated;
}

export async function deleteReview(adminId: string, id: string) {
  const prismaAny = prisma as any;
  if (!prismaAny.review) throw new Error('Review model not generated');

  const deleted = await prismaAny.review.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: { actorId: adminId, eventType: 'REVIEW_DELETED', entityType: 'Review', entityId: id },
  });

  return deleted;
}
