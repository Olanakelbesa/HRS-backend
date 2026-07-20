"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportsAgainstOwner = getReportsAgainstOwner;
exports.getOwnerReportById = getOwnerReportById;
exports.createReport = createReport;
exports.submitOwnerResponse = submitOwnerResponse;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Fetch paginated reports that target the logged-in owner's properties or the
 * owner themselves, together with summary counters (total / open / resolved).
 */
async function getReportsAgainstOwner(ownerId, query) {
    const skip = (query.page - 1) * query.limit;
    // A report is "against the owner" when:
    //   targetType = 'user'     AND targetId = ownerId
    //   targetType = 'property' AND targetId is one of the owner's properties
    const ownerPropertyIds = await database_1.default.property
        .findMany({ where: { ownerId, isDeleted: false }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
    const where = {
        OR: [
            { targetType: 'user', targetId: ownerId },
            ...(ownerPropertyIds.length > 0
                ? [{ targetType: 'property', targetId: { in: ownerPropertyIds } }]
                : []),
        ],
        ...(query.status ? { status: query.status } : {}),
    };
    const [items, total, openCount, resolvedCount] = await Promise.all([
        database_1.default.report.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
            include: {
                reportedBy: {
                    select: { id: true, first_name: true, last_name: true, image: true, role: true },
                },
            },
        }),
        database_1.default.report.count({ where }),
        database_1.default.report.count({ where: { ...where, status: 'open' } }),
        database_1.default.report.count({ where: { ...where, status: 'resolved' } }),
    ]);
    return {
        summary: { total, open: openCount, resolved: resolvedCount },
        items,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
}
/**
 * Fetch a single report by ID, but only if it is actually against the owner.
 */
async function getOwnerReportById(ownerId, reportId) {
    const ownerPropertyIds = await database_1.default.property
        .findMany({ where: { ownerId, isDeleted: false }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
    const report = await database_1.default.report.findUnique({
        where: { id: reportId },
        include: {
            reportedBy: {
                select: { id: true, first_name: true, last_name: true, image: true, role: true },
            },
        },
    });
    if (!report)
        return null;
    const isAgainstOwner = (report.targetType === 'user' && report.targetId === ownerId) ||
        (report.targetType === 'property' && ownerPropertyIds.includes(report.targetId));
    if (!isAgainstOwner)
        return null;
    return report;
}
async function hasAppointmentOrConversationWithProperty(reporterId, propertyId, ownerId) {
    const hasAppointment = await database_1.default.appointment.findFirst({
        where: {
            propertyId,
            renterId: reporterId,
            ownerId,
            status: { in: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] },
        },
    });
    const hasConversation = await database_1.default.conversation.findFirst({
        where: {
            propertyId,
            renterId: reporterId,
            ownerId,
            messages: { some: {} },
        },
    });
    return Boolean(hasAppointment || hasConversation);
}
async function hasAppointmentOrConversationWithUser(reporterId, userId) {
    if (reporterId === userId) {
        return false;
    }
    const hasAppointment = await database_1.default.appointment.findFirst({
        where: {
            renterId: reporterId,
            ownerId: userId,
            status: { in: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] },
        },
    });
    const hasConversation = await database_1.default.conversation.findFirst({
        where: {
            renterId: reporterId,
            ownerId: userId,
            messages: { some: {} },
        },
    });
    return Boolean(hasAppointment || hasConversation);
}
async function createReport(reporterId, input) {
    if (input.targetType === 'property') {
        const property = await database_1.default.property.findUnique({
            where: { id: input.targetId },
            select: { id: true, ownerId: true },
        });
        if (!property) {
            throw new Error('Property not found');
        }
        const authorized = await hasAppointmentOrConversationWithProperty(reporterId, input.targetId, property.ownerId);
        if (!authorized) {
            throw new Error('You can only report properties that you have booked an appointment for or started a conversation about.');
        }
    }
    else {
        const user = await database_1.default.user.findUnique({
            where: { id: input.targetId },
            select: { id: true },
        });
        if (!user) {
            throw new Error('User not found');
        }
        const authorized = await hasAppointmentOrConversationWithUser(reporterId, input.targetId);
        if (!authorized) {
            throw new Error('You can only report users that you have booked an appointment with or started a conversation with.');
        }
    }
    const report = await database_1.default.report.create({
        data: {
            reportedById: reporterId,
            targetType: input.targetType,
            targetId: input.targetId,
            category: input.category,
            description: input.description,
            status: 'open',
            images: input.images ?? [],
        },
    });
    return report;
}
/**
 * Submit (or update) the owner's response to a specific report.
 * Only allowed when the report status is 'open' or 'in_review'.
 */
async function submitOwnerResponse(ownerId, reportId, responseText) {
    // Verify this report belongs to the owner first
    const report = await getOwnerReportById(ownerId, reportId);
    if (!report)
        return { error: 'not_found' };
    if (report.status === 'resolved' || report.status === 'dismissed') {
        return { error: 'already_closed' };
    }
    const updated = await database_1.default.report.update({
        where: { id: reportId },
        data: {
            ownerResponse: responseText,
            respondedAt: new Date(),
        },
    });
    return { data: updated };
}
