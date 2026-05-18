import { z } from 'zod';

/**
 * Verification Status Enum - MUST match Prisma enum
 */
export const VerificationStatusEnum = z.enum(['pending', 'under_review', 'approved', 'rejected', 'resubmit']);

/**
 * Upload Verification Documents Schema
 */
export const uploadVerificationDocumentsSchema = z.object({
  frontUrl: z.string().url('Invalid front document URL'),
  backUrl: z.string().url('Invalid back document URL'),
  livePhotoUrl: z.string().url('Invalid live photo URL'),
});

/**
 * Update Verification Status Schema (Admin only)
 */
export const updateVerificationStatusSchema = z.object({
  status: VerificationStatusEnum,
  note: z.string().optional(),
});

/**
 * Get Verification Documents Schema
 */
export const getVerificationDocumentsSchema = z.object({
  userId: z.string().optional(),
});

/**
 * Types inferred from schemas
 */
export type UploadVerificationDocumentsInput = z.infer<typeof uploadVerificationDocumentsSchema>;
export type UpdateVerificationStatusInput = z.infer<typeof updateVerificationStatusSchema>;
export type GetVerificationDocumentsInput = z.infer<typeof getVerificationDocumentsSchema>;
