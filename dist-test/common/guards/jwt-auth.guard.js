"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const jwt_utils_1 = require("../../utils/jwt.utils");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (isPublic) {
            // Optional auth: attach user when a valid Bearer token is present
            if (token) {
                try {
                    const { userId, role } = (0, jwt_utils_1.verifyAccessToken)(token);
                    request.user = { userId, role };
                }
                catch {
                    // Ignore invalid tokens on public routes
                }
            }
            return true;
        }
        if (!token) {
            throw new common_1.UnauthorizedException('Authorization token required');
        }
        try {
            const { userId, role } = (0, jwt_utils_1.verifyAccessToken)(token);
            request.user = { userId, role };
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid or expired token';
            throw new common_1.UnauthorizedException(message);
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], JwtAuthGuard);
