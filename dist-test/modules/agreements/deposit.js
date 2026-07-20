"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeSecurityDeposit = finalizeSecurityDeposit;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
/**
 * Idempotent: mark security deposit paid and activate agreement.
 */
async function finalizeSecurityDeposit(payment) {
    if (payment.purpose !== 'security_deposit') {
        throw new AppError_1.AppError('Not a security deposit payment', 400);
    }
    if (payment.status === 'success') {
        const agreement = await database_1.default.agreement.findUnique({ where: { id: payment.agreementId } });
        return { payment, agreement, alreadyCompleted: true };
    }
    return database_1.default.$transaction(async (tx) => {
        const current = await tx.payment.findUnique({ where: { id: payment.id } });
        if (!current)
            throw new AppError_1.AppError('Payment not found', 404);
        if (current.status === 'success') {
            const agreement = await tx.agreement.findUnique({ where: { id: current.agreementId } });
            return { payment: current, agreement, alreadyCompleted: true };
        }
        const updateResult = await tx.payment.updateMany({
            where: {
                id: current.id,
                status: { not: 'success' },
            },
            data: {
                status: 'success',
                paidAt: new Date(),
                confirmedAt: new Date(),
            },
        });
        if (updateResult.count === 0) {
            const freshPayment = await tx.payment.findUnique({
                where: { id: current.id },
                include: { agreement: true },
            });
            if (!freshPayment)
                throw new AppError_1.AppError('Payment not found', 404);
            return { payment: freshPayment, agreement: freshPayment.agreement, alreadyCompleted: true };
        }
        const updatedPayment = await tx.payment.findUnique({
            where: { id: current.id },
        });
        if (!updatedPayment)
            throw new AppError_1.AppError('Payment not found', 404);
        const agreement = await tx.agreement.findUnique({
            where: { id: current.agreementId },
            include: { property: true, renter: true, owner: true },
        });
        if (!agreement)
            throw new AppError_1.AppError('Agreement not found', 404);
        if (agreement.status === 'completed') {
            return { payment: updatedPayment, agreement, alreadyCompleted: true };
        }
        if (agreement.status !== 'payment_pending') {
            throw new AppError_1.AppError('Agreement is not awaiting deposit payment', 409);
        }
        const activated = await tx.agreement.update({
            where: { id: agreement.id },
            data: {
                status: 'completed',
                activatedAt: new Date(),
            },
        });
        await tx.property.update({
            where: { id: agreement.propertyId },
            data: { status: 'RENTED' },
        });
        const title = typeof agreement.property.title === 'string'
            ? agreement.property.title
            : agreement.property.title?.en || 'Property';
        await tx.notification.createMany({
            data: [
                {
                    userId: agreement.renterId,
                    type: 'PAYMENT_CONFIRMED',
                    title: 'Lease activated',
                    body: `Your security deposit for ${title} was received. The agreement is now active.`,
                },
                {
                    userId: agreement.ownerId,
                    type: 'PAYMENT_RECEIVED',
                    title: 'Lease activated',
                    body: `Security deposit received for ${title}. The agreement is now active.`,
                },
            ],
        });
        await tx.auditLog.create({
            data: {
                actorId: agreement.renterId,
                eventType: 'AGREEMENT_ACTIVATED',
                entityType: 'Agreement',
                entityId: agreement.id,
                metadata: { paymentId: current.id, chapaTxRef: current.chapaTxRef },
            },
        });
        return { payment: updatedPayment, agreement: activated, alreadyCompleted: false };
    }, {
        timeout: 15000,
    });
}
