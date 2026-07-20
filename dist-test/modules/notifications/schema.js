"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotificationsQuerySchema = exports.broadcastNotificationSchema = void 0;
const zod_1 = require("zod");
exports.broadcastNotificationSchema = zod_1.z.object({
    audience: zod_1.z.enum(['all', 'renters', 'owners', 'verified_owners']),
    title: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
});
exports.listNotificationsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
