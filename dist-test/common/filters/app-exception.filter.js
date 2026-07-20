"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const AppError_1 = require("../../core/AppError");
const logger_1 = require("../../core/logger");
const prismaErrors_1 = require("../../lib/prismaErrors");
const errors_1 = require("../../modules/interactions/errors");
let AppExceptionFilter = class AppExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        if (exception instanceof errors_1.InteractionApiError) {
            return response.status(exception.statusCode).json(exception.toJSON());
        }
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal Server Error';
        let errors;
        if (exception instanceof AppError_1.AppError) {
            statusCode = exception.statusCode;
            message = exception.message;
        }
        else if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            }
            else if (typeof body === 'object' && body !== null) {
                const obj = body;
                message = obj.message || message;
                if (Array.isArray(obj.message)) {
                    message = 'Validation failed';
                    errors = { issues: obj.message };
                }
                if (obj.errors && typeof obj.errors === 'object') {
                    errors = obj.errors;
                }
            }
        }
        else if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError ||
            exception instanceof client_1.Prisma.PrismaClientValidationError ||
            (0, prismaErrors_1.isSchemaDriftError)(exception)) {
            const formatted = (0, prismaErrors_1.formatPrismaError)(exception);
            statusCode = formatted.statusCode;
            message = formatted.message;
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        if (statusCode >= 500) {
            logger_1.logger.error('Unhandled Error', {
                error: exception instanceof Error ? exception.message : String(exception),
                stack: exception instanceof Error ? exception.stack : undefined,
                path: request.url,
            });
        }
        const stack = process.env.NODE_ENV === 'development' && exception instanceof Error
            ? exception.stack
            : undefined;
        response.status(statusCode).json({
            status: 'error',
            message,
            ...(errors && { errors }),
            ...(stack && { stack }),
        });
    }
};
exports.AppExceptionFilter = AppExceptionFilter;
exports.AppExceptionFilter = AppExceptionFilter = __decorate([
    (0, common_1.Catch)()
], AppExceptionFilter);
