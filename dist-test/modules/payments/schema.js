"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chapaVerifySchema = exports.exportPaymentsQuerySchema = exports.listPaymentsQuerySchema = void 0;
const zod_1 = require("zod");
const gatewayStatus = zod_1.z.enum(['pending', 'processing', 'success', 'failed', 'expired']);
exports.listPaymentsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(6),
    status: gatewayStatus.optional(),
    search: zod_1.z.string().optional(),
});
exports.exportPaymentsQuerySchema = zod_1.z.object({
    status: gatewayStatus.optional(),
    search: zod_1.z.string().optional(),
});
exports.chapaVerifySchema = zod_1.z.object({
    tx_ref: zod_1.z.string().min(1),
});
