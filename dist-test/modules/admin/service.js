"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_ASSESSMENT_VERSION = void 0;
exports.getPlatformAnalytics = getPlatformAnalytics;
exports.getAdminOverview = getAdminOverview;
exports.getPendingVerifications = getPendingVerifications;
exports.getAuditLogs = getAuditLogs;
exports.adminOverrideUpdateProperty = adminOverrideUpdateProperty;
exports.approveProperty = approveProperty;
exports.rejectProperty = rejectProperty;
exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.getUserDocuments = getUserDocuments;
exports.updateUserStatus = updateUserStatus;
exports.updateUserVerificationState = updateUserVerificationState;
exports.getProperties = getProperties;
exports.getAgreements = getAgreements;
exports.getAgreementById = getAgreementById;
exports.getAgreementPaymentSummary = getAgreementPaymentSummary;
exports.listAgreementPaymentsAdmin = listAgreementPaymentsAdmin;
exports.getPaymentProofAdmin = getPaymentProofAdmin;
exports.createAgreement = createAgreement;
exports.updateAgreementStatus = updateAgreementStatus;
exports.getReports = getReports;
exports.updateReportStatus = updateReportStatus;
exports.resolveVerification = resolveVerification;
exports.getPropertyById = getPropertyById;
exports.getReportById = getReportById;
exports.getReportRiskAssessment = getReportRiskAssessment;
exports.getAgreementRiskAssessment = getAgreementRiskAssessment;
exports.getReviews = getReviews;
exports.updateReviewStatus = updateReviewStatus;
exports.deleteReview = deleteReview;
const database_1 = __importDefault(require("../../config/database"));
const access_1 = require("../notifications/access");
function mapVerificationDocumentStatusToUserUpdate(status) {
    if (status === 'approved') {
        return {
            status: 'active',
            verificationState: 'verified',
            isVerified: true,
        };
    }
    if (status === 'rejected') {
        return {
            status: 'suspended',
            verificationState: 'rejected',
            isVerified: false,
        };
    }
    if (status === 'resubmit') {
        return {
            status: 'pending',
            verificationState: 'resubmit',
            isVerified: false,
        };
    }
    if (status === 'under_review') {
        return {
            status: 'pending',
            verificationState: 'pending',
            isVerified: false,
        };
    }
    return {
        status: 'pending',
        verificationState: 'pending',
        isVerified: false,
    };
}
function getRangeStart(range) {
    const now = new Date();
    if (!range) {
        return new Date(0);
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const msInDay = 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - days * msInDay);
}
function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function endOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
function shiftDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function shiftMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}
function roundPercent(value) {
    return Math.round(value * 100) / 100;
}
function calcTrend(current, previous) {
    if (previous <= 0) {
        return current > 0 ? 100 : 0;
    }
    return roundPercent(((current - previous) / previous) * 100);
}
function relativeTime(from, to) {
    const diffMs = Math.max(0, to.getTime() - from.getTime());
    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 1)
        return 'just now';
    if (minutes < 60)
        return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}
function statusLabelAndStyle(status) {
    if (status === 'PENDING') {
        return { statusLabel: 'Pending', statusStyle: 'bg-amber-100 text-amber-700' };
    }
    if (status === 'UNAVAILABLE') {
        return { statusLabel: 'Needs Review', statusStyle: 'bg-rose-100 text-rose-700' };
    }
    if (status === 'AVAILABLE') {
        return { statusLabel: 'Approved', statusStyle: 'bg-emerald-100 text-emerald-700' };
    }
    return { statusLabel: status, statusStyle: 'bg-slate-100 text-slate-700' };
}
async function getPlatformAnalytics(range) {
    const since = getRangeStart(range);
    const [totalUsers, totalOwners, totalRenters, verifiedOwners, totalProperties, activeProperties, pendingProperties, rentedProperties, totalAppointments, pendingAppointments, confirmedAppointments, totalConversations, totalMessages, totalNotifications, unreadNotifications, totalAuditLogs,] = await Promise.all([
        database_1.default.user.count(),
        database_1.default.user.count({ where: { role: 'owner' } }),
        database_1.default.user.count({ where: { role: 'renter' } }),
        database_1.default.user.count({ where: { role: 'owner', isVerified: true } }),
        database_1.default.property.count({ where: { isDeleted: false } }),
        database_1.default.property.count({ where: { isDeleted: false, status: 'AVAILABLE' } }),
        database_1.default.property.count({ where: { isDeleted: false, status: 'PENDING' } }),
        database_1.default.property.count({ where: { isDeleted: false, status: 'RENTED' } }),
        database_1.default.appointment.count(),
        database_1.default.appointment.count({ where: { status: 'PENDING' } }),
        database_1.default.appointment.count({ where: { status: 'ACCEPTED' } }),
        database_1.default.conversation.count(),
        database_1.default.message.count(),
        database_1.default.notification.count({ where: (0, access_1.excludePeerMessageNotifications)() }),
        database_1.default.notification.count({
            where: { readAt: null, ...(0, access_1.excludePeerMessageNotifications)() },
        }),
        database_1.default.auditLog.count(),
    ]);
    const [newUsersInRange, newPropertiesInRange, newMessagesInRange, newAuditLogsInRange] = await Promise.all([
        database_1.default.user.count({ where: { createdAt: { gte: since } } }),
        database_1.default.property.count({ where: { createdAt: { gte: since } } }),
        database_1.default.message.count({ where: { createdAt: { gte: since } } }),
        database_1.default.auditLog.count({ where: { createdAt: { gte: since } } }),
    ]);
    return {
        range: range ?? 'all',
        users: {
            total: totalUsers,
            owners: totalOwners,
            renters: totalRenters,
            verifiedOwners,
            newlyCreated: newUsersInRange,
        },
        properties: {
            total: totalProperties,
            available: activeProperties,
            pending: pendingProperties,
            rented: rentedProperties,
            newlyCreated: newPropertiesInRange,
        },
        appointments: {
            total: totalAppointments,
            pending: pendingAppointments,
            accepted: confirmedAppointments,
        },
        engagement: {
            conversations: totalConversations,
            messages: totalMessages,
            newMessagesInRange,
        },
        notifications: {
            total: totalNotifications,
            unread: unreadNotifications,
        },
        audit: {
            total: totalAuditLogs,
            newInRange: newAuditLogsInRange,
        },
    };
}
async function getAdminOverview(query) {
    const now = new Date();
    const windowDays = query.range === 'weekly' ? 7 : 30;
    const currentStart = startOfDay(shiftDays(now, -(windowDays - 1)));
    const previousStart = startOfDay(shiftDays(currentStart, -windowDays));
    const previousEnd = endOfDay(shiftDays(currentStart, -1));
    const [totalUsers, activeListings, pendingVerifications, activeAgreements, totalReport, currentUsers, previousUsers, currentListings, previousListings, currentAgreements, previousAgreements, currentReports, previousReports, recentAudit, pendingProperties, totalPayments, confirmedPayments, confirmedCollection, areaGroups,] = await Promise.all([
        database_1.default.user.count(),
        database_1.default.property.count({ where: { isDeleted: false, status: 'AVAILABLE' } }),
        database_1.default.verificationDocument.count({ where: { status: 'pending' } }),
        database_1.default.agreement.count({ where: { status: 'completed' } }),
        database_1.default.report.count(),
        database_1.default.user.count({ where: { createdAt: { gte: currentStart } } }),
        database_1.default.user.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
        database_1.default.property.count({ where: { createdAt: { gte: currentStart }, isDeleted: false } }),
        database_1.default.property.count({
            where: { createdAt: { gte: previousStart, lte: previousEnd }, isDeleted: false },
        }),
        database_1.default.agreement.count({ where: { createdAt: { gte: currentStart } } }),
        database_1.default.agreement.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
        database_1.default.report.count({ where: { createdAt: { gte: currentStart } } }),
        database_1.default.report.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
        database_1.default.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                eventType: true,
                entityType: true,
                entityId: true,
                createdAt: true,
            },
        }),
        database_1.default.property.findMany({
            where: { isDeleted: false, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                owner: {
                    select: {
                        first_name: true,
                        last_name: true,
                        image: true,
                    },
                },
            },
        }),
        database_1.default.payment.count(),
        database_1.default.payment.count({ where: { status: 'success' } }),
        database_1.default.payment.aggregate({
            _sum: { amount: true },
            where: { status: 'success' },
        }),
        database_1.default.property.groupBy({
            by: ['address'],
            _count: { _all: true },
            where: { isDeleted: false },
            orderBy: { _count: { address: 'desc' } },
            take: 4,
        }),
    ]);
    const trendTotalUsers = calcTrend(currentUsers, previousUsers);
    const trendActiveListings = calcTrend(currentListings, previousListings);
    const trendActiveAgreements = calcTrend(currentAgreements, previousAgreements);
    const trendTotalReports = calcTrend(currentReports, previousReports);
    const userGrowthLabels = [];
    const userGrowthCurrent = [];
    const userGrowthPrevious = [];
    if (query.range === 'weekly') {
        const weekdayFmt = new Intl.DateTimeFormat('en', { weekday: 'short' });
        const weeklyBuckets = await Promise.all(Array.from({ length: 7 }).map(async (_, index) => {
            const currentDay = startOfDay(shiftDays(now, -(6 - index)));
            const currentDayEnd = endOfDay(currentDay);
            const previousDay = startOfDay(shiftDays(currentDay, -7));
            const previousDayEnd = endOfDay(previousDay);
            const [currentCount, previousCount] = await Promise.all([
                database_1.default.user.count({ where: { createdAt: { gte: currentDay, lte: currentDayEnd } } }),
                database_1.default.user.count({ where: { createdAt: { gte: previousDay, lte: previousDayEnd } } }),
            ]);
            return {
                label: weekdayFmt.format(currentDay),
                currentCount,
                previousCount,
            };
        }));
        weeklyBuckets.forEach((bucket) => {
            userGrowthLabels.push(bucket.label);
            userGrowthCurrent.push(bucket.currentCount);
            userGrowthPrevious.push(bucket.previousCount);
        });
    }
    else {
        const monthFmt = new Intl.DateTimeFormat('en', { month: 'short' });
        const monthlyBuckets = await Promise.all(Array.from({ length: 6 }).map(async (_, index) => {
            const offset = 5 - index;
            const monthRef = shiftMonths(now, -offset);
            const currentMonthStart = startOfMonth(monthRef);
            const currentMonthEnd = endOfMonth(monthRef);
            const previousMonthRef = shiftMonths(monthRef, -6);
            const previousMonthStart = startOfMonth(previousMonthRef);
            const previousMonthEnd = endOfMonth(previousMonthRef);
            const [currentCount, previousCount] = await Promise.all([
                database_1.default.user.count({
                    where: {
                        createdAt: {
                            gte: currentMonthStart,
                            lte: currentMonthEnd,
                        },
                    },
                }),
                database_1.default.user.count({
                    where: {
                        createdAt: {
                            gte: previousMonthStart,
                            lte: previousMonthEnd,
                        },
                    },
                }),
            ]);
            return {
                label: monthFmt.format(monthRef),
                currentCount,
                previousCount,
            };
        }));
        monthlyBuckets.forEach((bucket) => {
            userGrowthLabels.push(bucket.label);
            userGrowthCurrent.push(bucket.currentCount);
            userGrowthPrevious.push(bucket.previousCount);
        });
    }
    const recentActivity = recentAudit.map((item) => ({
        id: item.id,
        type: item.eventType,
        text: item.eventType
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        detail: item.entityId
            ? `${item.entityType} (${item.entityId}) updated`
            : `${item.entityType} updated`,
        time: relativeTime(item.createdAt, now),
        createdAt: item.createdAt,
    }));
    const recentProperties = pendingProperties.map((property) => {
        const owner = `${property.owner.first_name ?? ''} ${property.owner.last_name ?? ''}`.trim() || 'Unknown';
        const [firstImage] = property.images ?? [];
        const statusMeta = statusLabelAndStyle(property.status);
        return {
            id: property.id,
            name: property.title?.en ??
                property.title?.am ??
                'Untitled Property',
            owner,
            ownerAvatar: property.owner.image,
            location: property.address ?? property.location,
            status: property.status,
            statusLabel: statusMeta.statusLabel,
            statusStyle: statusMeta.statusStyle,
            dateSubmitted: property.createdAt,
            image: firstImage ?? null,
        };
    });
    const totalListingsCount = areaGroups.reduce((sum, item) => sum + item._count._all, 0);
    const listingsByArea = areaGroups.map((item) => {
        const rawAddress = String(item.address ?? '').trim();
        const area = rawAddress ? rawAddress.split(',')[0].trim() : 'Unknown';
        const percentage = totalListingsCount
            ? Math.round((item._count._all / totalListingsCount) * 100)
            : 0;
        return {
            area,
            count: item._count._all,
            percentage,
        };
    });
    const successRate = totalPayments > 0 ? Math.round((confirmedPayments / totalPayments) * 100) : 0;
    return {
        lastUpdated: now.toISOString(),
        stats: {
            totalUsers: {
                value: totalUsers,
                trendPercent: trendTotalUsers,
            },
            activeListings: {
                value: activeListings,
                trendPercent: trendActiveListings,
            },
            pendingVerifications: {
                value: pendingVerifications,
                actionNeeded: pendingVerifications > 0,
            },
            activeAgreements: {
                value: activeAgreements,
                trendPercent: trendActiveAgreements,
            },
            totalReport: {
                value: totalReport,
                trendPercent: trendTotalReports,
            },
        },
        userGrowth: {
            range: query.range,
            labels: userGrowthLabels,
            currentPeriod: userGrowthCurrent,
            previousPeriod: userGrowthPrevious,
        },
        recentActivity,
        listingsByArea,
        paymentPerformance: {
            successRate,
            totalCollectionAmount: confirmedCollection._sum?.amount ?? 0,
            currency: 'ETB',
            label: successRate >= 90 ? 'On Time Collection' : 'Needs Attention',
        },
        recentProperties,
    };
}
async function getPendingVerifications(query) {
    const skip = (query.page - 1) * query.limit;
    const where = {
        role: 'owner',
        isVerified: false,
        ...(query.emailVerified !== undefined ? { emailVerified: query.emailVerified } : {}),
        ...(query.search
            ? {
                OR: [
                    { first_name: { contains: query.search, mode: 'insensitive' } },
                    { last_name: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                    { phone: { contains: query.search, mode: 'insensitive' } },
                ],
            }
            : {}),
    };
    const [users, total] = await Promise.all([
        database_1.default.user.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { [query.sortBy]: query.order },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
                verificationDocs: {
                    select: {
                        id: true,
                        submittedAt: true,
                        frontUrl: true,
                        backUrl: true,
                        livePhotoUrl: true,
                        status: true,
                    },
                },
            },
        }),
        database_1.default.user.count({ where }),
    ]);
    const now = new Date();
    const items = users.map((user) => {
        const doc = user.verificationDocs[0] ?? null;
        const submittedDate = doc?.submittedAt ?? null;
        const daysWaiting = submittedDate
            ? Math.max(0, Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)))
            : null;
        // Report which of the three files have been uploaded
        const documents = [];
        if (doc?.frontUrl)
            documents.push('NATIONAL_ID_FRONT');
        if (doc?.backUrl)
            documents.push('NATIONAL_ID_BACK');
        if (doc?.livePhotoUrl)
            documents.push('OWNER_PHOTO');
        return {
            id: user.id,
            name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
            email: user.email,
            phone: user.phone,
            submittedDate,
            daysWaiting,
            documents,
            docStatus: doc?.status ?? null,
        };
    });
    return {
        items,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
}
async function getAuditLogs(query) {
    const skip = (query.page - 1) * query.limit;
    const where = {
        ...(query.search
            ? {
                OR: [
                    { eventType: { contains: query.search, mode: 'insensitive' } },
                    { entityType: { contains: query.search, mode: 'insensitive' } },
                    { entityId: { contains: query.search, mode: 'insensitive' } },
                ],
            }
            : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.dateFrom || query.dateTo
            ? {
                createdAt: {
                    ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                    ...(query.dateTo ? { lte: query.dateTo } : {}),
                },
            }
            : {}),
    };
    const [items, total] = await Promise.all([
        database_1.default.auditLog.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { [query.sortBy]: query.order },
            include: {
                actor: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        first_name: true,
                        last_name: true,
                    },
                },
            },
        }),
        database_1.default.auditLog.count({ where }),
    ]);
    return {
        items,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
}
async function adminOverrideUpdateProperty(adminId, propertyId, payload) {
    const existing = await database_1.default.property.findUnique({
        where: { id: propertyId },
    });
    if (!existing) {
        return null;
    }
    const updated = await database_1.default.property.update({
        where: { id: propertyId },
        data: payload,
    });
    const changedFields = Object.keys(payload);
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'ADMIN_PROPERTY_OVERRIDE_UPDATE',
            entityType: 'Property',
            entityId: propertyId,
            metadata: {
                changedFields,
            },
        },
    });
    return updated;
}
async function approveProperty(adminId, propertyId, payload) {
    const existing = await database_1.default.property.findUnique({ where: { id: propertyId } });
    if (!existing)
        return null;
    const updated = await database_1.default.property.update({
        where: { id: propertyId },
        data: { status: 'AVAILABLE' },
    });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'ADMIN_PROPERTY_APPROVED',
            entityType: 'Property',
            entityId: propertyId,
            metadata: {
                note: payload.note ?? null,
            },
        },
    });
    return updated;
}
async function rejectProperty(adminId, propertyId, payload) {
    const existing = await database_1.default.property.findUnique({ where: { id: propertyId } });
    if (!existing)
        return null;
    const updated = await database_1.default.property.update({
        where: { id: propertyId },
        data: { status: 'UNAVAILABLE' },
    });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'ADMIN_PROPERTY_REJECTED',
            entityType: 'Property',
            entityId: propertyId,
            metadata: {
                reason: payload.reason,
                note: payload.note ?? null,
            },
        },
    });
    return updated;
}
// -------------------------------------------------------------------------------- //
// NEW ADMIN SERVICES FOR FULL MODULE SUPPORT (Users, Properties, Agreements, etc.) //
// -------------------------------------------------------------------------------- //
async function getUsers(query) {
    const skip = (query.page - 1) * query.limit;
    const where = {
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
            ? {
                OR: [
                    { first_name: { contains: query.search, mode: 'insensitive' } },
                    { last_name: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                ],
            }
            : {}),
    };
    const [items, total] = await Promise.all([
        database_1.default.user.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                role: true,
                status: true,
                verificationState: true,
                createdAt: true,
            },
        }),
        database_1.default.user.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
}
async function getUserById(id) {
    return database_1.default.user.findUnique({
        where: { id },
        include: { verificationDocs: true },
    });
}
async function getUserDocuments(userId) {
    const docs = await database_1.default.verificationDocument.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
    });
    return docs;
}
async function updateUserStatus(adminId, id, status) {
    const user = await database_1.default.user.update({
        where: { id },
        data: { status },
    });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'USER_STATUS_UPDATE',
            entityType: 'User',
            entityId: id,
            metadata: { status },
        },
    });
    return user;
}
async function updateUserVerificationState(adminId, id, verificationState, comment) {
    // Set isVerified and status appropriately when marking verified
    const dataToUpdate = { verificationState };
    if (verificationState === 'verified') {
        dataToUpdate.isVerified = true;
        dataToUpdate.status = 'active';
    }
    else {
        dataToUpdate.isVerified = false;
    }
    const user = await database_1.default.user.update({
        where: { id },
        data: dataToUpdate,
    });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'USER_VERIFICATION_UPDATE',
            entityType: 'User',
            entityId: id,
            metadata: { verificationState, comment },
        },
    });
    return user;
}
async function getProperties(query) {
    const skip = (query.page - 1) * query.limit;
    const where = {
        isDeleted: false,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
            ? {
                OR: [
                    { owner: { first_name: { contains: query.search, mode: 'insensitive' } } },
                    { owner: { last_name: { contains: query.search, mode: 'insensitive' } } },
                ],
            }
            : {}),
    };
    const [items, total] = await Promise.all([
        database_1.default.property.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
            include: {
                owner: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        image: true,
                    },
                },
            },
        }),
        database_1.default.property.count({ where }),
    ]);
    return {
        items,
        meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    };
}
async function getAgreements(query) {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
        database_1.default.agreement.findMany({ skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
        database_1.default.agreement.count(),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
}
async function getAgreementById(id) {
    return database_1.default.agreement.findUnique({ where: { id } });
}
async function getAgreementPaymentSummary(agreementId) {
    const agreement = await database_1.default.agreement.findUnique({
        where: { id: agreementId },
        select: {
            id: true,
            currency: true,
            monthlyRent: true,
            depositAmountEtb: true,
            status: true,
        },
    });
    if (!agreement)
        return null;
    const [statusGroups, paymentCount, lastPayment] = await Promise.all([
        database_1.default.payment.groupBy({
            by: ['status'],
            where: { agreementId },
            _count: { _all: true },
            _sum: { amount: true },
        }),
        database_1.default.payment.count({ where: { agreementId } }),
        database_1.default.payment.findFirst({
            where: { agreementId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                amount: true,
                purpose: true,
                provider: true,
                createdAt: true,
                paidAt: true,
            },
        }),
    ]);
    const byStatus = {};
    let totalPaid = 0;
    let totalOutstanding = 0;
    let hasFailedPayments = false;
    for (const row of statusGroups) {
        const amount = row._sum.amount ?? 0;
        byStatus[row.status] = { count: row._count._all, amount };
        if (row.status === 'success')
            totalPaid += amount;
        if (row.status === 'pending' || row.status === 'processing')
            totalOutstanding += amount;
        if (row.status === 'failed')
            hasFailedPayments = row._count._all > 0;
    }
    return {
        agreementId: agreement.id,
        currency: agreement.currency,
        monthlyRent: agreement.monthlyRent,
        depositAmountEtb: agreement.depositAmountEtb,
        agreementStatus: agreement.status,
        paymentCount,
        byStatus,
        totalPaid,
        totalOutstanding,
        hasFailedPayments,
        lastPayment,
    };
}
async function listAgreementPaymentsAdmin(agreementId) {
    const agreement = await database_1.default.agreement.findUnique({
        where: { id: agreementId },
        select: { id: true },
    });
    if (!agreement)
        return null;
    return database_1.default.payment.findMany({
        where: { agreementId },
        orderBy: { createdAt: 'desc' },
    });
}
async function getPaymentProofAdmin(paymentId) {
    const payment = await database_1.default.payment.findUnique({
        where: { id: paymentId },
        select: {
            id: true,
            proofUrl: true,
            agreementId: true,
            provider: true,
            status: true,
        },
    });
    if (!payment)
        return null;
    return {
        paymentId: payment.id,
        agreementId: payment.agreementId,
        provider: payment.provider,
        status: payment.status,
        proofUrl: payment.proofUrl,
    };
}
async function createAgreement(adminId, data) {
    const agreement = await database_1.default.agreement.create({ data });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'AGREEMENT_CREATED',
            entityType: 'Agreement',
            entityId: agreement.id,
        },
    });
    return agreement;
}
async function updateAgreementStatus(adminId, id, status) {
    const agreement = await database_1.default.agreement.update({ where: { id }, data: { status } });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'AGREEMENT_STATUS_UPDATE',
            entityType: 'Agreement',
            entityId: id,
            metadata: { status },
        },
    });
    return agreement;
}
async function getReports(query) {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
        database_1.default.report.findMany({
            skip,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
            include: { reportedBy: true },
        }),
        database_1.default.report.count(),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
}
async function updateReportStatus(adminId, id, status) {
    const report = await database_1.default.report.update({ where: { id }, data: { status } });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'REPORT_STATUS_UPDATE',
            entityType: 'Report',
            entityId: id,
            metadata: { status },
        },
    });
    return report;
}
async function resolveVerification(adminId, id, status, note) {
    const doc = await database_1.default.verificationDocument.update({
        where: { id },
        data: { status, note, reviewedAt: new Date(), reviewedById: adminId },
    });
    const userUpdate = mapVerificationDocumentStatusToUserUpdate(status);
    await database_1.default.user.update({
        where: { id: doc.userId },
        data: userUpdate,
    });
    // If owner is approved, automatically verify all their properties
    if (status === 'approved') {
        await database_1.default.property.updateMany({
            where: { ownerId: doc.userId },
            data: { isVerified: true },
        });
    }
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'VERIFICATION_RESOLVED',
            entityType: 'VerificationDocument',
            entityId: id,
            metadata: { status, note },
        },
    });
    return doc;
}
async function getPropertyById(id) {
    return await database_1.default.property.findUnique({
        where: { id },
        include: {
            owner: { select: { id: true, first_name: true, last_name: true, image: true, phone: true } },
        },
    });
}
async function getReportById(id) {
    return await database_1.default.report.findUnique({
        where: { id },
        include: { reportedBy: { select: { id: true, first_name: true, last_name: true } } },
    });
}
// --- Risk assessment (admin investigations) ---
exports.RISK_ASSESSMENT_VERSION = 1;
const RISK_LEVEL_THRESHOLDS = { medium: 34, high: 67 };
async function riskGetOwnerPropertyIds(ownerId) {
    const rows = await database_1.default.property.findMany({
        where: { ownerId, isDeleted: false },
        select: { id: true },
    });
    return rows.map((r) => r.id);
}
function riskBuildReportsWhereAgainstUser(userId, propertyIds) {
    return {
        OR: [
            { targetType: 'user', targetId: userId },
            ...(propertyIds.length > 0
                ? [{ targetType: 'property', targetId: { in: propertyIds } }]
                : []),
        ],
    };
}
function riskScoreToLevel(score) {
    if (score >= RISK_LEVEL_THRESHOLDS.high)
        return 'high';
    if (score >= RISK_LEVEL_THRESHOLDS.medium)
        return 'medium';
    return 'low';
}
function riskMergeFactors(factorLists) {
    const byCode = new Map();
    for (const factors of factorLists) {
        for (const factor of factors) {
            const existing = byCode.get(factor.code);
            if (!existing || factor.weight > existing.weight) {
                byCode.set(factor.code, factor);
            }
        }
    }
    return Array.from(byCode.values()).sort((a, b) => b.weight - a.weight);
}
function riskSumFactorWeights(factors) {
    return Math.min(100, factors.reduce((sum, f) => sum + f.weight, 0));
}
async function riskCountReportsByStatus(where, excludeReportId) {
    const baseWhere = excludeReportId ? { ...where, NOT: { id: excludeReportId } } : where;
    const [open, in_review, resolved, dismissed] = await Promise.all([
        database_1.default.report.count({ where: { ...baseWhere, status: 'open' } }),
        database_1.default.report.count({ where: { ...baseWhere, status: 'in_review' } }),
        database_1.default.report.count({ where: { ...baseWhere, status: 'resolved' } }),
        database_1.default.report.count({ where: { ...baseWhere, status: 'dismissed' } }),
    ]);
    return { open, in_review, resolved, dismissed };
}
async function riskAssessUser(userId, ctx = {}) {
    const propertyIds = await riskGetOwnerPropertyIds(userId);
    const userWhere = riskBuildReportsWhereAgainstUser(userId, propertyIds);
    const reportWhere = ctx.includeAgreementReports && ctx.agreementId
        ? {
            OR: [
                userWhere,
                { targetType: 'agreement', targetId: ctx.agreementId },
            ],
        }
        : userWhere;
    const breakdown = await riskCountReportsByStatus(reportWhere, ctx.excludeReportId);
    const unresolved = breakdown.open + breakdown.in_review;
    const factors = [];
    if (unresolved > 0) {
        const weight = Math.min(40, 10 + unresolved * 6);
        factors.push({
            code: 'UNRESOLVED_REPORTS',
            label: unresolved === 1
                ? '1 unresolved report against this account'
                : `${unresolved} unresolved reports against this account`,
            weight,
        });
    }
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: { status: true, verificationState: true, isVerified: true },
    });
    if (user) {
        if (user.status === 'suspended') {
            factors.push({
                code: 'SUBJECT_SUSPENDED',
                label: 'Account is suspended',
                weight: 30,
            });
        }
        if (user.verificationState === 'rejected') {
            factors.push({
                code: 'VERIFICATION_REJECTED',
                label: 'ID verification was rejected',
                weight: 25,
            });
        }
        else if (user.verificationState !== 'verified' || !user.isVerified) {
            factors.push({
                code: 'SUBJECT_UNVERIFIED',
                label: 'Account is not ID verified',
                weight: 20,
            });
        }
    }
    const fraudWhere = {
        ...reportWhere,
        category: { contains: 'fraud', mode: 'insensitive' },
        ...(ctx.excludeReportId ? { NOT: { id: ctx.excludeReportId } } : {}),
    };
    const fraudReportCount = await database_1.default.report.count({ where: fraudWhere });
    if (fraudReportCount >= 2) {
        factors.push({
            code: 'MULTIPLE_FRAUD_REPORTS',
            label: `${fraudReportCount} fraud-related reports on record`,
            weight: 20,
        });
    }
    if (ctx.propertyVerified === false) {
        factors.push({
            code: 'PROPERTY_UNVERIFIED',
            label: 'Linked property listing is not verified',
            weight: 15,
        });
    }
    if (ctx.agreementId) {
        const failedPayments = await database_1.default.payment.count({
            where: { agreementId: ctx.agreementId, status: 'failed' },
        });
        if (failedPayments > 0) {
            factors.push({
                code: 'FAILED_AGREEMENT_PAYMENTS',
                label: failedPayments === 1
                    ? '1 failed payment on this agreement'
                    : `${failedPayments} failed payments on this agreement`,
                weight: 20,
            });
        }
    }
    if (ctx.reporterId) {
        const since = new Date();
        since.setDate(since.getDate() - 90);
        const reporterReportCount = await database_1.default.report.count({
            where: {
                reportedById: ctx.reporterId,
                createdAt: { gte: since },
                ...(ctx.excludeReportId ? { NOT: { id: ctx.excludeReportId } } : {}),
            },
        });
        if (reporterReportCount >= 3) {
            factors.push({
                code: 'REPEAT_REPORTER',
                label: 'Reporter has filed multiple reports recently',
                weight: 15,
            });
        }
    }
    return { factors, breakdown };
}
function riskMergeBreakdowns(breakdowns) {
    return breakdowns.reduce((acc, b) => ({
        open: acc.open + b.open,
        in_review: acc.in_review + b.in_review,
        resolved: acc.resolved + b.resolved,
        dismissed: acc.dismissed + b.dismissed,
    }), { open: 0, in_review: 0, resolved: 0, dismissed: 0 });
}
async function riskBuildAssessment(subject, userIds, ctx) {
    const perUser = await Promise.all(userIds.map((userId, index) => riskAssessUser(userId, {
        ...ctx,
        propertyVerified: ctx.propertyVerified === false && (userIds.length === 1 || index === 0)
            ? false
            : undefined,
        includeAgreementReports: Boolean(ctx.agreementId),
    })));
    const factors = riskMergeFactors(perUser.map((r) => r.factors));
    const score = riskSumFactorWeights(factors);
    const breakdown = riskMergeBreakdowns(perUser.map((r) => r.breakdown));
    const unresolved = breakdown.open + breakdown.in_review;
    return {
        version: exports.RISK_ASSESSMENT_VERSION,
        computedAt: new Date().toISOString(),
        level: riskScoreToLevel(score),
        score,
        factors,
        previousReportsCount: unresolved,
        reportsAgainstSubject: breakdown,
        subject,
    };
}
async function riskResolveReportSubject(report) {
    const targetType = report.targetType;
    switch (targetType) {
        case 'user':
            return {
                subject: { type: 'user', userIds: [report.targetId] },
                userIds: [report.targetId],
            };
        case 'property': {
            const property = await database_1.default.property.findUnique({
                where: { id: report.targetId },
                select: { id: true, ownerId: true, isVerified: true },
            });
            if (!property)
                return null;
            return {
                subject: {
                    type: 'property',
                    userIds: [property.ownerId],
                    propertyId: property.id,
                },
                userIds: [property.ownerId],
                propertyVerified: property.isVerified,
            };
        }
        case 'agreement': {
            const agreement = await database_1.default.agreement.findUnique({
                where: { id: report.targetId },
                select: { id: true, ownerId: true, renterId: true, propertyId: true },
            });
            if (!agreement)
                return null;
            const property = await database_1.default.property.findUnique({
                where: { id: agreement.propertyId },
                select: { isVerified: true },
            });
            return {
                subject: {
                    type: 'agreement',
                    userIds: [agreement.ownerId, agreement.renterId],
                    propertyId: agreement.propertyId,
                    agreementId: agreement.id,
                },
                userIds: [agreement.ownerId, agreement.renterId],
                propertyVerified: property?.isVerified,
            };
        }
        default: {
            const user = await database_1.default.user.findUnique({
                where: { id: report.targetId },
                select: { id: true },
            });
            if (!user)
                return null;
            return {
                subject: { type: 'user', userIds: [user.id] },
                userIds: [user.id],
            };
        }
    }
}
async function getReportRiskAssessment(reportId) {
    const report = await database_1.default.report.findUnique({ where: { id: reportId } });
    if (!report)
        return null;
    const resolved = await riskResolveReportSubject(report);
    if (!resolved)
        return null;
    return riskBuildAssessment(resolved.subject, resolved.userIds, {
        excludeReportId: report.id,
        propertyVerified: resolved.propertyVerified,
        agreementId: resolved.subject.agreementId,
        reporterId: report.reportedById,
    });
}
async function getAgreementRiskAssessment(agreementId) {
    const agreement = await database_1.default.agreement.findUnique({
        where: { id: agreementId },
        select: { id: true, ownerId: true, renterId: true, propertyId: true },
    });
    if (!agreement)
        return null;
    const property = await database_1.default.property.findUnique({
        where: { id: agreement.propertyId },
        select: { isVerified: true },
    });
    const subject = {
        type: 'agreement',
        userIds: [agreement.ownerId, agreement.renterId],
        propertyId: agreement.propertyId,
        agreementId: agreement.id,
    };
    return riskBuildAssessment(subject, [agreement.ownerId, agreement.renterId], {
        propertyVerified: property?.isVerified,
        agreementId: agreement.id,
    });
}
async function getReviews(query) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    // Use 'any' type temporarily to bypass strict Prisma type checking if the schema isn't generated yet
    const prismaAny = database_1.default;
    if (!prismaAny.review)
        return { data: [], meta: { total: 0 } };
    const data = await prismaAny.review.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reviewer: { select: { id: true, first_name: true, last_name: true } } },
    });
    const total = await prismaAny.review.count();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
async function updateReviewStatus(adminId, id, status) {
    const prismaAny = database_1.default;
    if (!prismaAny.review)
        throw new Error('Review model not generated');
    const updated = await prismaAny.review.update({
        where: { id },
        data: { status },
    });
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'REVIEW_STATUS_UPDATED',
            entityType: 'Review',
            entityId: id,
            metadata: { status },
        },
    });
    return updated;
}
async function deleteReview(adminId, id) {
    const prismaAny = database_1.default;
    if (!prismaAny.review)
        throw new Error('Review model not generated');
    const deleted = await prismaAny.review.delete({
        where: { id },
    });
    await database_1.default.auditLog.create({
        data: { actorId: adminId, eventType: 'REVIEW_DELETED', entityType: 'Review', entityId: id },
    });
    return deleted;
}
