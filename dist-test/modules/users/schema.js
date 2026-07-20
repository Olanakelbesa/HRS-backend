"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatusSchema = exports.getUserByIdSchema = exports.updateUserRoleSchema = exports.changePasswordSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        first_name: zod_1.z.string().min(1).optional(),
        last_name: zod_1.z.string().min(1).optional(),
        phone: zod_1.z.string().min(6).optional(),
        location: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
        image: zod_1.z.string().url().optional(),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(6),
        newPassword: zod_1.z.string().min(6),
    }),
});
exports.updateUserRoleSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().cuid(),
    }),
    body: zod_1.z.object({
        role: zod_1.z.enum(['renter', 'owner', 'admin']),
    }),
});
exports.getUserByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().cuid(),
    }),
});
exports.updateUserStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().cuid(),
    }),
    body: zod_1.z.object({
        isActive: zod_1.z.boolean(),
    }),
});
