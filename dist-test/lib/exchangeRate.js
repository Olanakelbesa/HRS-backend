"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDepositToEtb = convertDepositToEtb;
const AppError_1 = require("../core/AppError");
const EXCHANGE_API_BASE = 'https://v6.exchangerate-api.com/v6';
let cachedEtbPerUsd = null;
const CACHE_TTL_MS = 60 * 60 * 1000;
function getApiKey() {
    const key = process.env.EXCHANGE_API_KEY?.trim();
    if (!key) {
        throw new AppError_1.AppError('Exchange rate API key is not configured', 500);
    }
    return key;
}
async function fetchEtbPerUnit(baseCurrency) {
    const normalized = baseCurrency.toUpperCase();
    if (normalized === 'ETB')
        return 1;
    if (normalized === 'USD' && cachedEtbPerUsd && Date.now() - cachedEtbPerUsd.fetchedAt < CACHE_TTL_MS) {
        return cachedEtbPerUsd.rate;
    }
    const url = `${EXCHANGE_API_BASE}/${getApiKey()}/latest/${normalized}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new AppError_1.AppError(`Failed to fetch exchange rates (${res.status})`, 502);
    }
    const body = (await res.json());
    const etbRate = body.conversion_rates?.ETB;
    if (!etbRate || etbRate <= 0) {
        throw new AppError_1.AppError('ETB exchange rate unavailable', 502);
    }
    if (normalized === 'USD') {
        cachedEtbPerUsd = { rate: etbRate, fetchedAt: Date.now() };
    }
    return etbRate;
}
/**
 * Convert deposit to ETB using ExchangeRate-API (https://www.exchangerate-api.com/docs/overview).
 */
async function convertDepositToEtb(value, currency) {
    if (value <= 0) {
        throw new AppError_1.AppError('Deposit amount must be positive', 400);
    }
    const originalCurrency = currency.toUpperCase();
    const fxRateAt = new Date();
    if (originalCurrency === 'ETB') {
        return {
            originalAmount: value,
            originalCurrency,
            depositAmountEtb: Math.round(value * 100) / 100,
            fxRate: 1,
            fxRateAt,
        };
    }
    const etbPerUnit = await fetchEtbPerUnit(originalCurrency);
    const depositAmountEtb = Math.round(value * etbPerUnit * 100) / 100;
    return {
        originalAmount: value,
        originalCurrency,
        depositAmountEtb,
        fxRate: etbPerUnit,
        fxRateAt,
    };
}
