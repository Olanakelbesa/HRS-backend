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
    res.status(204).send();
  };

  getPropertyStats: RequestHandler<PropertyParams> = async (req, res) => {
    const stats = await reviewService.getPropertyReviewStats(
      req.params.propertyId
    );
    res.json(stats);
  };
}

export default new ReviewController();