import type { Prisma } from '@prisma/client';

/** Explicit field list — avoids stale Prisma client selecting removed columns after migrations. */
export const agreementCoreSelect = {
  id: true,
  propertyId: true,
  renterId: true,
  ownerId: true,
  appointmentId: true,
  monthlyRent: true,
  currency: true,
  startDate: true,
  endDate: true,
  termsSnapshot: true,
  depositOriginal: true,
  depositAmountEtb: true,
  fxRate: true,
  fxRateAt: true,
  status: true,
  ownerMessage: true,
  sentAt: true,
  renterRespondedAt: true,
  offerExpiresAt: true,
  activatedAt: true,
  cancelledBy: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgreementSelect;

const propertySummarySelect = {
  id: true,
  title: true,
  address: true,
  images: true,
  status: true,
} satisfies Prisma.PropertySelect;

const renterSummarySelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect;

const ownerSummarySelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect;

export const agreementListSelect = {
  ...agreementCoreSelect,
  property: { select: propertySummarySelect },
  renter: { select: renterSummarySelect },
} satisfies Prisma.AgreementSelect;

export const agreementDetailSelect = {
  ...agreementCoreSelect,
  property: { select: propertySummarySelect },
  renter: { select: renterSummarySelect },
  owner: { select: ownerSummarySelect },
  payments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.AgreementSelect;
