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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRecommendationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const admin_recommendations_service_1 = require("./admin-recommendations.service");
let AdminRecommendationsController = class AdminRecommendationsController {
    constructor(recommendationsService) {
        this.recommendationsService = recommendationsService;
    }
    async triggerTraining() {
        const data = await this.recommendationsService.triggerTraining();
        return { status: 'success', data };
    }
    async analytics() {
        const data = await this.recommendationsService.getAnalytics();
        return { status: 'success', data };
    }
    async history(limit) {
        const data = await this.recommendationsService.getTrainingHistory(limit ? Number(limit) : 10);
        return { status: 'success', data };
    }
};
exports.AdminRecommendationsController = AdminRecommendationsController;
__decorate([
    (0, common_1.Post)('recommendations/train'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminRecommendationsController.prototype, "triggerTraining", null);
__decorate([
    (0, common_1.Get)('recommendations/analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminRecommendationsController.prototype, "analytics", null);
__decorate([
    (0, common_1.Get)('recommendations/history'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminRecommendationsController.prototype, "history", null);
exports.AdminRecommendationsController = AdminRecommendationsController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_recommendations_service_1.AdminRecommendationsService])
], AdminRecommendationsController);
