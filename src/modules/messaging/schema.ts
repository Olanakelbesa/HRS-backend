import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional()
);

export const createConversationSchema = z.object({
  ownerId: z.string().min(1),
  renterId: z.string().min(1),
  propertyId: z.string().min(1).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  replyToId: optionalNonEmptyString,
});

export const sendAttachmentSchema = z.object({
  caption: z.string().max(2000).optional(),
  replyToId: optionalNonEmptyString,
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(30),
  cursor: z.string().optional(),
});

export const updateMessageStatusSchema = z.object({
  status: z.enum(['DELIVERED', 'READ']),
});

export const messageReactionSchema = z.object({
  emoji: z
    .string()
    .min(1)
    .max(16)
    .refine((value) => /\p{Extended_Pictographic}/u.test(value), {
      message: 'emoji must be a valid emoji character',
    }),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type UpdateMessageStatusInput = z.infer<typeof updateMessageStatusSchema>;
export type SendAttachmentInput = z.infer<typeof sendAttachmentSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
