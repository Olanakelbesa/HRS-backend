"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsApiService = void 0;
const common_1 = require("@nestjs/common");
const service_1 = __importDefault(require("../review-rate/service"));
let ReviewsApiService = class ReviewsApiService {
    createReview(userId, propertyId, rating, comment) {
        return service_1.default.createReview(userId, propertyId, rating, comment);
    }
    getPropertyReviews(propertyId) {
        return service_1.default.getPropertyReviews(propertyId);
    }
    getUserReviews(userId) {
        return service_1.default.getUserReviews(userId);
    }
    updateReview(reviewId, userId, rating, comment) {
        return service_1.default.updateReview(reviewId, userId, rating, comment);
    }
    deleteReview(reviewId, userId) {
        return service_1.default.deleteReview(reviewId, userId);
    }
    getPropertyReviewStats(propertyId) {
        return service_1.default.getPropertyReviewStats(propertyId);
    }
    getOwnerReviews(ownerId, opts) {
        return service_1.default.getOwnerReviews(ownerId, opts);
    }
    getOwnerReviewStats(ownerId) {
        return service_1.default.getOwnerReviewStats(ownerId);
    }
    replyToReview(reviewId, ownerId, reply) {
        return service_1.default.replyToReview(reviewId, ownerId, reply);
    }
};
exports.ReviewsApiService = ReviewsApiService;
exports.ReviewsApiService = ReviewsApiService = __decorate([
    (0, common_1.Injectable)()
], ReviewsApiService);
