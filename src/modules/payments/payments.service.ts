import { BadRequestException, Injectable } from '@nestjs/common';
import * as paymentService from './service';
import * as chapaService from './chapaService';
import type { ListPaymentsQuery, ExportPaymentsQuery } from './schema';

@Injectable()
export class PaymentsService {
  listPayments(userId: string, query: ListPaymentsQuery) {
    return paymentService.listPayments(userId, query);
  }

  getPaymentSummary(userId: string) {
    return paymentService.getPaymentSummary(userId);
  }

  confirmPayment(paymentId: string, userId: string) {
    return paymentService.confirmPayment(paymentId, userId);
  }

  uploadPaymentProof(paymentId: string, userId: string, fileBuffer: Buffer) {
    return paymentService.uploadPaymentProof(paymentId, userId, fileBuffer);
  }

  getPaymentProof(paymentId: string, userId: string) {
    return paymentService.getPaymentProof(paymentId, userId);
  }

  async exportPaymentsCsv(userId: string, query: ExportPaymentsQuery) {
    const payments = await paymentService.exportPayments(userId, query);

    const headers = ['Payment ID', 'Property', 'Renter', 'Amount', 'Currency', 'Status', 'Date'];
    const rows = payments.map((p) => [
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

    return [headers, ...rows].map((e) => e.join(',')).join('\n');
  }

  handleChapaWebhook(body: Record<string, unknown>) {
    return chapaService.handleChapaWebhook(body);
  }

  processChapaTxRef(txRef: string) {
    return chapaService.processChapaTxRef(txRef);
  }

  requireFileBuffer(file?: Express.Multer.File): Buffer {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    return file.buffer;
  }
}
