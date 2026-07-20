"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyReviewSchema = exports.updateReviewSchema = exports.createReviewSchema = void 0;
const zod_1 = require("zod");
exports.createReviewSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(500).optional()
});
exports.updateReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5).optional(),
    comment: zod_1.z.string().max(500).optional()
});
exports.replyReviewSchema = zod_1.z.object({
    reply: zod_1.z.string().min(1).max(1000)
});
