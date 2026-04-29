import { z } from 'zod';

// ── Query: GET /reports (list reports against owner) ─────────────────────────
export const getOwnerReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z
    .enum(['open', 'in_review', 'resolved', 'dismissed'])
    .optional(),
});

export type GetOwnerReportsQueryInput = z.infer<typeof getOwnerReportsQuerySchema>;

// ── Params: GET /reports/:reportId ────────────────────────────────────────────
export const reportIdParamSchema = z.object({
  reportId: z.string().min(1, 'reportId is required'),
});

export type ReportIdParamInput = z.infer<typeof reportIdParamSchema>;

// ── Body: POST /reports/:reportId/response ────────────────────────────────────
export const submitOwnerResponseSchema = z.object({
  response: z
    .string()
    .min(10, 'Response must be at least 10 characters')
    .max(2000, 'Response must not exceed 2000 characters'),
});

export type SubmitOwnerResponseInput = z.infer<typeof submitOwnerResponseSchema>;
