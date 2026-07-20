"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageReactionSchema = exports.updateMessageStatusSchema = exports.listMessagesQuerySchema = exports.sendAttachmentSchema = exports.createMessageSchema = exports.createConversationSchema = void 0;
const zod_1 = require("zod");
const optionalNonEmptyString = zod_1.z.preprocess((value) => (value === '' ? undefined : value), zod_1.z.string().min(1).optional());
exports.createConversationSchema = zod_1.z.object({
    ownerId: zod_1.z.string().min(1),
    renterId: zod_1.z.string().min(1),
    propertyId: zod_1.z.string().min(1).optional(),
});
exports.createMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(2000),
    replyToId: optionalNonEmptyString,
});
exports.sendAttachmentSchema = zod_1.z.object({
    caption: zod_1.z.string().max(2000).optional(),
    replyToId: optionalNonEmptyString,
});
exports.listMessagesQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(30),
    cursor: zod_1.z.string().optional(),
});
exports.updateMessageStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DELIVERED', 'READ']),
});
exports.messageReactionSchema = zod_1.z.object({
    emoji: zod_1.z
        .string()
        .min(1)
        .max(16)
        .refine((value) => /\p{Extended_Pictographic}/u.test(value), {
        message: 'emoji must be a valid emoji character',
    }),
});
