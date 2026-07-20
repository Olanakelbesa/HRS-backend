import { AppError } from '../../core/AppError';
import { env } from '../../config/env';

const CHAPA_BASE = 'https://api.chapa.co/v1';

function getSecretKey(): string {
  const key = process.env.CHAPA_SECRET_KEY?.trim();
  if (!key) {
    throw new AppError('Chapa secret key is not configured', 500);
  }
  return key;
}

export type ChapaInitializePayload = {
  amount: string;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  tx_ref: string;
  callback_url: string;
  return_url: string;
  customization?: { title?: string; description?: string };
};

export type ChapaInitializeResult = {
  checkout_url: string;
  status?: string;
};

export async function initializeTransaction(
  payload: ChapaInitializePayload
): Promise<ChapaInitializeResult> {
  const res = await fetch(`${CHAPA_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    status?: string;
    message?: string;
    data?: { checkout_url?: string };
  };

  if (!res.ok || body.status !== 'success' || !body.data?.checkout_url) {
    throw new AppError(body.message || 'Chapa initialization failed', 502);
  }

  return { checkout_url: body.data.checkout_url, status: body.status };
}

export type ChapaVerifyResult = {
  status: string;
  amount?: number;
  currency?: string;
  tx_ref?: string;
};

export async function verifyTransaction(txRef: string): Promise<ChapaVerifyResult> {
  const res = await fetch(`${CHAPA_BASE}/transaction/verify/${encodeURIComponent(txRef)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
    },
  });

  const body = (await res.json()) as {
    status?: string;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      tx_ref?: string;
    };
  };

  if (!res.ok) {
    throw new AppError(body.message || 'Chapa verification failed', 502);
  }

  return {
    status: body.data?.status ?? body.status ?? 'unknown',
    amount: body.data?.amount,
    currency: body.data?.currency,
    tx_ref: body.data?.tx_ref ?? txRef,
  };
}

export function buildChapaUrls(txRef: string) {
  const base = env.APP_BASE_URL;
  return {
    callback_url: `${base}/api/payments/chapa/callback?tx_ref=${encodeURIComponent(txRef)}`,
    return_url: `${env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}`,
  };
}
