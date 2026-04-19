import { z } from 'zod';

export const getAnalyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
});

export const getPendingVerificationsQuerySchema = paginationQuerySchema.extend({
  emailVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'first_name', 'last_name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const getAuditLogsQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
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

// Newly Added Schemas for Admin
export const getUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['renter', 'owner', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
});

export const paramIdSchema = z.object({
  id: z.string().min(1),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
});

export const updateUserVerificationSchema = z.object({
  verificationState: z.enum(['verified', 'pending_otp', 'pending_documents', 'rejected']),
});

export const createAgreementSchema = z.object({
  propertyId: z.string().min(1),
  renterId: z.string().min(1),
  ownerId: z.string().min(1),
  monthlyRent: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['active', 'pending_renter', 'pending_owner', 'draft', 'terminated', 'expired']).default('draft'),
});

export const updateAgreementStatusSchema = z.object({
  status: z.enum(['active', 'pending_renter', 'pending_owner', 'draft', 'terminated', 'expired']),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['open', 'in_review', 'resolved', 'dismissed']),
});

export const resolveVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const broadcastNotificationSchema = z.object({
  audience: z.enum(['all', 'renters', 'owners', 'verified_owners']),
  title: z.string().min(1),
  message: z.string().min(1),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(['published', 'flagged', 'removed']),
});

export type GetAnalyticsQueryInput = z.infer<typeof getAnalyticsQuerySchema>;
export type GetPendingVerificationsQueryInput = z.infer<typeof getPendingVerificationsQuerySchema>;
export type GetAuditLogsQueryInput = z.infer<typeof getAuditLogsQuerySchema>;
export type AdminUpdatePropertyParamsInput = z.infer<typeof adminUpdatePropertyParamsSchema>;
export type AdminUpdatePropertyBodyInput = z.infer<typeof adminUpdatePropertyBodySchema>;
export type GetUsersQueryInput = z.infer<typeof getUsersQuerySchema>;
