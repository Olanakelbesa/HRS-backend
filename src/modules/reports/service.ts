import prisma from '../../config/database';
import type { GetOwnerReportsQueryInput } from './schema';
import type { ReportStatus } from '@prisma/client';

/**
 * Fetch paginated reports that target the logged-in owner's properties or the
 * owner themselves, together with summary counters (total / open / resolved).
 */
export async function getReportsAgainstOwner(
  ownerId: string,
  query: GetOwnerReportsQueryInput
) {
  const skip = (query.page - 1) * query.limit;

  // A report is "against the owner" when:
  //   targetType = 'user'     AND targetId = ownerId
  //   targetType = 'property' AND targetId is one of the owner's properties
  const ownerPropertyIds = await prisma.property
    .findMany({ where: { ownerId, isDeleted: false }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));

  const where = {
    OR: [
      { targetType: 'user' as const, targetId: ownerId },
      ...(ownerPropertyIds.length > 0
        ? [{ targetType: 'property' as const, targetId: { in: ownerPropertyIds } }]
        : []),
    ],
    ...(query.status ? { status: query.status as ReportStatus } : {}),
  };

  const [items, total, openCount, resolvedCount] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: {
          select: { id: true, first_name: true, last_name: true, image: true, role: true },
        },
      },
    }),
    prisma.report.count({ where }),
    prisma.report.count({ where: { ...where, status: 'open' } }),
    prisma.report.count({ where: { ...where, status: 'resolved' } }),
  ]);

  return {
    summary: { total, open: openCount, resolved: resolvedCount },
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

/**
 * Fetch a single report by ID, but only if it is actually against the owner.
 */
export async function getOwnerReportById(ownerId: string, reportId: string) {
  const ownerPropertyIds = await prisma.property
    .findMany({ where: { ownerId, isDeleted: false }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reportedBy: {
        select: { id: true, first_name: true, last_name: true, image: true, role: true },
      },
    },
  });

  if (!report) return null;

  const isAgainstOwner =
    (report.targetType === 'user' && report.targetId === ownerId) ||
    (report.targetType === 'property' && ownerPropertyIds.includes(report.targetId));

  if (!isAgainstOwner) return null;

  return report;
}

async function hasAppointmentOrConversationWithProperty(
  reporterId: string,
  propertyId: string,
  ownerId: string
) {
  const hasAppointment = await prisma.appointment.findFirst({
    where: {
      propertyId,
      renterId: reporterId,
      ownerId,
      status: { in: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] },
    },
  });

  const hasConversation = await prisma.conversation.findFirst({
    where: {
      propertyId,
      renterId: reporterId,
      ownerId,
      messages: { some: {} },
    },
  });

  return Boolean(hasAppointment || hasConversation);
}

async function hasAppointmentOrConversationWithUser(
  reporterId: string,
  userId: string
) {
  if (reporterId === userId) {
    return false;
  }

  const hasAppointment = await prisma.appointment.findFirst({
    where: {
      renterId: reporterId,
      ownerId: userId,
      status: { in: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] },
    },
  });

  const hasConversation = await prisma.conversation.findFirst({
    where: {
      renterId: reporterId,
      ownerId: userId,
      messages: { some: {} },
    },
  });

  return Boolean(hasAppointment || hasConversation);
}

export async function createReport(
  reporterId: string,
  input: {
    targetType: 'property' | 'user';
    targetId: string;
    category: string;
    description: string;
    images?: string[];
  }
) {
  if (input.targetType === 'property') {
    const property = await prisma.property.findUnique({
      where: { id: input.targetId },
      select: { id: true, ownerId: true },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    const authorized = await hasAppointmentOrConversationWithProperty(
      reporterId,
      input.targetId,
      property.ownerId
    );

    if (!authorized) {
      throw new Error(
        'You can only report properties that you have booked an appointment for or started a conversation about.'
      );
    }
  } else {
    const user = await prisma.user.findUnique({
      where: { id: input.targetId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const authorized = await hasAppointmentOrConversationWithUser(
      reporterId,
      input.targetId
    );

    if (!authorized) {
      throw new Error(
        'You can only report users that you have booked an appointment with or started a conversation with.'
      );
    }
  }

  const report = await prisma.report.create({
    data: {
      reportedById: reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      category: input.category,
      description: input.description,
      status: 'open',
      images: input.images ?? [],
    },
  });

  return report;
}

/**
 * Submit (or update) the owner's response to a specific report.
 * Only allowed when the report status is 'open' or 'in_review'.
 */
export async function submitOwnerResponse(
  ownerId: string,
  reportId: string,
  responseText: string
) {
  // Verify this report belongs to the owner first
  const report = await getOwnerReportById(ownerId, reportId);
  if (!report) return { error: 'not_found' };

  if (report.status === 'resolved' || report.status === 'dismissed') {
    return { error: 'already_closed' };
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      ownerResponse: responseText,
      respondedAt: new Date(),
    },
  });

  return { data: updated };
}
