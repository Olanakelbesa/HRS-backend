"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKING_AGREEMENT_STATUSES = exports.OPEN_AGREEMENT_STATUSES = exports.AGREEMENT_STATUS_LABELS = void 0;
exports.formatAgreementStatus = formatAgreementStatus;
exports.enrichAgreement = enrichAgreement;
/** User-facing labels returned in API responses */
exports.AGREEMENT_STATUS_LABELS = {
    draft: 'Draft',
    sent: 'Sent',
    payment_pending: 'Payment Pending',
    completed: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    terminated: 'Terminated',
    expired: 'Expired',
};
exports.OPEN_AGREEMENT_STATUSES = [
    'sent',
    'payment_pending',
    'completed',
];
exports.BLOCKING_AGREEMENT_STATUSES = [
    'sent',
    'payment_pending',
    'completed',
];
function formatAgreementStatus(status) {
    return {
        status,
        statusLabel: exports.AGREEMENT_STATUS_LABELS[status] ?? status,
    };
}
function enrichAgreement(row) {
    return {
        ...row,
        ...formatAgreementStatus(row.status),
    };
}
