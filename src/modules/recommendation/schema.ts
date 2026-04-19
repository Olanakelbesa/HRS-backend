import { z } from "zod";

export const preferenceSchema = z.object({
  preferredPriceMin: z.number().optional(),
  preferredPriceMax: z.number().optional(),
  preferredBedrooms: z.number().optional(),
  preferredLocations: z.array(z.string()).optional(),
  preferredAmenities: z.array(z.string()).optional(),
  preferredType: z.enum([
    "VILLA",
    "APARTMENT",
    "CONDO",
    "STUDIO",
    "HOUSE"
  ]).optional()
});

export const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.any().optional()
});

export const interactionSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(["VIEW", "LIKE", "SAVE"])
});