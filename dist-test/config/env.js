"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('5000'),
    APP_BASE_URL: zod_1.z.string().optional(),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url().default('redis://localhost:6379'),
    FRONTEND_URL: zod_1.z.string().url().default('http://localhost:3000'),
    ALLOWED_ORIGINS: zod_1.z.string().optional(),
    RESEND_API_KEY: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z
        .string()
        .regex(/^(?:[^<>]+\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/, 'EMAIL_FROM must be in the format email@example.com or Name <email@example.com>')
        .default('House Rental <onboarding@resend.dev>'),
    SUPPORT_EMAIL: zod_1.z.string().email().optional(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    GOOGLE_EMAIL_USER: zod_1.z.string().email().optional(),
    GOOGLE_EMAIL_PASS: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    CLOUDINARY_URL: zod_1.z.string().optional(),
    CHAPA_SECRET_KEY: zod_1.z.string().optional(),
    CHAPA_PUBLICK_KEY: zod_1.z.string().optional(),
    EXCHANGE_API_KEY: zod_1.z.string().optional(),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    EMBEDDING_URL: zod_1.z.string().optional(),
});
const rawEnv = envSchema.parse(process.env);
function deriveBaseUrl(appBaseUrl, nodeEnv, port) {
    const fallback = `${nodeEnv === 'production' ? 'https' : 'http'}://localhost:${port}`;
    if (!appBaseUrl)
        return fallback;
    try {
        const normalizedInput = /^https?:\/\//i.test(appBaseUrl) ? appBaseUrl : `http://${appBaseUrl}`;
        const parsed = new URL(normalizedInput);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('APP_BASE_URL must use http or https protocol.');
        }
        return parsed.toString().replace(/\/$/, '');
    }
    catch {
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
exports.env = {
    ...rawEnv,
    APP_BASE_URL: deriveBaseUrl(rawEnv.APP_BASE_URL, rawEnv.NODE_ENV, rawEnv.PORT),
    ALLOWED_ORIGINS: Array.from(new Set([
        rawEnv.FRONTEND_URL,
        ...localOrigins, // Always include local origins for development
        ...configuredOrigins,
    ].filter(Boolean))),
};
