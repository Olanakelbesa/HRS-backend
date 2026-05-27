import { z } from 'zod';
import { PropertyType } from '@prisma/client';

export const preferenceSchema = z.object({
  budget: z
    .object({
      min: z.number().nonnegative().optional(),
      max: z.number().nonnegative().optional(),
      currency: z.string().default('ETB'),
    })
    .refine(
      (budget) =>
        budget.min === undefined || budget.max === undefined || budget.min <= budget.max,
      'Minimum budget must be less than or equal to maximum budget'
    )
    .optional(),
  bedrooms: z.union([z.number().int().nonnegative(), z.object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
  })]).optional(),
  preferredLocations: z.array(
    z.object({
      address: z.string().min(1),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
  ).optional(),
  preferredType: z.nativeEnum(PropertyType).optional(),
  amenities: z.array(z.string()).optional(),
  furnishStatus: z.enum(['furnished', 'semi-furnished', 'unfurnished']).optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.any().optional(),
});

export const interactionSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(['VIEW', 'LIKE', 'SAVE']),
});
