"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAuthGuard = void 0;
const common_1 = require("@nestjs/common");
let ServiceAuthGuard = class ServiceAuthGuard {
    canActivate(context) {
        const serviceToken = process.env.RECOMMENDATION_SERVICE_TOKEN;
        if (!serviceToken) {
            throw new common_1.ServiceUnavailableException({
                success: false,
                error: {
                    code: 'SERVICE_AUTHENTICATION_REQUIRED',
                    message: 'Service token is not configured on the server',
                },
            });
        }
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token || token !== serviceToken) {
            throw new common_1.UnauthorizedException({
                success: false,
                error: {
                    code: 'SERVICE_AUTHENTICATION_REQUIRED',
                    message: 'This endpoint requires a valid service token',
                },
            });
        }
        return true;
    }
};
exports.ServiceAuthGuard = ServiceAuthGuard;
exports.ServiceAuthGuard = ServiceAuthGuard = __decorate([
    (0, common_1.Injectable)()
], ServiceAuthGuard);
