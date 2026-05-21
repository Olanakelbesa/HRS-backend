import prisma from '../../config/database';
import { propertyService } from '../properties/service';
import { getProfile } from '../profile/service';
import { safePrisma } from '../../lib/safePrisma';
import { agreementListSelect } from '../../lib/prismaSelects';
import type { GetOwnerOverviewQueryInput } from './schema';

const PENDING_AGREEMENT_STATUSES = ['sent', 'payment_pending'] as const;

function getLocalized(value: unknown, lang = 'en'): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, string>;
    return record[lang] || record.en || record.am || '';
  }
  return '';
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusColor(status: string): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-100 text-emerald-700';
    case 'RENTED':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

function mapNotificationActivity(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: Date;
}) {
  const typeIconMap: Record<string, string> = {
    APPOINTMENT_BOOKED: 'appointment',
    APPOINTMENT_UPDATED: 'appointment',
    PAYMENT_RECEIVED: 'payment',
    PAYMENT_CONFIRMED: 'payment',
    MESSAGE_NEW: 'message',
  };

  return {
    id: notification.id,
    type: typeIconMap[notification.type] || 'system',
    title: notification.title,
    desc: notification.body,
    time: formatRelativeTime(notification.createdAt),
  };
}

function mapTopProperty(property: Awaited<ReturnType<typeof propertyService.getMyProperties>>[number]) {
  const title = getLocalized(property.title);
  const address = getLocalized(property.address);

  return {
    id: property.id,
    name: title || 'Property',
    location: address || 'Unknown',
    views: property.viewCount ?? 0,
    inquiries: 0,
    status: property.status,
    statusColor: statusColor(property.status),
    revenue: `${property.price?.value ?? 0} ${property.price?.currency ?? 'ETB'}`,
    img: property.images?.[0] ?? '',
  };
}

async function buildRevenueChart(ownerId: string, range: GetOwnerOverviewQueryInput['range']) {
  const now = new Date();
  const buckets: { label: string; start: Date; end: Date }[] = [];

  if (range === 'weekly') {
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      buckets.push({
        label: start.toLocaleDateString('en-US', { weekday: 'short' }),
        start,
        end,
      });
    }
  } else {
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        start,
        end,
      });
    }
  }

  if (buckets.length === 0) {
    return [];
  }

  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;

  const { value: payments } = await safePrisma(
    'revenue.chart.payments',
    () =>
      prisma.payment.findMany({
        where: {
          status: 'success',
          paidAt: { gte: rangeStart, lte: rangeEnd },
          agreement: { ownerId },
        },
        select: { amount: true, paidAt: true },
      }),
    []
  );

  return buckets.map((bucket) => ({
    label: bucket.label,
    revenue: payments
      .filter((p) => p.paidAt && p.paidAt >= bucket.start && p.paidAt <= bucket.end)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0),
  }));
}

export async function getOwnerOverview(ownerId: string, query: GetOwnerOverviewQueryInput) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const warnings: string[] = [];

  const profile = await getProfile(ownerId);
  const properties = await propertyService.getMyProperties(ownerId);

  const { value: pendingAppointmentsCount, warning: apptCountWarn } = await safePrisma(
    'appointments.count',
    () => prisma.appointment.count({ where: { ownerId, status: 'PENDING' } }),
    0
  );
  if (apptCountWarn) warnings.push(apptCountWarn);

  const { value: pendingAppointments, warning: apptListWarn } = await safePrisma(
    'appointments.list',
    () =>
      prisma.appointment.findMany({
        where: { ownerId, status: 'PENDING' },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          propertyId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          note: true,
          property: { select: { id: true, title: true, address: true, images: true } },
          renter: { select: { id: true, first_name: true, last_name: true, email: true } },
        },
      }),
    []
  );
  if (apptListWarn) warnings.push(apptListWarn);

  const agreementWhere = {
    ownerId,
    status: { in: [...PENDING_AGREEMENT_STATUSES] },
  };

  const { value: pendingAgreementsCount, warning: agCountWarn } = await safePrisma(
    'agreements.count',
    () => prisma.agreement.count({ where: agreementWhere }),
    0
  );
  if (agCountWarn) warnings.push(agCountWarn);

  const { value: pendingAgreements, warning: agListWarn } = await safePrisma(
    'agreements.list',
    () =>
      prisma.agreement.findMany({
        where: agreementWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: agreementListSelect,
      }),
    []
  );
  if (agListWarn) warnings.push(agListWarn);

  const { value: unreadNotificationsCount, warning: notifCountWarn } = await safePrisma(
    'notifications.count',
    () => prisma.notification.count({ where: { userId: ownerId, readAt: null } }),
    0
  );
  if (notifCountWarn) warnings.push(notifCountWarn);

  const { value: recentNotifications, warning: notifListWarn } = await safePrisma(
    'notifications.list',
    () =>
      prisma.notification.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, title: true, body: true, createdAt: true, readAt: true },
      }),
    []
  );
  if (notifListWarn) warnings.push(notifListWarn);

  const { value: revenueThisMonth, warning: revenueWarn } = await safePrisma(
    'payments.revenueMonth',
    () =>
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          paidAt: { gte: monthStart },
          agreement: { ownerId },
        },
      }),
    { _sum: { amount: null } }
  );
  if (revenueWarn) warnings.push(revenueWarn);

  const { value: pendingPayments, warning: pendingPayWarn } = await safePrisma(
    'payments.pending',
    () =>
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          status: { in: ['pending', 'processing'] },
          agreement: { ownerId },
        },
      }),
    { _sum: { amount: null }, _count: { _all: 0 } }
  );
  if (pendingPayWarn) warnings.push(pendingPayWarn);

  const revenueChart = await buildRevenueChart(ownerId, query.range);

  const activeListings = properties.filter((p) => p.status === 'AVAILABLE').length;
  const totalViews = properties.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const revenueTotal = revenueThisMonth._sum?.amount ?? 0;

  const topPerformingProperties = [...properties]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 4)
    .map(mapTopProperty);

  const ownerProfile = profile as {
    verification?: { status?: string; documents?: unknown[] } | null;
    verificationState?: string;
  };
  const verificationDocs = ownerProfile.verification?.documents ?? [];

  return {
    profile: {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      image: profile.image,
      isVerified: profile.isVerified,
    },
    verification: {
      status: ownerProfile.verification?.status ?? profile.verificationState ?? null,
      overallStatus: ownerProfile.verification?.status ?? null,
      hasDocuments: verificationDocs.length > 0,
      uploadedFiles: verificationDocs,
    },
    kpis: {
      activeListings,
      totalViews,
      pendingAppointments: pendingAppointmentsCount,
      pendingAgreements: pendingAgreementsCount,
      revenueThisMonth: revenueTotal,
      revenueCurrency: 'ETB',
    },
    quickActions: {
      pendingAppointments: pendingAppointmentsCount,
      pendingAgreements: pendingAgreementsCount,
      unreadNotifications: unreadNotificationsCount,
    },
    properties,
    topPerformingProperties,
    pendingAppointments: pendingAppointments.map((a) => ({
      id: a.id,
      propertyId: a.propertyId,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      note: a.note,
      propertyTitle: getLocalized(a.property.title),
      propertyAddress: getLocalized(a.property.address),
      propertyImage: Array.isArray(a.property.images) ? a.property.images[0] : null,
      renterName: `${a.renter.first_name ?? ''} ${a.renter.last_name ?? ''}`.trim(),
      renterEmail: a.renter.email,
    })),
    pendingAgreements: pendingAgreements.map((a) => ({
      id: a.id,
      status: a.status,
      monthlyRent: a.monthlyRent,
      currency: a.currency,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
      propertyTitle: getLocalized(a.property.title),
      propertyAddress: getLocalized(a.property.address),
      renterName: `${a.renter.first_name ?? ''} ${a.renter.last_name ?? ''}`.trim(),
    })),
    recentActivity: recentNotifications.map(mapNotificationActivity),
    revenue: {
      totalThisMonth: revenueTotal,
      avgPerProperty: properties.length > 0 ? Math.round(revenueTotal / properties.length) : 0,
      pendingAmount: pendingPayments._sum?.amount ?? 0,
      pendingCount: pendingPayments._count?._all ?? 0,
      currency: 'ETB',
      chart: revenueChart,
      range: query.range,
    },
    ...(warnings.length > 0
      ? {
          warnings: Array.from(new Set(warnings)),
          partial: true,
        }
      : {}),
  };
}
