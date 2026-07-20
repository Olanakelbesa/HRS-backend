"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_ETB_PER_USD = void 0;
exports.getEtbPerUsd = getEtbPerUsd;
exports.getRentAmountEtb = getRentAmountEtb;
exports.buildRentAmountEtbSql = buildRentAmountEtbSql;
exports.enrichPrice = enrichPrice;
exports.normalizeDisplayCurrency = normalizeDisplayCurrency;
/** Fallback when EXCHANGE_API_KEY is missing or API fails. */
exports.FALLBACK_ETB_PER_USD = 56;
let cachedEtbPerUsd = null;
const CACHE_TTL_MS = 60 * 60 * 1000;
/**
 * Resolves ETB per 1 USD for rent comparisons and display.
 */
async function getEtbPerUsd() {
    if (cachedEtbPerUsd && Date.now() - cachedEtbPerUsd.fetchedAt < CACHE_TTL_MS) {
        return cachedEtbPerUsd.rate;
    }
    const apiKey = process.env.EXCHANGE_API_KEY?.trim();
    if (apiKey) {
        try {
            const { convertDepositToEtb } = await Promise.resolve().then(() => __importStar(require('../../lib/exchangeRate')));
            const conversion = await convertDepositToEtb(1, 'USD');
            cachedEtbPerUsd = { rate: conversion.fxRate, fetchedAt: Date.now() };
            return conversion.fxRate;
        }
        catch (err) {
            console.warn('⚠ Exchange rate API unavailable, using fallback ETB/USD rate.', err);
        }
    }
    return exports.FALLBACK_ETB_PER_USD;
}
/**
 * Monthly rent in ETB (uses stored amountEtb when present).
 */
function getRentAmountEtb(price, etbPerUsd) {
    if (!price)
        return 0;
    const stored = price.amountEtb != null ? Number(price.amountEtb) : NaN;
    if (Number.isFinite(stored) && stored > 0) {
        return Math.round(stored);
    }
    const value = Number(price.value ?? 0);
    if (!Number.isFinite(value) || value <= 0)
        return 0;
    const currency = String(price.currency ?? 'ETB').toUpperCase();
    if (currency === 'USD') {
        return Math.round(value * etbPerUsd);
    }
    return Math.round(value);
}
/**
 * SQL expression: comparable monthly rent in ETB for WHERE clauses.
 */
function buildRentAmountEtbSql(etbPerUsd) {
    const rate = Number(etbPerUsd);
    return `COALESCE(
    NULLIF((p.price->>'amountEtb')::numeric, 0),
    CASE
      WHEN UPPER(COALESCE(p.price->>'currency', 'ETB')) = 'USD'
      THEN (p.price->>'value')::numeric * ${rate}
      ELSE (p.price->>'value')::numeric
    END
  )`;
}
/**
 * API price object with amountEtb for search/list responses.
 */
function enrichPrice(price, etbPerUsd, displayCurrency = 'ETB') {
    const rawValue = Number(price?.value ?? 0);
    const storedCurrency = String(price?.currency ?? 'ETB').toUpperCase();
    const amountEtb = getRentAmountEtb(price, etbPerUsd);
    if (displayCurrency === 'USD' && storedCurrency === 'ETB' && amountEtb > 0) {
        return {
            value: Math.round((amountEtb / etbPerUsd) * 100) / 100,
            currency: 'USD',
            amountEtb,
        };
    }
    if (displayCurrency === 'ETB' && storedCurrency === 'USD' && amountEtb > 0) {
        return {
            value: rawValue,
            currency: 'USD',
            amountEtb,
        };
    }
    return {
        value: rawValue,
        currency: storedCurrency || 'ETB',
        amountEtb,
    };
}
function normalizeDisplayCurrency(value) {
    const c = String(value ?? 'ETB').trim().toUpperCase();
    return c === 'USD' ? 'USD' : 'ETB';
}
