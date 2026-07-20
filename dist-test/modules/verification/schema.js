"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerificationDocumentsSchema = exports.updateVerificationStatusSchema = exports.uploadVerificationDocumentsSchema = exports.VerificationStatusEnum = void 0;
const zod_1 = require("zod");
/**
 * Verification Status Enum - MUST match Prisma enum
 */
exports.VerificationStatusEnum = zod_1.z.enum(['pending', 'under_review', 'approved', 'rejected', 'resubmit']);
/**
 * Upload Verification Documents Schema
 */
exports.uploadVerificationDocumentsSchema = zod_1.z.object({
    frontUrl: zod_1.z.string().url('Invalid front document URL'),
    backUrl: zod_1.z.string().url('Invalid back document URL'),
    livePhotoUrl: zod_1.z.string().url('Invalid live photo URL'),
});
/**
 * Update Verification Status Schema (Admin only)
 */
exports.updateVerificationStatusSchema = zod_1.z.object({
    status: exports.VerificationStatusEnum,
    note: zod_1.z.string().optional(),
});
/**
 * Get Verification Documents Schema
 */
exports.getVerificationDocumentsSchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
});
