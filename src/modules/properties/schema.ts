import { z } from 'zod';

export const createPropertySchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    address: z.string().min(1),
    pricePerNight: z.number().positive(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export const updatePropertySchema = createPropertySchema.partial();
export const queryPropertiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
  }),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>['body'];
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>['body'];
