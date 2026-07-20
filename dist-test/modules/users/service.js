"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.getOwnerProfile = getOwnerProfile;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.getAllUsers = getAllUsers;
exports.updateUserRole = updateUserRole;
exports.updateUserStatus = updateUserStatus;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const service_1 = __importDefault(require("../review-rate/service"));
const service_2 = require("../properties/service");
function formatDateToIsoDate(value) {
    return value.toISOString().substring(0, 10);
}
async function getProfile(userId) {
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            image: true,
            location: true,
            bio: true,
            role: true,
            preferredLanguage: true,
            emailVerified: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user)
        throw new AppError_1.AppError('User not found', 404);
    return user;
}
async function getOwnerProfile(ownerId) {
    const owner = await database_1.default.user.findUnique({
        where: { id: ownerId },
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            image: true,
            location: true,
            bio: true,
            role: true,
            isVerified: true,
            verificationState: true,
            preferredLanguage: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!owner || owner.role !== 'owner') {
        throw new AppError_1.AppError('Owner not found', 404);
    }
    const listingsRaw = await service_2.propertyService.getMyProperties(ownerId);
    const listings = listingsRaw.map((property) => ({
        id: property.id,
        title: property.title?.en || property.title?.am || '',
        location: property.address?.en || property.address?.am || '',
        price: property.price?.value ?? 0,
        image: Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : '',
    }));
    const reviewStats = await service_1.default.getOwnerReviewStats(ownerId);
    const ownerReviews = await service_1.default.getOwnerReviews(ownerId, { limit: 10, sort: 'newest' });
    const reviews = ownerReviews.reviews.map((review) => ({
        id: review.reviewId,
        reviewerName: review.reviewerName,
        date: formatDateToIsoDate(new Date(review.createdAt)),
        rating: review.rating,
        comment: review.comment,
    }));
    return {
        owner: {
            id: owner.id,
            name: `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim(),
            avatar: owner.image || '',
            role: owner.role?.toUpperCase() || 'OWNER',
            location: owner.location || '',
            joinedDate: formatDateToIsoDate(owner.createdAt),
            verification: {
                idVerified: owner.verificationState === 'verified',
                phoneVerified: Boolean(owner.phone),
            },
            propertiesManaged: listings.length,
            rating: {
                average: reviewStats.averageRating,
                reviewCount: reviewStats.totalReviews,
            },
        },
        listings,
        reviews,
    };
}
async function updateProfile(userId, input) {
    const data = {};
    if (input.first_name !== undefined)
        data.first_name = input.first_name;
    if (input.last_name !== undefined)
        data.last_name = input.last_name;
    if ((input.first_name === undefined || input.last_name === undefined) && input.name !== undefined) {
        const parts = input.name.trim().split(/\s+/);
        if (parts.length > 0) {
            data.first_name = parts[0];
            if (parts.length > 1) {
                data.last_name = parts.slice(1).join(' ');
            }
        }
    }
    if (input.phone !== undefined)
        data.phone = input.phone;
    if (input.location !== undefined)
        data.location = input.location;
    if (input.bio !== undefined)
        data.bio = input.bio;
    if (input.image !== undefined)
        data.image = input.image;
    if (Object.keys(data).length === 0) {
        return getProfile(userId);
    }
    const user = await database_1.default.user.update({
        where: { id: userId },
        data,
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            image: true,
            location: true,
            bio: true,
            role: true,
            preferredLanguage: true,
            emailVerified: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return user;
}
async function changePassword(userId, data) {
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.password) {
        throw new Error('Password is not set for this account');
    }
    const isMatch = await bcryptjs_1.default.compare(data.currentPassword, user.password);
    if (!isMatch) {
        throw new Error('Current password is incorrect');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, 10);
    await database_1.default.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
    return { message: 'Password updated successfully' };
}
async function getAllUsers() {
    const users = await database_1.default.user.findMany({
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            isVerified: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return users;
}
async function updateUserRole(userId, role) {
    const user = await database_1.default.user.update({
        where: { id: userId },
        data: { role },
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            isVerified: true,
        },
    });
    return user;
}
async function updateUserStatus(userId, isActive) {
    const user = await database_1.default.user.update({
        where: { id: userId },
        data: { isVerified: isActive },
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            isVerified: true,
        },
    });
    return user;
}
