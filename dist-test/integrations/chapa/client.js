"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTransaction = initializeTransaction;
exports.verifyTransaction = verifyTransaction;
exports.buildChapaUrls = buildChapaUrls;
const AppError_1 = require("../../core/AppError");
const env_1 = require("../../config/env");
const CHAPA_BASE = 'https://api.chapa.co/v1';
function getSecretKey() {
    const key = process.env.CHAPA_SECRET_KEY?.trim();
    if (!key) {
        throw new AppError_1.AppError('Chapa secret key is not configured', 500);
    }
    return key;
}
async function initializeTransaction(payload) {
    const res = await fetch(`${CHAPA_BASE}/transaction/initialize`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getSecretKey()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const body = (await res.json());
    if (!res.ok || body.status !== 'success' || !body.data?.checkout_url) {
        throw new AppError_1.AppError(body.message || 'Chapa initialization failed', 502);
    }
    return { checkout_url: body.data.checkout_url, status: body.status };
}
async function verifyTransaction(txRef) {
    const res = await fetch(`${CHAPA_BASE}/transaction/verify/${encodeURIComponent(txRef)}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${getSecretKey()}`,
        },
    });
    const body = (await res.json());
    if (!res.ok) {
        throw new AppError_1.AppError(body.message || 'Chapa verification failed', 502);
    }
    return {
        status: body.data?.status ?? body.status ?? 'unknown',
        amount: body.data?.amount,
        currency: body.data?.currency,
        tx_ref: body.data?.tx_ref ?? txRef,
    };
}
function buildChapaUrls(txRef) {
    const base = env_1.env.APP_BASE_URL;
    return {
        callback_url: `${base}/api/payments/chapa/callback?tx_ref=${encodeURIComponent(txRef)}`,
        return_url: `${env_1.env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}`,
    };
}
