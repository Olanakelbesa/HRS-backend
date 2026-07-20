"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseEnvelopeInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let ResponseEnvelopeInterceptor = class ResponseEnvelopeInterceptor {
    intercept(_context, next) {
        return next.handle().pipe((0, operators_1.map)((payload) => {
            if (payload === undefined || payload === null) {
                return { status: 'success', data: null };
            }
            // Already enveloped or raw health-style responses
            if (typeof payload === 'object' &&
                payload !== null &&
                'status' in payload &&
                (payload.status === 'success' ||
                    payload.status === 'error' ||
                    payload.status === 'ok')) {
                return payload;
            }
            if (typeof payload === 'object' &&
                payload !== null &&
                'message' in payload &&
                !('data' in payload) &&
                Object.keys(payload).length === 1) {
                return {
                    status: 'success',
                    message: payload.message,
                };
            }
            return { status: 'success', data: payload };
        }));
    }
};
exports.ResponseEnvelopeInterceptor = ResponseEnvelopeInterceptor;
exports.ResponseEnvelopeInterceptor = ResponseEnvelopeInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseEnvelopeInterceptor);
