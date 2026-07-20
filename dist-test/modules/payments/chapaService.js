"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChapaTxRef = processChapaTxRef;
exports.handleChapaWebhook = handleChapaWebhook;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
const client_1 = require("../../integrations/chapa/client");
const deposit_1 = require("../agreements/deposit");
async function processChapaTxRef(txRef) {
    if (!txRef)
        throw new AppError_1.AppError('tx_ref is required', 400);
    const payment = await database_1.default.payment.findUnique({
        where: { chapaTxRef: txRef },
        include: { agreement: true },
    });
    if (!payment)
        throw new AppError_1.AppError('Payment not found for this reference', 404);
    if (payment.status === 'success') {
        return { payment, agreement: payment.agreement, alreadyCompleted: true };
    }
    if (payment.status === 'failed') {
        return { payment, agreement: payment.agreement, alreadyCompleted: false, failed: true };
    }
    const verified = await (0, client_1.verifyTransaction)(txRef);
    const normalized = (verified.status || '').toLowerCase();
    if (normalized === 'success' || normalized === 'successful') {
        return (0, deposit_1.finalizeSecurityDeposit)(payment);
    }
    if (normalized === 'failed' || normalized === 'failure') {
        await database_1.default.payment.update({
            where: { id: payment.id },
            data: { status: 'failed', failureReason: 'Chapa reported failure' },
        });
        return { payment, agreement: payment.agreement, alreadyCompleted: false, failed: true };
    }
    return { payment, agreement: payment.agreement, pending: true };
}
async function handleChapaWebhook(body) {
    const txRef = body.tx_ref ||
        body.txRef ||
        body.data?.tx_ref;
    if (!txRef) {
        throw new AppError_1.AppError('Missing tx_ref in webhook payload', 400);
    }
    return processChapaTxRef(txRef);
}
