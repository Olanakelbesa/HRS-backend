"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PEER_MESSAGE_NOTIFICATION_TYPE = void 0;
exports.normalizeRole = normalizeRole;
exports.isAdminRole = isAdminRole;
exports.excludePeerMessageNotifications = excludePeerMessageNotifications;
exports.canUseMessaging = canUseMessaging;
exports.PEER_MESSAGE_NOTIFICATION_TYPE = 'MESSAGE_NEW';
function normalizeRole(role) {
    return String(role ?? '').trim().toLowerCase();
}
function isAdminRole(role) {
    return normalizeRole(role) === 'admin';
}
/** Renter↔owner chat — not shown in admin notification views. */
function excludePeerMessageNotifications() {
    return { type: { not: exports.PEER_MESSAGE_NOTIFICATION_TYPE } };
}
function canUseMessaging(role) {
    const r = normalizeRole(role);
    return r === 'owner' || r === 'renter';
}
