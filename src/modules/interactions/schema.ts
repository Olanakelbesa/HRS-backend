import { z } from 'zod';

const baseMutationSchema = z.object({
  propertyId: z.string().min(1),
  source: z.string().optional(),
  sessionId: z.string().optional(),
  idempotencyKey: z.string().min(1, 'idempotencyKey is required for all mutating requests'),
});

export const recordViewSchema = baseMutationSchema.extend({
  viewDuration: z.number().int().nonnegative().optional(),
  imagesViewed: z.number().int().nonnegative().optional(),
});

export const likePropertySchema = baseMutationSchema;

export const savePropertySchema = baseMutationSchema;

export const recordContactSchema = baseMutationSchema.extend({
  metadata: z
    .object({
      contactMethod: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const recordShareSchema = baseMutationSchema.extend({
  metadata: z
    .object({
      shareMethod: z.string().optional(),
      recipientCount: z.number().int().nonnegative().optional(),
    })
    .passthrough()
    .optional(),
});

export const recordScheduleSchema = baseMutationSchema.extend({
  metadata: z
    .object({
      scheduledDate: z.string().optional(),
      scheduledTimeSlot: z.string().optional(),
      appointmentId: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const propertyStateParamsSchema = z.object({
  propertyId: z.string().min(1),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.string().optional(),
  propertyId: z.string().optional(),
  sessionId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const exportQuerySchema = z.object({
  after: z.string().datetime().optional(),
});

export const exportParamsSchema = z.object({
  userId: z.string().min(1),
});
