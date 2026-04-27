import prisma from "../../config/database";

class ReviewService {
  /**
   * Create a review
   * Enforces one review per user per property
   */
  async createReview(
    reviewerId: string,
    propertyId: string,
    rating: number,
    comment?: string
  ) {
    const existing = await prisma.review.findUnique({
      where: {
        reviewerId_propertyId: { reviewerId, propertyId },
      },
    });

    if (existing) {
      throw new Error("You have already reviewed this property");
    }

    return prisma.review.create({
      data: {
        reviewerId,
        propertyId,
        rating,
        comment: comment ?? "", // fix undefined issue
      },
      include: {
        reviewer: {
          select: { id: true, email: true },
        },
      },
    });
  }

  /**
   * Update a review (only owner can update)
   */
  async updateReview(
    reviewId: string,
    reviewerId: string,
    rating?: number,
    comment?: string
  ) {
    const result = await prisma.review.updateMany({
      where: {
        id: reviewId,
        reviewerId,
      },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
      },
    });

    if (result.count === 0) {
      throw new Error("Review not found or not authorized");
    }

    return prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: { id: true, email: true },
        },
      },
    });
  }

  /**
   * Delete a review (only owner can delete)
   */
  async deleteReview(reviewId: string, reviewerId: string) {
    const result = await prisma.review.deleteMany({
      where: {
        id: reviewId,
        reviewerId,
      },
    });

    if (result.count === 0) {
      throw new Error("Review not found or not authorized");
    }

    return { message: "Review deleted successfully" };
  }

  /**
   * Get all reviews for a property
   */
  async getPropertyReviews(propertyId: string) {
    return prisma.review.findMany({
      where: { propertyId },
      include: {
        reviewer: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get reviews written by a user
   */
  async getUserReviews(reviewerId: string) {
    return prisma.review.findMany({
      where: { reviewerId },
      include: {
        property: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get property rating statistics
   */
  async getPropertyReviewStats(propertyId: string) {
    const stats = await prisma.review.aggregate({
      where: { propertyId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: stats._avg.rating ?? 0,
      totalReviews: stats._count.rating,
    };
  }
}

export default new ReviewService();