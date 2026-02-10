import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

export const logger = {
  info: (msg: string, meta?: object) => {
    console.log(`[INFO] ${msg}`, meta ?? '');
  },
  warn: (msg: string, meta?: object) => {
    console.warn(`[WARN] ${msg}`, meta ?? '');
  },
  error: (msg: string, meta?: object) => {
    console.error(`[ERROR] ${msg}`, meta ?? '');
  },
  debug: (msg: string, meta?: object) => {
    if (isDev) console.debug(`[DEBUG] ${msg}`, meta ?? '');
  },
};
