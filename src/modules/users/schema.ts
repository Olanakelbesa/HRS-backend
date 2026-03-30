import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    // role: z.enum(['USER', 'ADMIN']).optional(), // when you add roles
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
  }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    role: z.enum(['renter', 'owner', 'admin']),
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
