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
exports.InternalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const service_auth_guard_1 = require("../../common/guards/service-auth.guard");
const internal_api_service_1 = require("./internal.api.service");
let InternalController = class InternalController {
    constructor(internalService) {
        this.internalService = internalService;
    }
    async getRecommendationData() {
        try {
            return await this.internalService.getRecommendationData();
        }
        catch {
            throw new common_1.HttpException({ error: 'Internal server error during data export' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.InternalController = InternalController;
__decorate([
    (0, common_1.Get)('recommendation-data'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InternalController.prototype, "getRecommendationData", null);
exports.InternalController = InternalController = __decorate([
    (0, swagger_1.ApiTags)('Internal'),
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(service_auth_guard_1.ServiceAuthGuard),
    (0, common_1.Controller)('internal'),
    __metadata("design:paramtypes", [internal_api_service_1.InternalApiService])
], InternalController);
