import { z } from 'zod';

const localizedTextSchema = z.object({
  en: z.string().min(1),
  am: z.string().min(1).optional(),
});

const localizedValueSchema = z.union([localizedTextSchema, z.string().min(1)]);

const locationSchema = z.object({
  city: localizedValueSchema,
  region: localizedValueSchema.optional(),
  state: localizedValueSchema.optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const propertyTypeSchema = z.union([localizedTextSchema, z.string().min(1)]);
const furnishStatusSchema = z.enum(['furnished', 'semiFurnished', 'unfunished']);

export const preferenceSchema = z.object({
  preferredLocations: z.array(locationSchema).optional(),
  budget: z
    .object({
      min: z.number().nonnegative().optional(),
      max: z.number().nonnegative().optional(),
      currency: z.string().min(1).optional(),
    })
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
  furnishStatus: furnishStatusSchema.optional(),
  furnished: z.boolean().optional(),
  moveInDate: z.string().optional(),
  leaseLengthMonths: z.number().int().positive().optional(),
  searchRadiusKm: z.number().nonnegative().optional(),
  commuteMinutes: z.number().nonnegative().optional(),
  smokingAllowed: z.boolean().optional(),
  languages: z.array(z.string()).optional(),
  notes: z.union([localizedTextSchema, z.string().min(1)]).optional(),
  preferredPropertyType: propertyTypeSchema.optional(),
  preferredType: z.enum(['VILLA', 'APARTMENT', 'CONDO', 'STUDIO', 'HOUSE', 'PENTHOUSE']).optional(),
  locale: z.enum(['en', 'am']).optional(),
  supportedLocales: z.array(z.enum(['en', 'am'])).optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.any().optional(),
});

export const interactionSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(['VIEW', 'LIKE', 'SAVE']),
});
