"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../../config/database"));
class ReviewService {
    /**
     * Create a review
     * Enforces one review per user per property
     */
    async createReview(reviewerId, propertyId, rating, comment) {
        const existing = await database_1.default.review.findUnique({
            where: {
                reviewerId_propertyId: { reviewerId, propertyId },
            },
        });
        if (existing) {
            throw new Error("You have already reviewed this property");
        }
        const property = await database_1.default.property.findUnique({
            where: { id: propertyId },
            select: { ownerId: true },
        });
        if (!property) {
            throw new Error("Property not found");
        }
        const hasAppointment = await database_1.default.appointment.findFirst({
            where: {
                propertyId,
                renterId: reviewerId,
                ownerId: property.ownerId,
                status: { in: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"] },
            },
        });
        const hasConversation = await database_1.default.conversation.findFirst({
            where: {
                propertyId,
                renterId: reviewerId,
                ownerId: property.ownerId,
                messages: { some: {} },
            },
        });
        if (!hasAppointment && !hasConversation) {
            throw new Error("You can only review properties you have either booked an appointment for or started a conversation about");
        }
        return database_1.default.review.create({
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
    async updateReview(reviewId, reviewerId, rating, comment) {
        const result = await database_1.default.review.updateMany({
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
        return database_1.default.review.findUnique({
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
    async deleteReview(reviewId, reviewerId) {
        const result = await database_1.default.review.deleteMany({
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
    async getPropertyReviews(propertyId) {
        return database_1.default.review.findMany({
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
    async getUserReviews(reviewerId) {
        return database_1.default.review.findMany({
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
    async getPropertyReviewStats(propertyId) {
        const stats = await database_1.default.review.aggregate({
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
    async getOwnerReviews(ownerId, options = {}) {
        const { rating, sort = "newest", page = 1, limit = 10 } = options;
        const where = {
            property: {
                ownerId,
            },
            ...(rating && { rating }),
        };
        const [reviews, total] = await Promise.all([
            database_1.default.review.findMany({
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
            database_1.default.review.count({ where }),
        ]);
        return {
            reviews: reviews.map((review) => ({
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
    async getOwnerReviewStats(ownerId) {
        const reviews = await database_1.default.review.findMany({
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
            distribution[r.rating]++;
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
    async replyToReview(reviewId, ownerId, reply) {
        // First, get the review to check ownership
        const review = await database_1.default.review.findUnique({
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
        await database_1.default.$executeRaw `
      UPDATE "Review" 
      SET "reply" = ${reply}, "repliedAt" = ${new Date()}
      WHERE id = ${reviewId}
    `;
        // Fetch the updated review
        return database_1.default.review.findUnique({
            where: { id: reviewId },
            include: {
                property: {
                    select: { id: true, title: true },
                },
                reviewer: {
                    select: { id: true, first_name: true, last_name: true },
                },
            },
        });
    }
}
exports.default = new ReviewService();
