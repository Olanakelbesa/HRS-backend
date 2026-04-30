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
    console.log("Updating review with:");
console.log({ reviewId, reviewerId, rating, comment });
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

  /**
   * Get all reviews for properties owned by the user
   */
  async getOwnerReviews(
    ownerId: string,
    options: {
      rating?: number;
      sort?: "newest" | "oldest";
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { rating, sort = "newest", page = 1, limit = 10 } = options;

    const where = {
      property: {
        ownerId,
      },
      ...(rating && { rating }),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          property: {
            select: { id: true, title: true },
          },
          reviewer: {
            select: { id: true, first_name: true, last_name: true },
          },
        },
        orderBy: sort === "newest" ? { createdAt: "desc" } : { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews: reviews.map((review: any) => ({
        reviewId: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        propertyId: review.propertyId,
        propertyTitle: review.property?.title,
        reviewerName: review.reviewer?.first_name
          ? `${review.reviewer.first_name} ${review.reviewer.last_name || ""}`.trim()
          : "Anonymous",
        reply: review.reply,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get aggregated review stats for all properties owned by the user
   */
  async getOwnerReviewStats(ownerId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        property: {
          ownerId,
        },
      },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        positivePercentage: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = sumRating / totalReviews;
    const positiveCount = reviews.filter((r) => r.rating >= 4).length;
    const positivePercentage = (positiveCount / totalReviews) * 100;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      positivePercentage: Math.round(positivePercentage),
      distribution,
    };
  }

  /**
   * Reply to a review (only property owner can reply)
   */
  async replyToReview(reviewId: string, ownerId: string, reply: string) {
    // First, get the review to check ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: {
          select: { ownerId: true },
        },
      },
    });

    if (!review) {
      throw new Error("Review not found");
    }

    if (review.property.ownerId !== ownerId) {
      throw new Error("You can only reply to reviews on your own properties");
    }

    // Use raw query to update since Prisma client types are outdated
    await prisma.$executeRaw`
      UPDATE "Review" 
      SET "reply" = ${reply}, "repliedAt" = ${new Date()}
      WHERE id = ${reviewId}
    `;

    // Fetch the updated review
    return prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: {
          select: { id: true, title: true },
        },
        reviewer: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    }) as any;
  }
}

export default new ReviewService();