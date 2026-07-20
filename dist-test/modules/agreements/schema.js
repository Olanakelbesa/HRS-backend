"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAgreementSchema = exports.cancelAgreementSchema = exports.sendAgreementSchema = exports.updateDraftAgreementSchema = exports.createOwnerAgreementSchema = exports.listOwnerAgreementsQuerySchema = exports.listAgreementsQuerySchema = void 0;
const zod_1 = require("zod");
const agreementStatusFilter = zod_1.z.enum([
    'draft',
    'sent',
    'payment_pending',
    'completed',
    'rejected',
    'cancelled',
    'terminated',
    'expired',
]);
exports.listAgreementsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    status: agreementStatusFilter.optional(),
});
exports.listOwnerAgreementsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: agreementStatusFilter.optional(),
});
exports.createOwnerAgreementSchema = zod_1.z
    .object({
    propertyId: zod_1.z.string().min(1),
    renterId: zod_1.z.string().min(1),
    startDate: zod_1.z.coerce.date(),
    endDate: zod_1.z.coerce.date(),
    monthlyRent: zod_1.z.coerce.number().positive().optional(),
    currency: zod_1.z.string().min(1).optional(),
    appointmentId: zod_1.z.string().min(1).optional(),
    ownerMessage: zod_1.z.string().max(2000).optional(),
    offerExpiresAt: zod_1.z.coerce.date(),
    send: zod_1.z.coerce.boolean().optional().default(false),
})
    .refine((d) => d.endDate > d.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
});
exports.updateDraftAgreementSchema = zod_1.z
    .object({
    startDate: zod_1.z.coerce.date().optional(),
    endDate: zod_1.z.coerce.date().optional(),
    monthlyRent: zod_1.z.coerce.number().positive().optional(),
    currency: zod_1.z.string().min(1).optional(),
    ownerMessage: zod_1.z.string().max(2000).optional(),
    offerExpiresAt: zod_1.z.coerce.date().optional(),
})
    .refine((d) => {
    if (d.startDate && d.endDate)
        return d.endDate > d.startDate;
    return true;
}, { message: 'endDate must be after startDate', path: ['endDate'] });
exports.sendAgreementSchema = zod_1.z.object({
    offerExpiresAt: zod_1.z.coerce.date().optional(),
});
exports.cancelAgreementSchema = zod_1.z.object({
    reason: zod_1.z.string().max(1000).optional(),
});
exports.rejectAgreementSchema = zod_1.z.object({
    reason: zod_1.z.string().max(1000).optional(),
});
