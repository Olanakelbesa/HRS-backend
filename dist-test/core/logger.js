"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const env_1 = require("../config/env");
const isDev = env_1.env.NODE_ENV === 'development';
exports.logger = {
    info: (msg, meta) => {
        console.log(`[INFO] ${msg}`, meta ?? '');
    },
    warn: (msg, meta) => {
        console.warn(`[WARN] ${msg}`, meta ?? '');
    },
    error: (msg, meta) => {
        console.error(`[ERROR] ${msg}`, meta ?? '');
    },
    debug: (msg, meta) => {
        if (isDev)
            console.debug(`[DEBUG] ${msg}`, meta ?? '');
    },
};
