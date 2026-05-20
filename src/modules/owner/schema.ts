import { z } from 'zod';

export const getOwnerOverviewQuerySchema = z.object({
  range: z.enum(['weekly', 'monthly']).default('monthly'),
});

export type GetOwnerOverviewQueryInput = z.infer<typeof getOwnerOverviewQuerySchema>;
