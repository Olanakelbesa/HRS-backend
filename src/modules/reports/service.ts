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
