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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const public_decorator_1 = require("./common/decorators/public.decorator");
const throttler_1 = require("@nestjs/throttler");
let HealthController = class HealthController {
    rootHealth() {
        return {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            build: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.BUILD_ID || 'local',
        };
    }
    schemaHealth() {
        const agreement = client_1.Prisma.dmmf.datamodel.models.find((m) => m.name === 'Agreement');
        const payment = client_1.Prisma.dmmf.datamodel.models.find((m) => m.name === 'Payment');
        const enums = client_1.Prisma.dmmf.datamodel.enums.map((e) => e.name);
        return {
            status: 'ok',
            prismaClient: {
                agreementFields: agreement?.fields.map((f) => f.name) ?? [],
                paymentFields: payment?.fields.map((f) => f.name) ?? [],
                enums,
                legacyPaymentStatusColumn: agreement?.fields.some((f) => f.name === 'paymentStatus') ?? false,
                legacyPaymentStatusEnum: enums.includes('PaymentStatus'),
            },
            build: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.BUILD_ID || 'local',
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "rootHealth", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Get)('health/schema'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "schemaHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)()
], HealthController);
