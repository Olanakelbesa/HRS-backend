import { RequestHandler } from "express";
import reviewService from "./service";
import { CreateReviewInput, UpdateReviewInput } from "../../types/types";
import { AuthenticatedRequest } from "../../types/request";

type ReviewIdParams = { reviewId: string };
type PropertyParams = { propertyId: string };

class ReviewController {
  create: RequestHandler<{}, any, Omit<CreateReviewInput, "userId">> =
    async (req, res) => {
      const { userId } = req as AuthenticatedRequest;

      const { propertyId, rating, comment } = req.body;

      const review = await reviewService.createReview(
        userId,
        propertyId,
        rating,
        comment
      );

      res.status(201).json(review);
    };

  getPropertyReviews: RequestHandler<PropertyParams> = async (req, res) => {
    const reviews = await reviewService.getPropertyReviews(
      req.params.propertyId
    );
    res.json(reviews);
  };

  getMyReviews: RequestHandler = async (req, res) => {
    const { userId } = req as AuthenticatedRequest;

    const reviews = await reviewService.getUserReviews(userId);
    res.json(reviews);
  };

  update: RequestHandler<ReviewIdParams, any, UpdateReviewInput> =
    async (req, res) => {
      const { userId } = req as unknown as AuthenticatedRequest;

      const review = await reviewService.updateReview(
        req.params.reviewId,
        userId,
        req.body.rating,
        req.body.comment
      );

      res.json(review);
    };

  remove: RequestHandler<ReviewIdParams> = async (req, res) => {
    const { userId } = req as unknown as AuthenticatedRequest;
    await reviewService.deleteReview(req.params.reviewId, userId);
    res.status(200).json({
    status: "success",
    message: "Review deleted successfully",
  });
  };

  getPropertyStats: RequestHandler<PropertyParams> = async (req, res) => {
    const stats = await reviewService.getPropertyReviewStats(
      req.params.propertyId
    );
    res.json(stats);
  };

  getOwnerReviews: RequestHandler = async (req, res) => {
    const { userId } = req as AuthenticatedRequest;

    const { rating, sort, page, limit } = req.query;

    const result = await reviewService.getOwnerReviews(userId, {
      rating: rating ? Number(rating) : undefined,
      sort: sort as "newest" | "oldest" | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(result);
  };

  getOwnerStats: RequestHandler = async (req, res) => {
    const { userId } = req as AuthenticatedRequest;

    const stats = await reviewService.getOwnerReviewStats(userId);
    res.json(stats);
  };

  replyToReview: RequestHandler<
    ReviewIdParams,
    any,
    { reply: string }
  > = async (req, res) => {
    const { userId } = req as unknown as AuthenticatedRequest;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      res.status(400).json({ error: "Reply content is required" });
      return;
    }

    if (reply.length > 1000) {
      res.status(400).json({ error: "Reply must be less than 1000 characters" });
      return;
    }

    try {
      const review = await reviewService.replyToReview(
        req.params.reviewId,
        userId,
        reply.trim()
      ) as any;

      res.json({
        reviewId: review.id,
        rating: review.rating,
        comment: review.comment,
        reply: review.reply,
        repliedAt: review.repliedAt,
        propertyId: review.propertyId,
        propertyTitle: review.property?.title,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message === "Review not found") {
        res.status(404).json({ error: message });
      } else if (message.includes("only reply to reviews")) {
        res.status(403).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  };
}

export default new ReviewController();