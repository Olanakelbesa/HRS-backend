"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.createAuditLog = createAuditLog;
exports.listNotifications = listNotifications;
exports.broadcastNotification = broadcastNotification;
exports.markNotificationRead = markNotificationRead;
exports.listAuditLogs = listAuditLogs;
const database_1 = __importDefault(require("../../config/database"));
const access_1 = require("./access");
async function createNotification(input) {
    return database_1.default.notification.create({
        data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            payload: input.payload,
        },
    });
}
async function createAuditLog(input) {
    return database_1.default.auditLog.create({
        data: {
            actorId: input.actorId,
            eventType: input.eventType,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: input.metadata,
        },
    });
}
/**
 * Single entry for GET /api/notifications — scope depends on role.
 * - admin: platform feed (excludes renter↔owner MESSAGE_NEW), paginated
 * - owner / renter: own inbox, all notification types
 */
async function listNotifications(input) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    if ((0, access_1.isAdminRole)(input.role)) {
        const where = (0, access_1.excludePeerMessageNotifications)();
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            database_1.default.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, first_name: true, last_name: true, role: true } },
                },
            }),
            database_1.default.notification.count({ where }),
        ]);
        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
        };
    }
    const notifications = await database_1.default.notification.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return { notifications };
}
async function broadcastNotification(adminId, payload) {
    const { audience, title, message } = payload;
    let userFilter = { role: { not: 'admin' } };
    if (audience === 'renters')
        userFilter = { role: 'renter' };
    else if (audience === 'owners')
        userFilter = { role: 'owner' };
    else if (audience === 'verified_owners')
        userFilter = { role: 'owner', isVerified: true };
    const users = await database_1.default.user.findMany({ where: userFilter, select: { id: true } });
    const notifications = users.map((u) => ({
        userId: u.id,
        type: 'APPOINTMENT_UPDATED',
        title,
        body: message,
        payload: { broadcast: true, audience },
    }));
    if (notifications.length > 0) {
        await database_1.default.notification.createMany({ data: notifications });
    }
    await database_1.default.auditLog.create({
        data: {
            actorId: adminId,
            eventType: 'BROADCAST_SENT',
            entityType: 'Notification',
            metadata: { audience, title, count: notifications.length },
        },
    });
    return { success: true, count: notifications.length };
}
async function markNotificationRead(userId, notificationId) {
    return database_1.default.notification.updateMany({
        where: {
            id: notificationId,
            userId,
        },
        data: {
            readAt: new Date(),
        },
    });
}
async function listAuditLogs() {
    return database_1.default.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            actor: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                },
            },
        },
    });
}
