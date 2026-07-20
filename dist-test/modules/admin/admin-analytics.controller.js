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
exports.AdminAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const admin_analytics_service_1 = require("./admin-analytics.service");
const schema_1 = require("./schema");
let AdminAnalyticsController = class AdminAnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async analytics(query) {
        const data = await this.analyticsService.getPlatformAnalytics(query.range);
        return { status: 'success', data };
    }
    async overview(query) {
        const data = await this.analyticsService.getOverview(query);
        return { status: 'success', message: 'Overview loaded', data };
    }
    async auditLogs(query) {
        const data = await this.analyticsService.getAuditLogs(query);
        return { status: 'success', data };
    }
};
exports.AdminAnalyticsController = AdminAnalyticsController;
__decorate([
    (0, common_1.Get)('analytics'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getAnalyticsQuerySchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "analytics", null);
__decorate([
    (0, common_1.Get)('overview'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getOverviewQuerySchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getAuditLogsQuerySchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "auditLogs", null);
exports.AdminAnalyticsController = AdminAnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_analytics_service_1.AdminAnalyticsService])
], AdminAnalyticsController);
