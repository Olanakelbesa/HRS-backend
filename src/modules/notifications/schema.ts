import { z } from 'zod';

export const broadcastNotificationSchema = z.object({
  audience: z.enum(['all', 'renters', 'owners', 'verified_owners']),
  title: z.string().min(1),
  message: z.string().min(1),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
