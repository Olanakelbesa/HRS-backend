import { randomBytes } from 'crypto';
import type { AgreementStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import { convertDepositToEtb } from '../../lib/exchangeRate';
import { enrichAgreement, BLOCKING_AGREEMENT_STATUSES } from '../../lib/agreementStatus';
import { buildChapaUrls, initializeTransaction } from '../../integrations/chapa/client';
import { finalizeSecurityDeposit } from './deposit';
import type { CreateOwnerAgreementInput, ListAgreementsQuery } from './schema';

type ListQuery = ListAgreementsQuery;

async function checkOwnerVerification(ownerId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { role: true, isVerified: true },
  });

  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'owner') throw new AppError('Only owners can perform this action', 403);
  if (!user.isVerified) {
    throw new AppError(
      'Your account is not verified. Please upload your verification documents and wait for approval.',
      403
    );
  }
}

function buildTermsSnapshot(property: {
  id: string;
  title: unknown;
  address: unknown;
  category: unknown;
  price: unknown;
  leaseTerms: unknown;
  images: unknown;
}) {
  return {
    capturedAt: new Date().toISOString(),
    propertyId: property.id,
    title: property.title,
    address: property.address,
    category: property.category,
    price: property.price,
    leaseTerms: property.leaseTerms,
    images: property.images,
  };
}

function resolveMonthlyRent(property: { price: unknown }, override?: number) {
  if (override != null) return override;
  const price = property.price as { value?: number } | null;
  if (!price?.value || price.value <= 0) {
    throw new AppError('Property has no monthly rent configured', 400);
  }
  return price.value;
}

function resolveCurrency(property: { price: unknown }, override?: string) {
  if (override) return override.toUpperCase();
  const price = property.price as { currency?: string } | null;
  return (price?.currency || 'ETB').toUpperCase();
}

function getSecureDeposit(leaseTerms: unknown): { value: number; currency: string } {
  const terms = (leaseTerms || {}) as { secureDeposit?: { value?: number; currency?: string } };
  const deposit = terms.secureDeposit;
  if (!deposit?.value || deposit.value <= 0) {
    throw new AppError('Property has no security deposit configured in lease terms', 400);
  }
  return {
    value: deposit.value,
    currency: (deposit.currency || 'ETB').toUpperCase(),
  };
}

async function assertNoBlockingAgreement(
  propertyId: string,
  renterId: string,
  excludeId?: string
) {
  const existing = await prisma.agreement.findFirst({
    where: {
      propertyId,
      renterId,
      status: { in: BLOCKING_AGREEMENT_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new AppError('An open agreement already exists for this renter and property', 409);
  }
}

function assertOfferNotExpired(agreement: { offerExpiresAt: Date | null; status: AgreementStatus }) {
  if (!agreement.offerExpiresAt) return;
  if (agreement.offerExpiresAt.getTime() < Date.now()) {
    throw new AppError('This offer has expired', 410);
  }
}

async function expireAgreementIfNeeded(agreementId: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement?.offerExpiresAt) return agreement;
  if (agreement.offerExpiresAt.getTime() >= Date.now()) return agreement;
  if (agreement.status !== 'sent' && agreement.status !== 'payment_pending') return agreement;

  return prisma.agreement.update({
    where: { id: agreementId },
    data: { status: 'expired' },
  });
}

const agreementInclude = {
  property: { select: { id: true, title: true, address: true, status: true } },
  renter: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
  owner: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
  payments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.AgreementInclude;

function mapAgreementResponse<T extends { status: AgreementStatus }>(row: T) {
  return enrichAgreement(row);
}

export async function listOwnerAgreements(ownerId: string, query: ListQuery) {
  await checkOwnerVerification(ownerId);

  const where: Prisma.AgreementWhereInput = { ownerId };
  if (query.search) {
    where.OR = [
      { id: { contains: query.search, mode: 'insensitive' } },
      { property: { title: { path: ['en'], string_contains: query.search } } },
      { renter: { first_name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.agreement.findMany({
      where,
      include: {
        property: { select: { id: true, title: true, address: true } },
        renter: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.agreement.count({ where }),
  ]);

  return {
    items: items.map(mapAgreementResponse),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function listRenterAgreements(renterId: string, query: ListQuery) {
  const where: Prisma.AgreementWhereInput = { renterId };
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.agreement.findMany({
      where,
      include: {
        property: { select: { id: true, title: true, address: true } },
        owner: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.agreement.count({ where }),
  ]);

  return {
    items: items.map(mapAgreementResponse),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function exportOwnerAgreements(ownerId: string, _query: unknown) {
  await checkOwnerVerification(ownerId);

  const agreements = await prisma.agreement.findMany({
    where: { ownerId },
    include: { property: true, renter: true },
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['Agreement ID', 'Property', 'Renter', 'Monthly Rent', 'Status', 'Start Date'];
  const rows = agreements.map((a) => [
    a.id,
    typeof a.property.title === 'string'
      ? a.property.title
      : (a.property.title as { en?: string })?.en || '',
    `${a.renter.first_name} ${a.renter.last_name}`,
    String(a.monthlyRent),
    a.status,
    a.startDate?.toISOString() ?? '',
  ]);

  return [headers, ...rows].map((r) => r.join(',')).join('\n');
}

export async function getAgreementDetail(agreementId: string, requesterId?: string) {
  await expireAgreementIfNeeded(agreementId);

  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: agreementInclude,
  });

  if (!agreement) throw new AppError('Agreement not found', 404);

  if (
    requesterId &&
    requesterId !== agreement.ownerId &&
    requesterId !== agreement.renterId
  ) {
    if (agreement.renter) {
      (agreement.renter as { email?: string; phone?: string }).email = undefined;
      (agreement.renter as { email?: string; phone?: string }).phone = undefined;
    }
    if (agreement.owner) {
      (agreement.owner as { email?: string; phone?: string }).email = undefined;
      (agreement.owner as { email?: string; phone?: string }).phone = undefined;
    }
  }

  return mapAgreementResponse(agreement);
}

export async function createOwnerAgreement(ownerId: string, input: CreateOwnerAgreementInput) {
  await checkOwnerVerification(ownerId);

  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) throw new AppError('Property not found', 404);
  if (property.ownerId !== ownerId) throw new AppError('You do not own this property', 403);
  if (input.renterId === ownerId) throw new AppError('Owner cannot be the renter', 400);

  const renter = await prisma.user.findUnique({ where: { id: input.renterId } });
  if (!renter) throw new AppError('Renter not found', 404);

  if (input.appointmentId) {
    const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || appointment.propertyId !== property.id) {
      throw new AppError('Invalid appointment for this property', 400);
    }
    if (appointment.renterId !== input.renterId) {
      throw new AppError('Appointment renter does not match', 400);
    }
  }

  if (input.offerExpiresAt.getTime() <= Date.now()) {
    throw new AppError('Offer expiry must be in the future', 400);
  }

  await assertNoBlockingAgreement(property.id, input.renterId);

  const monthlyRent = resolveMonthlyRent(property, input.monthlyRent);
  const currency = resolveCurrency(property, input.currency);
  const deposit = getSecureDeposit(property.leaseTerms);
  const conversion = await convertDepositToEtb(deposit.value, deposit.currency);

  const status: AgreementStatus = input.send ? 'sent' : 'draft';
  const now = input.send ? new Date() : undefined;

  const agreement = await prisma.agreement.create({
    data: {
      propertyId: property.id,
      renterId: input.renterId,
      ownerId,
      appointmentId: input.appointmentId,
      monthlyRent,
      currency,
      startDate: input.startDate,
      endDate: input.endDate,
      termsSnapshot: buildTermsSnapshot(property) as Prisma.InputJsonValue,
      depositOriginal: {
        value: conversion.originalAmount,
        currency: conversion.originalCurrency,
      } as Prisma.InputJsonValue,
      depositAmountEtb: conversion.depositAmountEtb,
      fxRate: conversion.fxRate,
      fxRateAt: conversion.fxRateAt,
      ownerMessage: input.ownerMessage,
      offerExpiresAt: input.offerExpiresAt,
      status,
      sentAt: now,
    },
    include: agreementInclude,
  });

  if (input.send) {
    await prisma.notification.create({
      data: {
        userId: input.renterId,
        type: 'MESSAGE_NEW',
        title: 'New lease offer',
        body: 'You have received a new lease agreement offer.',
      },
    });
  }

  return mapAgreementResponse(agreement);
}

export async function updateDraftAgreement(
  agreementId: string,
  ownerId: string,
  data: {
    startDate?: Date;
    endDate?: Date;
    monthlyRent?: number;
    currency?: string;
    ownerMessage?: string;
    offerExpiresAt?: Date;
  }
) {
  await checkOwnerVerification(ownerId);

  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.ownerId !== ownerId) throw new AppError('Forbidden', 403);
  if (agreement.status !== 'draft') {
    throw new AppError('Only draft agreements can be updated', 400);
  }

  if (data.offerExpiresAt && data.offerExpiresAt.getTime() <= Date.now()) {
    throw new AppError('Offer expiry must be in the future', 400);
  }

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data,
    include: agreementInclude,
  });

  return mapAgreementResponse(updated);
}

export async function sendAgreement(
  agreementId: string,
  ownerId: string,
  offerExpiresAt?: Date
) {
  await checkOwnerVerification(ownerId);

  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.ownerId !== ownerId) throw new AppError('Forbidden', 403);
  if (agreement.status !== 'draft') {
    throw new AppError('Only draft agreements can be sent', 400);
  }

  const expiresAt = offerExpiresAt ?? agreement.offerExpiresAt;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw new AppError('A future offer expiry is required', 400);
  }

  await assertNoBlockingAgreement(agreement.propertyId, agreement.renterId, agreementId);

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      offerExpiresAt: expiresAt,
    },
    include: agreementInclude,
  });

  await prisma.notification.create({
    data: {
      userId: agreement.renterId,
      type: 'MESSAGE_NEW',
      title: 'New lease offer',
      body: 'You have received a new lease agreement offer.',
    },
  });

  return mapAgreementResponse(updated);
}

export async function cancelAgreement(
  agreementId: string,
  actorId: string,
  reason?: string
) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);

  const isOwner = agreement.ownerId === actorId;
  const isRenter = agreement.renterId === actorId;
  if (!isOwner && !isRenter) throw new AppError('Forbidden', 403);

  const cancellable: AgreementStatus[] = ['draft', 'sent', 'payment_pending'];
  if (!cancellable.includes(agreement.status)) {
    throw new AppError('Agreement cannot be cancelled in its current state', 400);
  }

  if (isOwner && agreement.status === 'draft') {
    await checkOwnerVerification(actorId);
  }

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      status: 'cancelled',
      cancelledBy: actorId,
      cancellationReason: reason,
    },
    include: agreementInclude,
  });

  return mapAgreementResponse(updated);
}

export async function acceptAgreement(agreementId: string, renterId: string) {
  await expireAgreementIfNeeded(agreementId);

  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.renterId !== renterId) throw new AppError('Forbidden', 403);
  if (agreement.status !== 'sent') {
    throw new AppError('Only sent offers can be accepted', 400);
  }

  assertOfferNotExpired(agreement);

  const deposit = (agreement.depositOriginal || {}) as { value?: number; currency?: string };
  if (deposit.value && deposit.currency) {
    const conversion = await convertDepositToEtb(deposit.value, deposit.currency);
    const updated = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: 'payment_pending',
        renterRespondedAt: new Date(),
        depositAmountEtb: conversion.depositAmountEtb,
        fxRate: conversion.fxRate,
        fxRateAt: conversion.fxRateAt,
      },
      include: agreementInclude,
    });

    await prisma.notification.create({
      data: {
        userId: agreement.ownerId,
        type: 'MESSAGE_NEW',
        title: 'Offer accepted',
        body: 'The renter accepted your lease offer. Awaiting security deposit.',
      },
    });

    return mapAgreementResponse(updated);
  }

  throw new AppError('Agreement deposit is not configured', 400);
}

export async function rejectAgreement(agreementId: string, renterId: string, reason?: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.renterId !== renterId) throw new AppError('Forbidden', 403);
  if (agreement.status !== 'sent') {
    throw new AppError('Only sent offers can be rejected', 400);
  }

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      status: 'rejected',
      renterRespondedAt: new Date(),
      cancellationReason: reason,
    },
    include: agreementInclude,
  });

  await prisma.notification.create({
    data: {
      userId: agreement.ownerId,
      type: 'MESSAGE_NEW',
      title: 'Offer rejected',
      body: reason || 'The renter declined your lease offer.',
    },
  });

  return mapAgreementResponse(updated);
}

export async function initiateDeposit(agreementId: string, renterId: string) {
  await expireAgreementIfNeeded(agreementId);

  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { renter: true, property: true },
  });

  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.renterId !== renterId) throw new AppError('Forbidden', 403);
  if (agreement.status !== 'payment_pending') {
    throw new AppError('Deposit payment is only available after accepting the offer', 400);
  }
  assertOfferNotExpired(agreement);

  const amountEtb = agreement.depositAmountEtb;
  if (!amountEtb || amountEtb <= 0) {
    throw new AppError('Deposit amount is not set', 400);
  }

  let payment = await prisma.payment.findFirst({
    where: {
      agreementId,
      purpose: 'security_deposit',
      status: { in: ['pending', 'processing'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const txRef =
    payment?.chapaTxRef || `agr-${agreementId.slice(0, 8)}-${randomBytes(6).toString('hex')}`;

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        agreementId,
        purpose: 'security_deposit',
        provider: 'chapa',
        amount: amountEtb,
        amountEtb,
        currency: 'ETB',
        originalAmount: (agreement.depositOriginal as { value?: number })?.value,
        originalCurrency: (agreement.depositOriginal as { currency?: string })?.currency,
        status: 'pending',
        chapaTxRef: txRef,
        expiresAt: agreement.offerExpiresAt,
      },
    });
  }

  const urls = buildChapaUrls(txRef);
  const title =
    typeof agreement.property.title === 'string'
      ? agreement.property.title
      : (agreement.property.title as { en?: string })?.en || 'Security deposit';

  if (!agreement.renter.email) {
    throw new AppError('Renter email is required for Chapa checkout', 400);
  }

  const chapa = await initializeTransaction({
    amount: amountEtb.toFixed(2),
    currency: 'ETB',
    email: agreement.renter.email,
    first_name: agreement.renter.first_name || 'Renter',
    last_name: agreement.renter.last_name || 'User',
    phone_number: agreement.renter.phone || undefined,
    tx_ref: txRef,
    callback_url: urls.callback_url,
    return_url: urls.return_url,
    customization: {
      title: 'Security deposit',
      description: title,
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'processing', chapaTxRef: txRef },
  });

  return {
    checkoutUrl: chapa.checkout_url,
    txRef,
    paymentId: payment.id,
    amountEtb,
  };
}

export async function getDepositStatus(agreementId: string, renterId: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.renterId !== renterId) throw new AppError('Forbidden', 403);

  const payment = await prisma.payment.findFirst({
    where: { agreementId, purpose: 'security_deposit' },
    orderBy: { createdAt: 'desc' },
  });

  return {
    agreementStatus: agreement.status,
    ...mapAgreementResponse(agreement),
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          chapaTxRef: payment.chapaTxRef,
          amountEtb: payment.amountEtb,
          paidAt: payment.paidAt,
        }
      : null,
  };
}

export async function listAgreementPayments(agreementId: string, requesterId: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.ownerId !== requesterId && agreement.renterId !== requesterId) {
    throw new AppError('Forbidden', 403);
  }

  return prisma.payment.findMany({
    where: { agreementId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function terminateAgreement(
  agreementId: string,
  requesterId: string,
  reason?: string
) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw new AppError('Agreement not found', 404);
  if (agreement.ownerId !== requesterId) throw new AppError('Forbidden', 403);
  if (agreement.status !== 'completed') {
    throw new AppError('Only completed agreements can be terminated', 400);
  }

  await checkOwnerVerification(requesterId);

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data: { status: 'terminated' },
    include: agreementInclude,
  });

  await prisma.auditLog.create({
    data: {
      actorId: requesterId,
      eventType: 'AGREEMENT_TERMINATED',
      entityType: 'Agreement',
      entityId: agreementId,
      metadata: { reason },
    },
  });

  return mapAgreementResponse(updated);
}

export { finalizeSecurityDeposit };
