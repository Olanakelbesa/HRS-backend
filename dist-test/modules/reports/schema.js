"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitReportSchema = exports.submitOwnerResponseSchema = exports.reportIdParamSchema = exports.getOwnerReportsQuerySchema = void 0;
const zod_1 = require("zod");
// ── Query: GET /reports (list reports against owner) ─────────────────────────
exports.getOwnerReportsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10),
    status: zod_1.z
        .enum(['open', 'in_review', 'resolved', 'dismissed'])
        .optional(),
});
// ── Params: GET /reports/:reportId ────────────────────────────────────────────
exports.reportIdParamSchema = zod_1.z.object({
    reportId: zod_1.z.string().min(1, 'reportId is required'),
});
// ── Body: POST /reports/:reportId/response ────────────────────────────────────
exports.submitOwnerResponseSchema = zod_1.z.object({
    response: zod_1.z
        .string()
        .min(10, 'Response must be at least 10 characters')
        .max(2000, 'Response must not exceed 2000 characters'),
});
const parseStringArray = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null)
        return undefined;
    if (Array.isArray(val))
        return val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed)
            return undefined;
        if (trimmed.startsWith('[')) {
            try {
                return JSON.parse(trimmed);
            }
            catch {
                return [trimmed];
            }
        }
        return [trimmed];
    }
    return undefined;
}, zod_1.z.array(zod_1.z.string().min(1)).optional());
exports.submitReportSchema = zod_1.z.object({
    targetType: zod_1.z.enum(['property', 'user']),
    targetId: zod_1.z.string().min(1, 'targetId is required'),
    category: zod_1.z.string().min(3, 'Category must be at least 3 characters').max(100),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters').max(2000),
    images: parseStringArray,
});
