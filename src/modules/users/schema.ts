import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    phone: z.string().min(6).optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    image: z.string().url().optional(),
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

export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
