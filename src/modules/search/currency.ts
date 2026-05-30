/** Fallback when EXCHANGE_API_KEY is missing or API fails. */
export const FALLBACK_ETB_PER_USD = 56;

export type SupportedCurrency = 'ETB' | 'USD';

export interface PriceJson {
  value?: number;
  currency?: string;
  amountEtb?: number;
}

let cachedEtbPerUsd: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Resolves ETB per 1 USD for rent comparisons and display.
 */
export async function getEtbPerUsd(): Promise<number> {
  if (cachedEtbPerUsd && Date.now() - cachedEtbPerUsd.fetchedAt < CACHE_TTL_MS) {
    return cachedEtbPerUsd.rate;
  }

  const apiKey = process.env.EXCHANGE_API_KEY?.trim();
  if (apiKey) {
    try {
      const { convertDepositToEtb } = await import('../../lib/exchangeRate');
      const conversion = await convertDepositToEtb(1, 'USD');
      cachedEtbPerUsd = { rate: conversion.fxRate, fetchedAt: Date.now() };
      return conversion.fxRate;
    } catch (err) {
      console.warn('⚠ Exchange rate API unavailable, using fallback ETB/USD rate.', err);
    }
  }

  return FALLBACK_ETB_PER_USD;
}

/**
 * Monthly rent in ETB (uses stored amountEtb when present).
 */
export function getRentAmountEtb(price: PriceJson | null | undefined, etbPerUsd: number): number {
  if (!price) return 0;

  const stored = price.amountEtb != null ? Number(price.amountEtb) : NaN;
  if (Number.isFinite(stored) && stored > 0) {
    return Math.round(stored);
  }

  const value = Number(price.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;

  const currency = String(price.currency ?? 'ETB').toUpperCase();
  if (currency === 'USD') {
    return Math.round(value * etbPerUsd);
  }

  return Math.round(value);
}

/**
 * SQL expression: comparable monthly rent in ETB for WHERE clauses.
 */
export function buildRentAmountEtbSql(etbPerUsd: number): string {
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
export function enrichPrice(
  price: PriceJson | null | undefined,
  etbPerUsd: number,
  displayCurrency: SupportedCurrency = 'ETB',
): { value: number; currency: string; amountEtb: number } {
  const rawValue = Number(price?.value ?? 0);
  const storedCurrency = String(price?.currency ?? 'ETB').toUpperCase() as SupportedCurrency;
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

export function normalizeDisplayCurrency(value: unknown): SupportedCurrency {
  const c = String(value ?? 'ETB').trim().toUpperCase();
  return c === 'USD' ? 'USD' : 'ETB';
}
