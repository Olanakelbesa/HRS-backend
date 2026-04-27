import { z } from 'zod';

/**
 * MUST match Prisma enums EXACTLY
 */
export const PropertyTypeEnum = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      // Remove whitespace and possible exact literal quotes
      let clean = val.trim();
      if (clean.startsWith('"') && clean.endsWith('"')) {
        clean = clean.slice(1, -1);
      }
      return clean.toUpperCase();
    }
    return val;
  },
  z.enum(['VILLA', 'APARTMENT', 'CONDO', 'STUDIO', 'HOUSE','PENTHOUSE'])
);

const PROPERTY_STATUS_VALUES = ['AVAILABLE', 'PENDING', 'RENTED', 'UNAVAILABLE'] as const;

export const PropertyStatusEnum = z
  .string()
  .transform((val) => val.toUpperCase())
  .refine((val): val is (typeof PROPERTY_STATUS_VALUES)[number] =>
    PROPERTY_STATUS_VALUES.includes(val as any),
    { message: 'Invalid status' }
  );
export const SupportedLanguageEnum = z.enum(['en', 'am']);

export const SortByEnum = z.enum(['createdAt', 'price', 'viewsCount']);
export const OrderEnum = z.enum(['asc', 'desc']);

export const MultiLangTextSchema = z.object({
  en: z.string().min(1),
  am: z.string().min(1),
});

/**
 * Helper to parse JSON strings from multipart/form-data
 */
const jsonPreprocess = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
    return val;
  }, schema);

/**
 * CREATE
 */
export const createPropertySchema = z.object({
  type: PropertyTypeEnum,
  title: jsonPreprocess(MultiLangTextSchema),
  description: jsonPreprocess(MultiLangTextSchema),
  location: z.string().min(1),
  address: z.string().optional(),

  price: z.coerce.number().positive(),

  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  area: z.coerce.number().positive().optional(),

  amenities: jsonPreprocess(z.any().optional()),
  furnishingType: z.string().optional(),

  images: jsonPreprocess(z.array(z.string()).optional()), // Files uploaded via multer, URLs added in controller
  videos: jsonPreprocess(z.array(z.string()).optional()),

  rentTerms: jsonPreprocess(z.any().optional()),
});

/**
 * Update Property Schema
 */
export const updatePropertySchema = z
  .object({
    type: PropertyTypeEnum.optional(),
    title: jsonPreprocess(MultiLangTextSchema).optional(),
    description: jsonPreprocess(MultiLangTextSchema).optional(),
    location: z.string().min(1).optional(),
    address: z.string().optional(),
    price: z.coerce.number().positive().optional(),
    bedrooms: z.coerce.number().int().min(0).optional(),
    bathrooms: z.coerce.number().int().min(0).optional(),
    area: z.coerce.number().positive().optional(),
    amenities: jsonPreprocess(z.any().optional()),
    furnishingType: z.string().optional(),
    images: jsonPreprocess(z.array(z.string().url()).optional()),
    videos: jsonPreprocess(z.array(z.string().url()).optional()),
    rentTerms: jsonPreprocess(z.any().optional()),
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
