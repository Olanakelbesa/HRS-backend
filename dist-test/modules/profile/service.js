"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updatePersonalInfo = updatePersonalInfo;
exports.uploadDocument = uploadDocument;
exports.getVerificationDoc = getVerificationDoc;
exports.updateBankDetails = updateBankDetails;
exports.updateNotificationPreferences = updateNotificationPreferences;
exports.updateLanguagePreference = updateLanguagePreference;
exports.changePassword = changePassword;
const database_1 = __importDefault(require("../../config/database"));
const bcryptjs_1 = require("bcryptjs");
const path = __importStar(require("path"));
const cloudinary_1 = require("../../lib/cloudinary");
/**
 * Senior Developer Note: Standardizing status and metadata mapping
 * to ensure frontend consistency and loose coupling with DB enums.
 */
const DOCUMENT_METADATA = {
    NATIONAL_ID_FRONT: {
        label: 'National ID - Front',
        description: 'Government-issued photo ID',
    },
    NATIONAL_ID_BACK: {
        label: 'National ID - Back',
        description: 'Back of government-issued ID',
    },
    OWNER_PHOTO: {
        label: 'Your Photo',
        description: 'Proof of you own the ID',
    },
};
/**
 * Format verification document status
 */
function mapDocumentStatus(status) {
    const statusMap = {
        pending: 'pending',
        approved: 'verified',
        rejected: 'rejected',
        resubmit: 'resubmit',
        under_review: 'under_review',
    };
    return statusMap[status] || status;
}
/**
 * Get owner's full profile
 */
async function getProfile(userId) {
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        include: {
            verificationDocs: true,
            bankDetail: true,
            notificationPreference: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    // One verification record per user — map three URL slots to document items for the frontend
    const doc = user.verificationDocs[0] ?? null;
    const documents = [];
    if (doc) {
        if (doc.frontUrl) {
            documents.push({
                id: `${doc.id}-front`,
                documentType: 'NATIONAL_ID_FRONT',
                label: DOCUMENT_METADATA.NATIONAL_ID_FRONT.label,
                description: DOCUMENT_METADATA.NATIONAL_ID_FRONT.description,
                file: path.basename(doc.frontUrl),
            });
        }
        if (doc.backUrl) {
            documents.push({
                id: `${doc.id}-back`,
                documentType: 'NATIONAL_ID_BACK',
                label: DOCUMENT_METADATA.NATIONAL_ID_BACK.label,
                description: DOCUMENT_METADATA.NATIONAL_ID_BACK.description,
                file: path.basename(doc.backUrl),
            });
        }
        if (doc.livePhotoUrl) {
            documents.push({
                id: `${doc.id}-photo`,
                documentType: 'OWNER_PHOTO',
                label: DOCUMENT_METADATA.OWNER_PHOTO.label,
                description: DOCUMENT_METADATA.OWNER_PHOTO.description,
                file: path.basename(doc.livePhotoUrl),
            });
        }
    }
    const verification = doc
        ? {
            status: mapDocumentStatus(doc.status),
            submittedAt: doc.submittedAt.toISOString(),
            documents,
        }
        : null;
    // Mask account number (show only last 4 digits) for security
    const maskAccountNumber = (num) => {
        if (!num)
            return null;
        return num.replace(/.(?=.{4})/g, '*');
    };
    const baseProfile = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        location: user.location || '',
        bio: user.bio || '',
        image: user.image,
        role: user.role,
        status: user.status,
        preferredLanguage: user.preferredLanguage,
        verificationState: user.verificationState,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        notificationPreferences: user.notificationPreference || {
            appointments: true,
            agreements: true,
            payments: true,
            reviews: false,
            reports: true,
            system: false,
        },
        language: user.preferredLanguage || 'en',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
    // Return full profile only for owners
    if (user.role === 'owner') {
        return {
            ...baseProfile,
            verification,
            bankDetails: user.bankDetail
                ? {
                    name: user.bankDetail.bankName,
                    accountNumber: user.bankDetail.accountNumber,
                    accountHolder: user.bankDetail.holderName, // Ensure fullName and accountHolder are the same as requested
                }
                : null,
        };
    }
    // For admin and renter (rental), return base profile without verification and bankDetails
    return baseProfile;
}
/**
 * Update personal information
 */
async function updatePersonalInfo(userId, data, file) {
    const fullName = data.fullName || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    let imageUrl;
    if (file) {
        imageUrl = await (0, cloudinary_1.uploadAvatarToCloudinary)(file, userId);
    }
    const user = await database_1.default.user.update({
        where: { id: userId },
        data: {
            first_name: firstName,
            last_name: lastName,
            phone: data.phone,
            location: data.location,
            bio: data.bio,
            ...(imageUrl && { image: imageUrl }),
        },
        select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            location: true,
            bio: true,
            image: true,
        },
    });
    return {
        id: user.id,
        fullName: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
        email: user.email,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        image: user.image,
    };
}
/**
 * Upload profile avatar
 */
/**
 * Upload verification document
 * All files go into a single record per user — admin reviews the whole submission at once.
 * Returns the full updated record (not per-file) so the caller can build one overall response.
 */
async function uploadDocument(userId, documentType, file) {
    const fileUrl = await (0, cloudinary_1.uploadDocumentToCloudinary)(file, userId, documentType);
    // Map documentType → URL field on the single record
    const urlField = {
        NATIONAL_ID_FRONT: 'frontUrl',
        NATIONAL_ID_BACK: 'backUrl',
        OWNER_PHOTO: 'livePhotoUrl',
    };
    const field = urlField[documentType];
    if (!field)
        throw new Error(`Invalid documentType: ${documentType}`);
    // Upsert one record per user — only update the relevant URL field,
    // reset overall status to pending so admin re-reviews
    return database_1.default.verificationDocument.upsert({
        where: { userId },
        create: { userId, [field]: fileUrl, status: 'pending', submittedAt: new Date() },
        update: { [field]: fileUrl, status: 'pending', submittedAt: new Date() },
    });
}
/**
 * Fetch the single verification document record for a user
 */
async function getVerificationDoc(userId) {
    return database_1.default.verificationDocument.findUnique({ where: { userId } });
}
/**
 * Update bank details
 */
async function updateBankDetails(userId, data) {
    const bankDetail = await database_1.default.bankDetail.upsert({
        where: { userId },
        create: {
            userId,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            holderName: data.holderName,
            branch: data.branch || null,
        },
        update: {
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            holderName: data.holderName,
            branch: data.branch || null,
        },
    });
    return {
        id: bankDetail.id,
        name: bankDetail.bankName,
        accountNumber: bankDetail.accountNumber,
        accountHolder: bankDetail.holderName,
        branch: bankDetail.branch,
    };
}
/**
 * Update notification preferences
 */
async function updateNotificationPreferences(userId, data) {
    const preferences = await database_1.default.notificationPreference.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
    });
    return {
        appointments: preferences.appointments,
        agreements: preferences.agreements,
        payments: preferences.payments,
        reviews: preferences.reviews,
        reports: preferences.reports,
        system: preferences.system,
    };
}
/**
 * Update language preference
 */
async function updateLanguagePreference(userId, data) {
    await database_1.default.user.update({
        where: { id: userId },
        data: { preferredLanguage: data.language },
    });
    return { language: data.language };
}
/**
 * Change user password
 */
async function changePassword(userId, data) {
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: { password: true },
    });
    if (!user || !user.password) {
        throw new Error('User not found or password not set');
    }
    const isPasswordValid = await (0, bcryptjs_1.compare)(data.currentPassword, user.password);
    if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
    }
    const hashedPassword = await (0, bcryptjs_1.hash)(data.newPassword, 10);
    await database_1.default.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
}
