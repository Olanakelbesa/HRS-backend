"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportParamsSchema = exports.exportQuerySchema = exports.historyQuerySchema = exports.propertyStateParamsSchema = exports.recordScheduleSchema = exports.recordShareSchema = exports.recordContactSchema = exports.savePropertySchema = exports.likePropertySchema = exports.recordViewSchema = void 0;
const zod_1 = require("zod");
const baseMutationSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1),
    source: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().min(1, 'idempotencyKey is required for all mutating requests'),
});
exports.recordViewSchema = baseMutationSchema.extend({
    viewDuration: zod_1.z.number().int().nonnegative().optional(),
    imagesViewed: zod_1.z.number().int().nonnegative().optional(),
});
exports.likePropertySchema = baseMutationSchema;
exports.savePropertySchema = baseMutationSchema;
exports.recordContactSchema = baseMutationSchema.extend({
    metadata: zod_1.z
        .object({
        contactMethod: zod_1.z.string().optional(),
    })
        .passthrough()
        .optional(),
});
exports.recordShareSchema = baseMutationSchema.extend({
    metadata: zod_1.z
        .object({
        shareMethod: zod_1.z.string().optional(),
        recipientCount: zod_1.z.number().int().nonnegative().optional(),
    })
        .passthrough()
        .optional(),
});
exports.recordScheduleSchema = baseMutationSchema.extend({
    metadata: zod_1.z
        .object({
        scheduledDate: zod_1.z.string().optional(),
        scheduledTimeSlot: zod_1.z.string().optional(),
        appointmentId: zod_1.z.string().optional(),
    })
        .passthrough()
        .optional(),
});
exports.propertyStateParamsSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1),
});
exports.historyQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
    type: zod_1.z.string().optional(),
    propertyId: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
exports.exportQuerySchema = zod_1.z.object({
    after: zod_1.z.string().datetime().optional(),
});
exports.exportParamsSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
});
