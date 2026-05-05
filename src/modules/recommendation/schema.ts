import { z } from 'zod';

const locationSchema = z.object({
  city: z.string().min(1),
  state: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const preferenceSchema = z.object({
  preferredLocations: z.array(locationSchema).optional(),
  budget: z
    .object({ min: z.number().nonnegative().optional(), max: z.number().nonnegative().optional() })
    .optional(),
  bedrooms: z
    .object({
      min: z.number().int().nonnegative().optional(),
      max: z.number().int().nonnegative().optional(),
    })
    .optional(),
  bathrooms: z
    .object({
      min: z.number().int().nonnegative().optional(),
      max: z.number().int().nonnegative().optional(),
    })
    .optional(),
  petsAllowed: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  furnished: z.boolean().optional(),
  moveInDate: z.string().optional(),
  leaseLengthMonths: z.number().int().positive().optional(),
  searchRadiusKm: z.number().nonnegative().optional(),
  commuteMinutes: z.number().nonnegative().optional(),
  smokingAllowed: z.boolean().optional(),
  languages: z.array(z.string()).optional(),
  notes: z.string().optional(),
  preferredType: z
    .enum(['VILLA', 'APARTMENT', 'CONDO', 'STUDIO', 'HOUSE']) // keep existing enum mapping
    .optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.any().optional(),
});

export const interactionSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(['VIEW', 'LIKE', 'SAVE']),
});
