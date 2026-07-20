"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertySearchSchema = void 0;
const zod_1 = require("zod");
exports.propertySearchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1, 'Search query is required'),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
    currency: zod_1.z.enum(['ETB', 'USD']).default('ETB'),
});
