"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPayments = exports.getPaymentProof = exports.uploadPaymentProof = exports.confirmPayment = exports.getPaymentSummary = exports.listPayments = void 0;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
const uploadToCloudinary_1 = require("../../utils/uploadToCloudinary");
const listPayments = async (userId, query) => {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;
    const where = {
        agreement: {
            OR: [{ ownerId: userId }, { renterId: userId }],
        },
        ...(status && { status }),
        ...(search && {
            OR: [
                { id: { contains: search, mode: 'insensitive' } },
                { agreement: { property: { title: { path: ['en'], string_contains: search } } } },
                { agreement: { property: { title: { path: ['am'], string_contains: search } } } },
                {
                    agreement: {
                        renter: { first_name: { contains: search, mode: 'insensitive' } },
                    },
                },
                {
                    agreement: {
                        renter: { last_name: { contains: search, mode: 'insensitive' } },
                    },
                },
            ],
        }),
    };
    const [payments, total] = await Promise.all([
        database_1.default.payment.findMany({
            where,
            include: {
                agreement: {
                    select: {
                        property: { select: { title: true } },
                        renter: { select: { first_name: true, last_name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        database_1.default.payment.count({ where }),
    ]);
    return {
        payments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.listPayments = listPayments;
const getPaymentSummary = async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalReceived, pendingAmount, thisMonth] = await Promise.all([
        database_1.default.payment.aggregate({
            where: {
                agreement: { ownerId: userId },
                status: 'success',
            },
            _sum: { amount: true },
        }),
        database_1.default.payment.aggregate({
            where: {
                agreement: { ownerId: userId },
                status: { in: ['pending', 'processing'] },
            },
            _sum: { amount: true },
        }),
        database_1.default.payment.aggregate({
            where: {
                agreement: { ownerId: userId },
                status: 'success',
                confirmedAt: { gte: startOfMonth },
            },
            _sum: { amount: true },
        }),
    ]);
    return {
        totalReceived: totalReceived._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0,
        thisMonth: thisMonth._sum.amount || 0,
    };
};
exports.getPaymentSummary = getPaymentSummary;
const confirmPayment = async (paymentId, userId) => {
    const payment = await database_1.default.payment.findUnique({
        where: { id: paymentId },
        include: {
            agreement: {
                include: {
                    renter: true,
                    property: true,
                },
            },
        },
    });
    if (!payment)
        throw new AppError_1.AppError('Payment not found', 404);
    if (payment.agreement.ownerId !== userId)
        throw new AppError_1.AppError('Unauthorized', 403);
    if (payment.status === 'success')
        throw new AppError_1.AppError('Payment already confirmed', 400);
    if (payment.provider === 'chapa' && payment.purpose === 'security_deposit') {
        throw new AppError_1.AppError('Chapa deposits are confirmed automatically after payment', 400);
    }
    const updatedPayment = await database_1.default.$transaction(async (tx) => {
        const p = await tx.payment.update({
            where: { id: paymentId },
            data: {
                status: 'success',
                confirmedAt: new Date(),
            },
        });
        await tx.notification.create({
            data: {
                userId: payment.agreement.renterId,
                type: 'PAYMENT_CONFIRMED',
                title: 'Payment Confirmed',
                body: `Your payment for ${typeof payment.agreement.property.title === 'string'
                    ? payment.agreement.property.title
                    : payment.agreement.property.title?.en} has been confirmed.`,
            },
        });
        await tx.auditLog.create({
            data: {
                actorId: userId,
                eventType: 'payment.confirmed',
                entityType: 'Payment',
                entityId: paymentId,
                metadata: { amount: payment.amount, agreementId: payment.agreementId },
            },
        });
        return p;
    });
    return updatedPayment;
};
exports.confirmPayment = confirmPayment;
const uploadPaymentProof = async (paymentId, userId, fileBuffer) => {
    const payment = await database_1.default.payment.findUnique({
        where: { id: paymentId },
        include: { agreement: true },
    });
    if (!payment)
        throw new AppError_1.AppError('Payment not found', 404);
    if (payment.agreement.renterId !== userId)
        throw new AppError_1.AppError('Only the renter can upload proof', 403);
    if (payment.provider === 'chapa') {
        throw new AppError_1.AppError('Proof upload is not used for Chapa payments', 400);
    }
    const proofUrl = await (0, uploadToCloudinary_1.uploadToCloudinary)(fileBuffer, 'payment_proofs', 'image');
    return database_1.default.payment.update({
        where: { id: paymentId },
        data: {
            proofUrl,
            status: 'processing',
        },
    });
};
exports.uploadPaymentProof = uploadPaymentProof;
const getPaymentProof = async (paymentId, userId) => {
    const payment = await database_1.default.payment.findUnique({
        where: { id: paymentId },
        include: { agreement: true },
    });
    if (!payment)
        throw new AppError_1.AppError('Payment not found', 404);
    if (payment.agreement.ownerId !== userId && payment.agreement.renterId !== userId) {
        throw new AppError_1.AppError('Unauthorized', 403);
    }
    return { proofUrl: payment.proofUrl };
};
exports.getPaymentProof = getPaymentProof;
const exportPayments = async (userId, query) => {
    const { status, search } = query;
    const where = {
        agreement: { ownerId: userId },
        ...(status && { status }),
        ...(search && {
            OR: [
                { id: { contains: search, mode: 'insensitive' } },
                { agreement: { property: { title: { path: ['en'], string_contains: search } } } },
                { agreement: { property: { title: { path: ['am'], string_contains: search } } } },
                {
                    agreement: {
                        renter: { first_name: { contains: search, mode: 'insensitive' } },
                    },
                },
                {
                    agreement: {
                        renter: { last_name: { contains: search, mode: 'insensitive' } },
                    },
                },
            ],
        }),
    };
    return database_1.default.payment.findMany({
        where,
        include: {
            agreement: {
                select: {
                    property: { select: { title: true } },
                    renter: { select: { first_name: true, last_name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};
exports.exportPayments = exportPayments;
