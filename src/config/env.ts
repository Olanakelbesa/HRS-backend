import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

const envFile = resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envFile });
if (result.error) {
  console.warn(`Could not load .env from ${envFile}: ${result.error}`);
}

const emptyToUndefined = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());

const envSchema = z.object({
  PORT: z.string().default('5000'),
  APP_BASE_URL: optionalString,
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(
        /^(?:[^<>]+\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/,
        'EMAIL_FROM must be in the format email@example.com or Name <email@example.com>'
      )
      .default('House Rental <onboarding@resend.dev>')
  ),
  SUPPORT_EMAIL: optionalEmail,
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  GOOGLE_EMAIL_USER: optionalEmail,
  GOOGLE_EMAIL_PASS: optionalString,
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_URL: optionalString,
  CHAPA_SECRET_KEY: optionalString,
  CHAPA_PUBLICK_KEY: optionalString,
  EXCHANGE_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  EMBEDDING_URL: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  FACEBOOK_APP_ID: optionalString,
  FACEBOOK_CLIENT_ID: optionalString,
  FACEBOOK_APP_SECRET: optionalString,
  FACEBOOK_CLIENT_SECRET: optionalString,
  APPLE_CLIENT_ID: optionalString,
  APPLE_CLIENT_SECRET: optionalString,
  APPLE_TEAM_ID: optionalString,
  APPLE_KEY_ID: optionalString,
});

const rawEnv = envSchema.parse(process.env);

function deriveBaseUrl(appBaseUrl: string | undefined, nodeEnv: string, port: string): string {
  const fallback = `${nodeEnv === 'production' ? 'https' : 'http'}://localhost:${port}`;

  if (!appBaseUrl) return fallback;

  try {
    const normalizedInput = /^https?:\/\//i.test(appBaseUrl) ? appBaseUrl : `http://${appBaseUrl}`;
    const parsed = new URL(normalizedInput);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('APP_BASE_URL must use http or https protocol.');
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    console.warn(`Invalid APP_BASE_URL value "${appBaseUrl}". Falling back to ${fallback}.`);
    return fallback;
  }
}

const localOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const configuredOrigins = rawEnv.ALLOWED_ORIGINS
  ? rawEnv.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

export const env = {
  ...rawEnv,
  APP_BASE_URL: deriveBaseUrl(rawEnv.APP_BASE_URL, rawEnv.NODE_ENV, rawEnv.PORT),
  ALLOWED_ORIGINS: Array.from(
    new Set(
      [
        rawEnv.FRONTEND_URL,
        ...localOrigins, // Always include local origins for development
        ...configuredOrigins,
      ].filter(Boolean) as string[]
    )
  ),
};
