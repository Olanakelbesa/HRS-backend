import { z } from 'zod';

const PROPERTY_STATUS_VALUES = ['AVAILABLE', 'PENDING', 'RENTED', 'UNAVAILABLE'] as const;

export const PropertyStatusEnum = z
  .string()
  .transform((val) => val.toUpperCase())
  .refine((val): val is (typeof PROPERTY_STATUS_VALUES)[number] =>
    PROPERTY_STATUS_VALUES.includes(val as (typeof PROPERTY_STATUS_VALUES)[number]),
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
 * Parses JSON-string fields sent via multipart/form-data.
 */
const jsonPreprocess = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, schema);

const priceSchema = z.object({
  value: z.coerce.number().positive(),
  currency: z.string().min(1),
});

const areaSchema = z.object({
  value: z.coerce.number().positive().nullable(),
  unit: z.string().min(1),
});

const leaseTermsSchema = z.object({
  secureDeposit: z
    .object({
      value: z.coerce.number().positive(),
      currency: z.string().min(1),
    })
    .optional(),
  conditions: MultiLangTextSchema.optional(),
});

/**
 * CREATE — category, price { value, currency }, area { value, unit }
 */
export const createPropertySchema = z.object({
  category: jsonPreprocess(MultiLangTextSchema),
  title: jsonPreprocess(MultiLangTextSchema),
  description: jsonPreprocess(MultiLangTextSchema),
  location: jsonPreprocess(z.object({ lat: z.coerce.number(), lng: z.coerce.number() })),
  address: jsonPreprocess(MultiLangTextSchema).optional(),
  price: jsonPreprocess(priceSchema),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  area: jsonPreprocess(areaSchema).optional(),
  amenities: jsonPreprocess(z.array(z.string()).optional()),
  furnishingStatus: z.string().optional(),
  images: jsonPreprocess(z.array(z.string()).optional()),
  videos: jsonPreprocess(z.array(z.string()).optional()),
  leaseTerms: jsonPreprocess(leaseTermsSchema.optional()),
  availableFrom: z.coerce.date().optional(),
});

/**
 * UPDATE
 */
export const updatePropertySchema = z.object({
  category: jsonPreprocess(MultiLangTextSchema).optional(),
  title: jsonPreprocess(MultiLangTextSchema).optional(),
  description: jsonPreprocess(MultiLangTextSchema).optional(),
  location: jsonPreprocess(z.object({ lat: z.coerce.number(), lng: z.coerce.number() })).optional(),
  address: jsonPreprocess(MultiLangTextSchema).optional(),
  price: jsonPreprocess(priceSchema).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  area: jsonPreprocess(areaSchema).optional(),
  amenities: jsonPreprocess(z.array(z.string()).optional()),
  furnishingStatus: z.string().optional(),
  images: jsonPreprocess(z.array(z.string()).optional()),
  videos: jsonPreprocess(z.array(z.string()).optional()),
  leaseTerms: jsonPreprocess(leaseTermsSchema.optional()),
  availableFrom: z.coerce.date().optional(),
  status: PropertyStatusEnum.optional(),
});

export const updatePropertyStatusSchema = z.object({
  status: PropertyStatusEnum,
});

export const getPropertiesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  lang: SupportedLanguageEnum.optional(),
  status: PropertyStatusEnum.optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  sortBy: SortByEnum.default('createdAt'),
  order: OrderEnum.default('desc'),
});

export const getPropertyByIdSchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
});

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

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type UpdatePropertyStatusInput = z.infer<typeof updatePropertyStatusSchema>;
export type GetPropertiesQueryInput = z.infer<typeof getPropertiesSchema>;
export type GetPropertyByIdParams = z.infer<typeof getPropertyByIdSchema>;
export type SupportedLanguage = z.infer<typeof SupportedLanguageEnum>;
export type AddPropertyTranslationInput = z.infer<typeof addPropertyTranslationSchema>;
export type UpdatePropertyTranslationInput = z.infer<typeof updatePropertyTranslationSchema>;
