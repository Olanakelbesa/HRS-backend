import { AppError } from '../core/AppError';

const EXCHANGE_API_BASE = 'https://v6.exchangerate-api.com/v6';

type RatesResponse = {
  result?: string;
  conversion_rates?: Record<string, number>;
};

let cachedEtbPerUsd: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

function getApiKey(): string {
  const key = process.env.EXCHANGE_API_KEY?.trim();
  if (!key) {
    throw new AppError('Exchange rate API key is not configured', 500);
  }
  return key;
}

async function fetchEtbPerUnit(baseCurrency: string): Promise<number> {
  const normalized = baseCurrency.toUpperCase();
  if (normalized === 'ETB') return 1;

  if (normalized === 'USD' && cachedEtbPerUsd && Date.now() - cachedEtbPerUsd.fetchedAt < CACHE_TTL_MS) {
    return cachedEtbPerUsd.rate;
  }

  const url = `${EXCHANGE_API_BASE}/${getApiKey()}/latest/${normalized}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new AppError(`Failed to fetch exchange rates (${res.status})`, 502);
  }

  const body = (await res.json()) as RatesResponse;
  const etbRate = body.conversion_rates?.ETB;
  if (!etbRate || etbRate <= 0) {
    throw new AppError('ETB exchange rate unavailable', 502);
  }

  if (normalized === 'USD') {
    cachedEtbPerUsd = { rate: etbRate, fetchedAt: Date.now() };
  }

  return etbRate;
}

export type DepositConversion = {
  originalAmount: number;
  originalCurrency: string;
  depositAmountEtb: number;
  fxRate: number;
  fxRateAt: Date;
};

/**
 * Convert deposit to ETB using ExchangeRate-API (https://www.exchangerate-api.com/docs/overview).
 */
export async function convertDepositToEtb(
  value: number,
  currency: string
): Promise<DepositConversion> {
  if (value <= 0) {
    throw new AppError('Deposit amount must be positive', 400);
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
