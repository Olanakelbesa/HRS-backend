import { Injectable } from '@nestjs/common';
import reviewService from '../review-rate/service';

@Injectable()
export class ReviewsApiService {
  createReview(
    userId: string,
    propertyId: string,
    rating: number,
    comment?: string,
  ) {
    return reviewService.createReview(userId, propertyId, rating, comment);
  }

  getPropertyReviews(propertyId: string) {
    return reviewService.getPropertyReviews(propertyId);
  }

  getUserReviews(userId: string) {
    return reviewService.getUserReviews(userId);
  }

  updateReview(
    reviewId: string,
    userId: string,
    rating?: number,
    comment?: string,
  ) {
    return reviewService.updateReview(reviewId, userId, rating, comment);
  }

  deleteReview(reviewId: string, userId: string) {
    return reviewService.deleteReview(reviewId, userId);
  }

  getPropertyReviewStats(propertyId: string) {
    return reviewService.getPropertyReviewStats(propertyId);
  }

  getOwnerReviews(
    ownerId: string,
    opts: {
      rating?: number;
      sort?: 'newest' | 'oldest';
      page?: number;
      limit?: number;
    },
  ) {
    return reviewService.getOwnerReviews(ownerId, opts);
  }

  getOwnerReviewStats(ownerId: string) {
    return reviewService.getOwnerReviewStats(ownerId);
  }

  replyToReview(reviewId: string, ownerId: string, reply: string) {
    return reviewService.replyToReview(reviewId, ownerId, reply);
  }
}
