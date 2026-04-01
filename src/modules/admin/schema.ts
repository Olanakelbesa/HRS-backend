import { z } from 'zod';

export const getAnalyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).optional(),
});

export const getPendingVerificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  emailVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'first_name', 'last_name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const getAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().min(1).optional(),
  eventType: z.string().min(1).optional(),
  entityType: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const PropertyTypeEnum = z.enum(['VILLA', 'APARTMENT', 'CONDO', 'STUDIO', 'HOUSE']);
const PropertyStatusEnum = z.enum(['AVAILABLE', 'PENDING', 'RENTED', 'UNAVAILABLE']);

const MultiLangTextSchema = z.object({
  en: z.string().min(1),
  am: z.string().min(1),
});

export const adminUpdatePropertyParamsSchema = z.object({
  id: z.string().min(1, 'Property id is required'),
});

export const adminUpdatePropertyBodySchema = z
  .object({
    type: PropertyTypeEnum.optional(),
    status: PropertyStatusEnum.optional(),
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
    isDeleted: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type GetAnalyticsQueryInput = z.infer<typeof getAnalyticsQuerySchema>;
export type GetPendingVerificationsQueryInput = z.infer<typeof getPendingVerificationsQuerySchema>;
export type GetAuditLogsQueryInput = z.infer<typeof getAuditLogsQuerySchema>;
export type AdminUpdatePropertyParamsInput = z.infer<typeof adminUpdatePropertyParamsSchema>;
export type AdminUpdatePropertyBodyInput = z.infer<typeof adminUpdatePropertyBodySchema>;
