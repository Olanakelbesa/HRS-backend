import prisma from "../../config/database";

class ReviewService {
  /**
   * Create a review
   * Enforces one review per user per property
   */
  async createReview(
    userId: string,
    propertyId: string,
    rating: number,
    comment?: string
  ) {
    const existing = await prisma.review.findUnique({
      where: {
        userId_propertyId: { userId, propertyId },
      },
    });

    if (existing) {
      throw new Error("You have already reviewed this property");
    }

    return prisma.review.create({
      data: {
        rating,
        comment,
        user: { connect: { id: userId } },
        property: { connect: { id: propertyId } },
      },
      include: {
        user: {
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
    userId: string,
    rating?: number,
    comment?: string
  ) {
    const result = await prisma.review.updateMany({
      where: {
        id: reviewId,
        userId,
      },
      data: {
        rating,
        comment,
      },
    });

    if (result.count === 0) {
      throw new Error("Review not found or you are not allowed to update it");
    }

    return prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });
  }

  /**
   * Delete a review (only owner can delete)
   */
  async deleteReview(reviewId: string, userId: string) {
    const result = await prisma.review.deleteMany({
      where: {
        id: reviewId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new Error("Review not found or you are not allowed to delete it");
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
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get reviews written by a user
   */
  async getUserReviews(userId: string) {
    return prisma.review.findMany({
      where: { userId },
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