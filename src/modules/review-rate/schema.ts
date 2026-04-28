import { z } from "zod";

export const createReviewSchema = z.object({
  propertyId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional()
});

export const replyReviewSchema = z.object({
  reply: z.string().min(1).max(1000)
});