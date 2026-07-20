"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safePrisma = safePrisma;
const logger_1 = require("../core/logger");
const prismaErrors_1 = require("./prismaErrors");
async function safePrisma(label, fn, fallback) {
    try {
        return { value: await fn() };
    }
    catch (error) {
        if ((0, prismaErrors_1.isSchemaDriftError)(error)) {
            logger_1.logger.warn(`Prisma schema drift (${label})`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return { value: fallback, warning: label };
        }
        throw error;
    }
}
