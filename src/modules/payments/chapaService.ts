import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import { verifyTransaction } from '../../integrations/chapa/client';
import { finalizeSecurityDeposit } from '../agreements/deposit';

export async function processChapaTxRef(txRef: string) {
  if (!txRef) throw new AppError('tx_ref is required', 400);

  const payment = await prisma.payment.findUnique({
    where: { chapaTxRef: txRef },
    include: { agreement: true },
  });

  if (!payment) throw new AppError('Payment not found for this reference', 404);

  if (payment.status === 'success') {
    return { payment, agreement: payment.agreement, alreadyCompleted: true };
  }
  if (payment.status === 'failed') {
    return { payment, agreement: payment.agreement, alreadyCompleted: false, failed: true };
  }

  const verified = await verifyTransaction(txRef);
  const normalized = (verified.status || '').toLowerCase();

  if (normalized === 'success' || normalized === 'successful') {
    return finalizeSecurityDeposit(payment);
  }

  if (normalized === 'failed' || normalized === 'failure') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed', failureReason: 'Chapa reported failure' },
    });
    return { payment, agreement: payment.agreement, alreadyCompleted: false, failed: true };
  }

  return { payment, agreement: payment.agreement, pending: true };
}

export async function handleChapaWebhook(body: Record<string, unknown>) {
  const txRef =
    (body.tx_ref as string) ||
    (body.txRef as string) ||
    ((body.data as Record<string, unknown>)?.tx_ref as string);

  if (!txRef) {
    throw new AppError('Missing tx_ref in webhook payload', 400);
  }

  return processChapaTxRef(txRef);
}
