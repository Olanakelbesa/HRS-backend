import { z } from 'zod';

const gatewayStatus = z.enum(['pending', 'processing', 'success', 'failed', 'expired']);

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(6),
  status: gatewayStatus.optional(),
  search: z.string().optional(),
});

export const exportPaymentsQuerySchema = z.object({
  status: gatewayStatus.optional(),
  search: z.string().optional(),
});

export const chapaVerifySchema = z.object({
  tx_ref: z.string().min(1),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type ExportPaymentsQuery = z.infer<typeof exportPaymentsQuerySchema>;
