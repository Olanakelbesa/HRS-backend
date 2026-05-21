import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import type { Agreement, Payment } from '@prisma/client';

/**
 * Idempotent: mark security deposit paid and activate agreement.
 */
export async function finalizeSecurityDeposit(payment: Payment) {
  if (payment.purpose !== 'security_deposit') {
    throw new AppError('Not a security deposit payment', 400);
  }

  if (payment.status === 'success') {
    const agreement = await prisma.agreement.findUnique({ where: { id: payment.agreementId } });
    return { payment, agreement, alreadyCompleted: true };
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current) throw new AppError('Payment not found', 404);
    if (current.status === 'success') {
      const agreement = await tx.agreement.findUnique({ where: { id: current.agreementId } });
      return { payment: current, agreement, alreadyCompleted: true };
    }

    const updatedPayment = await tx.payment.update({
      where: { id: current.id },
      data: {
        status: 'success',
        paidAt: new Date(),
        confirmedAt: new Date(),
      },
    });

    const agreement = await tx.agreement.findUnique({
      where: { id: current.agreementId },
      include: { property: true, renter: true, owner: true },
    });

    if (!agreement) throw new AppError('Agreement not found', 404);

    if (agreement.status === 'completed') {
      return { payment: updatedPayment, agreement, alreadyCompleted: true };
    }

    if (agreement.status !== 'payment_pending') {
      throw new AppError('Agreement is not awaiting deposit payment', 409);
    }

    const activated = await tx.agreement.update({
      where: { id: agreement.id },
      data: {
        status: 'completed',
        activatedAt: new Date(),
      },
    });

    await tx.property.update({
      where: { id: agreement.propertyId },
      data: { status: 'RENTED' },
    });

    const title =
      typeof agreement.property.title === 'string'
        ? agreement.property.title
        : (agreement.property.title as { en?: string })?.en || 'Property';

    await tx.notification.createMany({
      data: [
        {
          userId: agreement.renterId,
          type: 'PAYMENT_CONFIRMED',
          title: 'Lease activated',
          body: `Your security deposit for ${title} was received. The agreement is now active.`,
        },
        {
          userId: agreement.ownerId,
          type: 'PAYMENT_RECEIVED',
          title: 'Lease activated',
          body: `Security deposit received for ${title}. The agreement is now active.`,
        },
      ],
    });

    await tx.auditLog.create({
      data: {
        actorId: agreement.renterId,
        eventType: 'AGREEMENT_ACTIVATED',
        entityType: 'Agreement',
        entityId: agreement.id,
        metadata: { paymentId: current.id, chapaTxRef: current.chapaTxRef },
      },
    });

    return { payment: updatedPayment, agreement: activated as Agreement, alreadyCompleted: false };
  });
}
