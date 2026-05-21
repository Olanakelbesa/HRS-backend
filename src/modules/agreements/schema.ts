import { z } from 'zod';

const agreementStatusFilter = z.enum([
  'draft',
  'sent',
  'payment_pending',
  'completed',
  'rejected',
  'cancelled',
  'terminated',
  'expired',
]);

export const listAgreementsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: agreementStatusFilter.optional(),
});

export const createOwnerAgreementSchema = z
  .object({
    propertyId: z.string().min(1),
    renterId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    monthlyRent: z.coerce.number().positive().optional(),
    currency: z.string().min(1).optional(),
    appointmentId: z.string().min(1).optional(),
    ownerMessage: z.string().max(2000).optional(),
    offerExpiresAt: z.coerce.date(),
    send: z.coerce.boolean().optional().default(false),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

export const updateDraftAgreementSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    monthlyRent: z.coerce.number().positive().optional(),
    currency: z.string().min(1).optional(),
    ownerMessage: z.string().max(2000).optional(),
    offerExpiresAt: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.startDate && d.endDate) return d.endDate > d.startDate;
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  );

export const sendAgreementSchema = z.object({
  offerExpiresAt: z.coerce.date().optional(),
});

export const cancelAgreementSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const rejectAgreementSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export type CreateOwnerAgreementInput = z.infer<typeof createOwnerAgreementSchema>;
export type ListAgreementsQuery = z.infer<typeof listAgreementsQuerySchema>;
