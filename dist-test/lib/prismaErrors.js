"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSchemaDriftError = isSchemaDriftError;
exports.schemaDriftUserMessage = schemaDriftUserMessage;
exports.formatPrismaError = formatPrismaError;
const client_1 = require("@prisma/client");
const SCHEMA_DRIFT_PATTERNS = [
    /PaymentStatus/i,
    /paymentStatus/i,
    /does not exist/i,
    /42704/,
    /P2022/i,
];
function isSchemaDriftError(error) {
    const message = error instanceof client_1.Prisma.PrismaClientKnownRequestError
        ? error.message
        : error instanceof Error
            ? error.message
            : String(error);
    return SCHEMA_DRIFT_PATTERNS.some((pattern) => pattern.test(message));
}
function schemaDriftUserMessage() {
    return 'The server database schema is out of sync. Please redeploy the latest backend or contact support.';
}
function formatPrismaError(error) {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (isSchemaDriftError(error)) {
            return { statusCode: 503, message: schemaDriftUserMessage() };
        }
        switch (error.code) {
            case 'P2002': {
                const fields = error.meta?.target || [];
                return {
                    statusCode: 409,
                    message: `A record with this ${fields.join(', ')} already exists`,
                };
            }
            case 'P2003':
                return { statusCode: 400, message: 'Related record not found' };
            case 'P2025':
                return { statusCode: 404, message: 'Record not found' };
            default:
                return { statusCode: 400, message: 'Database request failed' };
        }
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        return { statusCode: 503, message: schemaDriftUserMessage() };
    }
    if (isSchemaDriftError(error)) {
        return { statusCode: 503, message: schemaDriftUserMessage() };
    }
    if (error instanceof Error) {
        return { statusCode: 500, message: error.message };
    }
    return { statusCode: 500, message: 'Internal server error' };
}
