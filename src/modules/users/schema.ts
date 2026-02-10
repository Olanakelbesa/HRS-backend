import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    // role: z.enum(['USER', 'ADMIN']).optional(), // when you add roles
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
