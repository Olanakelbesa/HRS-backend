"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectPropertySchema = exports.approvePropertySchema = exports.updateReviewStatusSchema = exports.broadcastNotificationSchema = exports.resolveVerificationSchema = exports.updateReportStatusSchema = exports.updateAgreementStatusSchema = exports.createAgreementSchema = exports.updateUserVerificationSchema = exports.updateUserStatusSchema = exports.paramIdSchema = exports.getAdminPropertiesQuerySchema = exports.getUsersQuerySchema = exports.adminUpdatePropertyBodySchema = exports.adminUpdatePropertyParamsSchema = exports.getAuditLogsQuerySchema = exports.getPendingVerificationsQuerySchema = exports.paginationQuerySchema = exports.getOverviewQuerySchema = exports.getAnalyticsQuerySchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.getAnalyticsQuerySchema = zod_1.z.object({
    range: zod_1.z.enum(['7d', '30d', '90d']).optional(),
});
exports.getOverviewQuerySchema = zod_1.z.object({
    range: zod_1.z.enum(['weekly', 'monthly']).default('monthly'),
    timezone: zod_1.z.string().trim().min(1).optional(),
});
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().trim().min(1).optional(),
});
exports.getPendingVerificationsQuerySchema = exports.paginationQuerySchema.extend({
    emailVerified: zod_1.z.coerce.boolean().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'first_name', 'last_name']).default('createdAt'),
    order: zod_1.z.enum(['asc', 'desc']).default('asc'),
});
exports.getAuditLogsQuerySchema = exports.paginationQuerySchema.extend({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    eventType: zod_1.z.string().min(1).optional(),
    entityType: zod_1.z.string().min(1).optional(),
    actorId: zod_1.z.string().min(1).optional(),
    entityId: zod_1.z.string().min(1).optional(),
    dateFrom: zod_1.z.coerce.date().optional(),
    dateTo: zod_1.z.coerce.date().optional(),
    sortBy: zod_1.z.enum(['createdAt']).default('createdAt'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
const PropertyTypeEnum = zod_1.z.nativeEnum(client_1.PropertyType);
const PropertyStatusEnum = zod_1.z.nativeEnum(client_1.PropertyStatus);
const MultiLangTextSchema = zod_1.z.object({
    en: zod_1.z.string().min(1),
    am: zod_1.z.string().min(1),
});
const AmenitySchema = zod_1.z.union([
    MultiLangTextSchema,
    zod_1.z.string().min(1).transform((value) => ({ en: value, am: value })),
]);
exports.adminUpdatePropertyParamsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Property id is required'),
});
exports.adminUpdatePropertyBodySchema = zod_1.z
    .object({
    type: PropertyTypeEnum.optional(),
    status: PropertyStatusEnum.optional(),
    title: MultiLangTextSchema.optional(),
    description: MultiLangTextSchema.optional(),
    location: zod_1.z.string().min(1).optional(),
    address: zod_1.z.string().optional(),
    price: zod_1.z.number().positive().optional(),
    bedrooms: zod_1.z.number().int().min(0).optional(),
    bathrooms: zod_1.z.number().int().min(0).optional(),
    area: zod_1.z.number().positive().optional(),
    amenities: zod_1.z.array(AmenitySchema).optional(),
    furnishingType: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string().url()).optional(),
    videos: zod_1.z.array(zod_1.z.string().url()).optional(),
    rentTerms: zod_1.z.any().optional(),
    isDeleted: zod_1.z.boolean().optional(),
})
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided for update',
});
// Newly Added Schemas for Admin
exports.getUsersQuerySchema = exports.paginationQuerySchema.extend({
    role: zod_1.z.enum(['renter', 'owner', 'admin']).optional(),
    status: zod_1.z.enum(['active', 'suspended', 'pending']).optional(),
});
exports.getAdminPropertiesQuerySchema = exports.paginationQuerySchema.extend({
    status: zod_1.z.enum(['AVAILABLE', 'PENDING', 'RENTED', 'UNAVAILABLE', 'MAINTENANCE', 'RESTRICTED']).optional(),
});
exports.paramIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.updateUserStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'suspended', 'pending']),
});
exports.updateUserVerificationSchema = zod_1.z.object({
    verificationState: zod_1.z.enum(['verified', 'pending', 'rejected', 'resubmit']),
    comment: zod_1.z.string().trim().min(1).max(1000).optional(),
});
exports.createAgreementSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1),
    renterId: zod_1.z.string().min(1),
    ownerId: zod_1.z.string().min(1),
    monthlyRent: zod_1.z.number().positive(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    status: zod_1.z
        .enum([
        'draft',
        'sent',
        'payment_pending',
        'completed',
        'rejected',
        'cancelled',
        'terminated',
        'expired',
    ])
        .default('draft'),
});
exports.updateAgreementStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        'draft',
        'sent',
        'payment_pending',
        'completed',
        'rejected',
        'cancelled',
        'terminated',
        'expired',
    ]),
});
exports.updateReportStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'in_review', 'resolved', 'dismissed']),
});
exports.resolveVerificationSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'under_review', 'approved', 'rejected', 'resubmit']),
    note: zod_1.z.string().trim().min(1).max(1000).optional(),
});
var schema_1 = require("../notifications/schema");
Object.defineProperty(exports, "broadcastNotificationSchema", { enumerable: true, get: function () { return schema_1.broadcastNotificationSchema; } });
exports.updateReviewStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['published', 'flagged', 'removed']),
});
exports.approvePropertySchema = zod_1.z.object({
    note: zod_1.z.string().trim().min(1).max(1000).optional(),
});
exports.rejectPropertySchema = zod_1.z.object({
    reason: zod_1.z.string().trim().min(1).max(100).default('REJECTED_BY_ADMIN'),
    note: zod_1.z.string().trim().min(1).max(1000).optional(),
});
