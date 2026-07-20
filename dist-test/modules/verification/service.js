"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
exports.verificationService = {
    /**
     * Upload verification documents for a user
     * Creates or updates the VerificationDocument record
     */
    async uploadVerificationDocuments(userId, data) {
        // Check if user exists
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        // Only owners can upload verification documents
        if (user.role !== 'owner') {
            throw new AppError_1.AppError('Only owners can upload verification documents', 403);
        }
        // Check if verification document already exists
        const existing = await database_1.default.verificationDocument.findUnique({
            where: { userId },
        });
        if (existing) {
            // Only allow upload if status is resubmit or if user is not verified
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { isVerified: true },
            });
            if (existing.status === 'approved') {
                throw new AppError_1.AppError('Your documents are already approved', 400);
            }
            if (existing.status !== 'resubmit' && existing.status !== 'rejected' && user?.isVerified) {
                throw new AppError_1.AppError('You can only upload documents when your status is resubmit or rejected', 400);
            }
            // Update existing document
            const updated = await database_1.default.verificationDocument.update({
                where: { userId },
                data: {
                    frontUrl: data.frontUrl,
                    backUrl: data.backUrl,
                    livePhotoUrl: data.livePhotoUrl,
                    status: 'pending',
                    note: null,
                    reviewedAt: null,
                    reviewedById: null,
                    submittedAt: new Date(),
                },
            });
            return updated;
        }
        // Create new verification document
        const verificationDoc = await database_1.default.verificationDocument.create({
            data: {
                userId,
                frontUrl: data.frontUrl,
                backUrl: data.backUrl,
                livePhotoUrl: data.livePhotoUrl,
                status: 'pending',
            },
        });
        return verificationDoc;
    },
    /**
     * Get verification documents for a user
     */
    async getVerificationDocuments(userId, requestingUserId, userRole) {
        // Users can only view their own documents, admins can view any
        if (userRole !== 'admin' && userId !== requestingUserId) {
            throw new AppError_1.AppError('Unauthorized to view these documents', 403);
        }
        const verificationDoc = await database_1.default.verificationDocument.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
        });
        if (!verificationDoc) {
            return null;
        }
        return verificationDoc;
    },
    /**
     * Get current user's verification status
     */
    async getMyVerificationStatus(userId) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                isVerified: true,
                verificationState: true,
                role: true,
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        // Get verification document if exists
        const verificationDoc = await database_1.default.verificationDocument.findUnique({
            where: { userId },
            select: {
                status: true,
                submittedAt: true,
                reviewedAt: true,
                note: true,
            },
        });
        return {
            user: {
                id: user.id,
                isVerified: user.isVerified,
                verificationState: user.verificationState,
                role: user.role,
            },
            document: verificationDoc,
        };
    },
    /**
     * Update verification status (Admin only)
     * This also updates the user's isVerified and verificationState fields
     */
    async updateVerificationStatus(adminId, userId, data) {
        // Verify admin role
        const admin = await database_1.default.user.findUnique({
            where: { id: adminId },
            select: { role: true },
        });
        if (!admin || admin.role !== 'admin') {
            throw new AppError_1.AppError('Unauthorized. Admin access required', 403);
        }
        // Get verification document
        const verificationDoc = await database_1.default.verificationDocument.findUnique({
            where: { userId },
        });
        if (!verificationDoc) {
            throw new AppError_1.AppError('Verification document not found', 404);
        }
        // Update verification document
        const updatedDoc = await database_1.default.verificationDocument.update({
            where: { userId },
            data: {
                status: data.status,
                note: data.note,
                reviewedAt: new Date(),
                reviewedById: adminId,
            },
        });
        // Update user's verification status based on document status
        let userIsVerified = false;
        let userVerificationState = 'pending';
        switch (data.status) {
            case 'approved':
                userIsVerified = true;
                userVerificationState = 'verified';
                break;
            case 'rejected':
                userIsVerified = false;
                userVerificationState = 'rejected';
                break;
            case 'resubmit':
                userIsVerified = false;
                userVerificationState = 'resubmit';
                break;
            case 'pending':
                userIsVerified = false;
                userVerificationState = 'pending';
                break;
            case 'under_review':
                userIsVerified = false;
                userVerificationState = 'pending';
                break;
        }
        await database_1.default.user.update({
            where: { id: userId },
            data: {
                isVerified: userIsVerified,
                verificationState: userVerificationState,
            },
        });
        return updatedDoc;
    },
    /**
     * Get all pending verification requests (Admin only)
     */
    async getPendingVerifications(adminId) {
        // Verify admin role
        const admin = await database_1.default.user.findUnique({
            where: { id: adminId },
            select: { role: true },
        });
        if (!admin || admin.role !== 'admin') {
            throw new AppError_1.AppError('Unauthorized. Admin access required', 403);
        }
        const pendingDocs = await database_1.default.verificationDocument.findMany({
            where: { status: 'pending' },
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });
        return pendingDocs;
    },
    /**
     * Check if a user is verified (helper function)
     */
    async checkUserVerification(userId) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { isVerified: true, role: true },
        });
        if (!user) {
            return false;
        }
        // Only owners need to be verified
        if (user.role !== 'owner') {
            return true;
        }
        return user.isVerified;
    },
};
