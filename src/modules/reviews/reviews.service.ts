import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(
    reviewerId: string,
    propertyId: string,
    rating: number,
    comment?: string,
  ) {
    const existing = await this.prisma.review.findUnique({
      where: {
        reviewerId_propertyId: { reviewerId, propertyId },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this property');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const hasAppointment = await this.prisma.appointment.findFirst({
      where: {
        propertyId,
        renterId: reviewerId,
        ownerId: property.ownerId,
        status: { in: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] },
      },
    });

    const hasConversation = await this.prisma.conversation.findFirst({
      where: {
        propertyId,
        renterId: reviewerId,
        ownerId: property.ownerId,
        messages: { some: {} },
      },
    });

    if (!hasAppointment && !hasConversation) {
      throw new ForbiddenException(
        'You can only review properties you have either booked an appointment for or started a conversation about',
      );
    }

    return this.prisma.review.create({
      data: {
        reviewerId,
        propertyId,
        rating,
        comment: comment ?? '',
      },
      include: {
        reviewer: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async updateReview(
    reviewId: string,
    reviewerId: string,
    rating?: number,
    comment?: string,
  ) {
    const result = await this.prisma.review.updateMany({
      where: { id: reviewId, reviewerId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Review not found or not authorized');
    }

    return this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async deleteReview(reviewId: string, reviewerId: string) {
    const result = await this.prisma.review.deleteMany({
      where: { id: reviewId, reviewerId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Review not found or not authorized');
    }

    return { message: 'Review deleted successfully' };
  }

  async getPropertyReviews(propertyId: string) {
    return this.prisma.review.findMany({
      where: { propertyId },
      include: {
        reviewer: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserReviews(reviewerId: string) {
    return this.prisma.review.findMany({
      where: { reviewerId },
      include: {
        property: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPropertyReviewStats(propertyId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { propertyId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: stats._avg.rating ?? 0,
      totalReviews: stats._count.rating,
    };
  }

  async getOwnerReviews(
    ownerId: string,
    options: {
      rating?: number;
      sort?: 'newest' | 'oldest';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { rating, sort = 'newest', page = 1, limit = 10 } = options;

    const where = {
      property: { ownerId },
      ...(rating && { rating }),
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          property: { select: { id: true, title: true } },
          reviewer: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: sort === 'newest' ? { createdAt: 'desc' } : { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
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
          ? `${review.reviewer.first_name} ${review.reviewer.last_name || ''}`.trim()
          : 'Anonymous',
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

  async getOwnerReviewStats(ownerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { property: { ownerId } },
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
      if (r.rating in distribution) {
        distribution[r.rating as keyof typeof distribution]++;
      }
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      positivePercentage: Math.round(positivePercentage),
      distribution,
    };
  }

  async replyToReview(reviewId: string, ownerId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { ownerId: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.property.ownerId !== ownerId) {
      throw new ForbiddenException('You can only reply to reviews on your own properties');
    }

    await this.prisma.$executeRaw`
      UPDATE "Review" 
      SET "reply" = ${reply}, "repliedAt" = ${new Date()}
      WHERE id = ${reviewId}
    `;

    return this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { id: true, title: true } },
        reviewer: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }
}
