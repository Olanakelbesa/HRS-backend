"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.resendVerificationCodeSchema = exports.verifyEmailSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
const phoneSchema = zod_1.z
    .string()
    .trim()
    .regex(/^\+?[0-9]\d{7,14}$/, 'Phone number must be valid (8-15 digits, optional +)');
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: passwordSchema,
        first_name: zod_1.z.string().min(1, 'First name is required').optional(),
        last_name: zod_1.z.string().min(1, 'Last name is required').optional(),
        phone: zod_1.z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), phoneSchema.optional()),
        role: zod_1.z
            .preprocess((value) => (typeof value === 'string' ? value.trim().toLowerCase() : value), zod_1.z.enum(['renter', 'owner']))
            .optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.verifyEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
    }),
});
exports.resendVerificationCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string()
            .trim()
            .min(1, 'Email is required')
            .email('Invalid email address')
            .transform((value) => value.toLowerCase()),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().regex(/^\d{6}$/, 'Reset code must be exactly 6 digits'),
        password: passwordSchema,
    }),
});
