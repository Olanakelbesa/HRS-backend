import { z } from 'zod';

/**
 * MUST match Prisma enums EXACTLY
 */
export const PropertyTypeEnum = z.enum(['VILLA', 'APARTMENT', 'CONDO', 'STUDIO', 'HOUSE']);

export const PropertyStatusEnum = z.enum(['AVAILABLE', 'PENDING', 'RENTED', 'UNAVAILABLE']);
export const SupportedLanguageEnum = z.enum(['en', 'am']);

export const SortByEnum = z.enum(['createdAt', 'price', 'viewsCount']);
export const OrderEnum = z.enum(['asc', 'desc']);

export const MultiLangTextSchema = z.object({
  en: z.string().min(1),
  am: z.string().min(1),
});

/**
 * CREATE
 */
export const createPropertySchema = z.object({
  type: PropertyTypeEnum,
  title: MultiLangTextSchema,
  description: MultiLangTextSchema,
  location: z.string().min(1),
  address: z.string().optional(),

  price: z.number().positive(),

  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  area: z.number().positive().optional(),

  amenities: z.any().optional(),
  furnishingType: z.string().optional(),

  images: z.array(z.string().url()).min(1),
  videos: z.array(z.string().url()).optional(),

  rentTerms: z.any().optional(),
});

/**
 * Update Property Schema
 */
export const updatePropertySchema = z
  .object({
    type: PropertyTypeEnum.optional(),
    title: MultiLangTextSchema.optional(),
    description: MultiLangTextSchema.optional(),
    location: z.string().min(1).optional(),
    address: z.string().optional(),
    price: z.number().positive().optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    area: z.number().positive().optional(),
    amenities: z.any().optional(),
    furnishingType: z.string().optional(),
    images: z.array(z.string().url()).optional(),
    videos: z.array(z.string().url()).optional(),
    rentTerms: z.any().optional(),
    status: PropertyStatusEnum.optional(),
  })
  .strict();

/**
 * Update Property Status
 */
export const updatePropertyStatusSchema = z.object({
  status: PropertyStatusEnum,
});

/**
 * Get Properties Query Schema
 */
export const getPropertiesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  lang: SupportedLanguageEnum.optional(),
  status: PropertyStatusEnum.optional(),
  type: PropertyTypeEnum.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  sortBy: SortByEnum.default('createdAt'),
  order: OrderEnum.default('desc'),
});

/**
 * Get Property By Id Schema
 */
export const getPropertyByIdSchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
});

/**
 * Delete Property Schema
 */
export const deletePropertySchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
});

export const addPropertyTranslationSchema = z.object({
  language: SupportedLanguageEnum,
  title: z.string().min(1),
  description: z.string().min(1),
});

export const updatePropertyTranslationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const deletePropertyTranslationSchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
  lang: SupportedLanguageEnum,
});

export const translationParamsSchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
  lang: SupportedLanguageEnum,
});

/**
 * Types inferred from schemas
 */
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type UpdatePropertyStatusInput = z.infer<typeof updatePropertyStatusSchema>;
export type GetPropertiesQueryInput = z.infer<typeof getPropertiesSchema>;
export type GetPropertyByIdParams = z.infer<typeof getPropertyByIdSchema>;
export type SupportedLanguage = z.infer<typeof SupportedLanguageEnum>;
export type AddPropertyTranslationInput = z.infer<typeof addPropertyTranslationSchema>;
export type UpdatePropertyTranslationInput = z.infer<typeof updatePropertyTranslationSchema>;
