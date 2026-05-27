import { z } from 'zod';

export const propertySearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type PropertySearchInput = z.infer<typeof propertySearchSchema>;
