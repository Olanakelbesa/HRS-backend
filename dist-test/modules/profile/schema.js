"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updateLanguagePreferenceSchema = exports.updateNotificationPreferencesSchema = exports.updateBankDetailsSchema = exports.uploadDocumentSchema = exports.uploadAvatarSchema = exports.updatePersonalInfoSchema = void 0;
const zod_1 = require("zod");
// ===========================
// Profile Schemas
// ===========================
exports.updatePersonalInfoSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(2).max(100).optional(),
        phone: zod_1.z
            .string()
            .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format')
            .optional(),
        location: zod_1.z.string().max(200).optional(),
        bio: zod_1.z.string().max(500).optional(),
    }),
});
// ===========================
// Avatar Upload Schema
// ===========================
exports.uploadAvatarSchema = zod_1.z.object({
    file: zod_1.z.object({
        size: zod_1.z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB'),
        mimetype: zod_1.z.enum(['image/jpeg', 'image/png', 'image/jpg'], {
            message: 'Only JPEG, PNG formats are allowed',
        }),
    }),
});
// ===========================
// Verification Document Schema
// ===========================
exports.uploadDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        documentType: zod_1.z.enum(['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'OWNER_PHOTO'], {
            message: 'Invalid document type',
        }),
    }),
    file: zod_1.z.object({
        size: zod_1.z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB'),
        mimetype: zod_1.z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'], {
            message: 'Only PDF, JPEG, PNG formats are allowed',
        }),
    }),
});
// ===========================
// Bank Details Schema
// ===========================
exports.updateBankDetailsSchema = zod_1.z.object({
    body: zod_1.z.object({
        bankName: zod_1.z.string().min(2).max(100),
        accountNumber: zod_1.z.string().min(8).max(50),
        holderName: zod_1.z.string().min(2).max(100),
        branch: zod_1.z.string().max(100).optional(),
    }),
});
// ===========================
// Notification Preferences Schema
// ===========================
exports.updateNotificationPreferencesSchema = zod_1.z.object({
    body: zod_1.z.object({
        appointments: zod_1.z.boolean().optional(),
        agreements: zod_1.z.boolean().optional(),
        payments: zod_1.z.boolean().optional(),
        reviews: zod_1.z.boolean().optional(),
        reports: zod_1.z.boolean().optional(),
        system: zod_1.z.boolean().optional(),
    }),
});
// ===========================
// Language Preference Schema
// ===========================
exports.updateLanguagePreferenceSchema = zod_1.z.object({
    body: zod_1.z.object({
        language: zod_1.z.enum(['en', 'am', 'or', 'ti']),
    }),
});
// ===========================
// Change Password Schema
// ===========================
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        currentPassword: zod_1.z.string().min(8, 'Current password is required'),
        newPassword: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password must be at most 128 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
    })
        .refine((data) => data.currentPassword !== data.newPassword, {
        message: 'New password must be different from current password',
        path: ['newPassword'],
    }),
});
