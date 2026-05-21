import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import * as paymentService from './service';
import * as chapaService from './chapaService';
import {
  listPaymentsQuerySchema,
  exportPaymentsQuerySchema,
  chapaVerifySchema,
} from './schema';
import { env } from '../../config/env';

export const listPayments = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = listPaymentsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await paymentService.listPayments(userId, parsed.data);
  return res.status(200).json({ status: 'success', data: result });
};

export const getPaymentSummary = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const stats = await paymentService.getPaymentSummary(userId);
  return res.status(200).json({ status: 'success', data: stats });
};

export const confirmPayment = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { id } = req.params;

  const payment = await paymentService.confirmPayment(id as string, userId);
  return res.status(200).json({ status: 'success', data: { payment } });
};

export const uploadPaymentProof = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  }

  const payment = await paymentService.uploadPaymentProof(id as string, userId, req.file.buffer);
  return res.status(200).json({ status: 'success', data: { payment } });
};

export const getPaymentProof = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { id } = req.params;

  const result = await paymentService.getPaymentProof(id as string, userId);
  return res.status(200).json({ status: 'success', data: result });
};

export const exportPayments = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = exportPaymentsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ status: 'error', message: 'Invalid query params' });
  }

  const payments = await paymentService.exportPayments(userId, parsed.data);

  const headers = ['Payment ID', 'Property', 'Renter', 'Amount', 'Currency', 'Status', 'Date'];
  const rows = payments.map((p: any) => [
    p.id,
    typeof p.agreement.property.title === 'string'
      ? p.agreement.property.title
      : (p.agreement.property.title as { en?: string })?.en,
    `${p.agreement.renter.first_name} ${p.agreement.renter.last_name}`,
    p.amount,
    p.currency,
    p.status,
    p.createdAt.toISOString(),
  ]);

  const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=payments-export-${Date.now()}.csv`);
  return res.status(200).send(csvContent);
};

export const chapaWebhook = async (req: Request, res: Response) => {
  try {
    const result = await chapaService.handleChapaWebhook(req.body as Record<string, unknown>);
    return res.status(200).json({ message: 'Webhook processed', data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Webhook error' });
  }
};

export const chapaCallback = async (req: Request, res: Response) => {
  const txRef = String(req.query.tx_ref || req.query.txRef || '');
  try {
    await chapaService.processChapaTxRef(txRef);
    const redirect = `${env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}&status=success`;
    return res.redirect(302, redirect);
  } catch {
    const redirect = `${env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}&status=failed`;
    return res.redirect(302, redirect);
  }
};

export const chapaVerify = async (req: Request, res: Response) => {
  const parsed = chapaVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'tx_ref is required' });
  }

  const result = await chapaService.processChapaTxRef(parsed.data.tx_ref);
  return res.status(200).json({ message: 'Verification complete', data: result });
};
