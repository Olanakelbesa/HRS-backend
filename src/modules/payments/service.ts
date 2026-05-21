import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import { ListPaymentsQuery, ExportPaymentsQuery } from './schema';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

export const listPayments = async (userId: string, query: ListPaymentsQuery) => {
  const { page, limit, status, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    agreement: {
      OR: [{ ownerId: userId }, { renterId: userId }],
    },
    ...(status && { status }),
    ...(search && {
      OR: [
        { id: { contains: search, mode: 'insensitive' as const } },
        { agreement: { property: { title: { path: ['en'], string_contains: search } } } },
        { agreement: { property: { title: { path: ['am'], string_contains: search } } } },
        {
          agreement: {
            renter: { first_name: { contains: search, mode: 'insensitive' as const } },
          },
        },
        {
          agreement: {
            renter: { last_name: { contains: search, mode: 'insensitive' as const } },
          },
        },
      ],
    }),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        agreement: {
          select: {
            property: { select: { title: true } },
            renter: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPaymentSummary = async (userId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalReceived, pendingAmount, thisMonth] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        agreement: { ownerId: userId },
        status: 'success',
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        agreement: { ownerId: userId },
        status: { in: ['pending', 'processing'] },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        agreement: { ownerId: userId },
        status: 'success',
        confirmedAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalReceived: totalReceived._sum.amount || 0,
    pendingAmount: pendingAmount._sum.amount || 0,
    thisMonth: thisMonth._sum.amount || 0,
  };
};

export const confirmPayment = async (paymentId: string, userId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      agreement: {
        include: {
          renter: true,
          property: true,
        },
      },
    },
  });

  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.agreement.ownerId !== userId) throw new AppError('Unauthorized', 403);
  if (payment.status === 'success') throw new AppError('Payment already confirmed', 400);
  if (payment.provider === 'chapa' && payment.purpose === 'security_deposit') {
    throw new AppError('Chapa deposits are confirmed automatically after payment', 400);
  }

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'success',
        confirmedAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        userId: payment.agreement.renterId,
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment Confirmed',
        body: `Your payment for ${
          typeof payment.agreement.property.title === 'string'
            ? payment.agreement.property.title
            : (payment.agreement.property.title as { en?: string })?.en
        } has been confirmed.`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        eventType: 'payment.confirmed',
        entityType: 'Payment',
        entityId: paymentId,
        metadata: { amount: payment.amount, agreementId: payment.agreementId },
      },
    });

    return p;
  });

  return updatedPayment;
};

export const uploadPaymentProof = async (paymentId: string, userId: string, fileBuffer: Buffer) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { agreement: true },
  });

  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.agreement.renterId !== userId) throw new AppError('Only the renter can upload proof', 403);
  if (payment.provider === 'chapa') {
    throw new AppError('Proof upload is not used for Chapa payments', 400);
  }

  const proofUrl = await uploadToCloudinary(fileBuffer, 'payment_proofs', 'image');

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      proofUrl,
      status: 'processing',
    },
  });
};

export const getPaymentProof = async (paymentId: string, userId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { agreement: true },
  });

  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.agreement.ownerId !== userId && payment.agreement.renterId !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  return { proofUrl: payment.proofUrl };
};

export const exportPayments = async (userId: string, query: ExportPaymentsQuery) => {
  const { status, search } = query;

  const where = {
    agreement: { ownerId: userId },
    ...(status && { status }),
    ...(search && {
      OR: [
        { id: { contains: search, mode: 'insensitive' as const } },
        { agreement: { property: { title: { path: ['en'], string_contains: search } } } },
        { agreement: { property: { title: { path: ['am'], string_contains: search } } } },
        {
          agreement: {
            renter: { first_name: { contains: search, mode: 'insensitive' as const } },
          },
        },
        {
          agreement: {
            renter: { last_name: { contains: search, mode: 'insensitive' as const } },
          },
        },
      ],
    }),
  };

  return prisma.payment.findMany({
    where,
    include: {
      agreement: {
        select: {
          property: { select: { title: true } },
          renter: { select: { first_name: true, last_name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
