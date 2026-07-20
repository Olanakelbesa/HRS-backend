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
exports.AdminReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const admin_reports_service_1 = require("./admin-reports.service");
const schema_1 = require("./schema");
let AdminReportsController = class AdminReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async list(query) {
        const data = await this.reportsService.getReports(query);
        return { status: 'success', data };
    }
    async riskAssessment(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.reportsService.getReportRiskAssessment(id);
        if (!data)
            throw new common_1.NotFoundException('Report not found');
        return { status: 'success', data };
    }
    async get(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.reportsService.getReportById(id);
        if (!data)
            throw new common_1.NotFoundException('Not found');
        return { status: 'success', data };
    }
    async updateStatus(user, id, body) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.reportsService.updateReportStatus(user.userId, id, body.status);
        return { status: 'success', data };
    }
};
exports.AdminReportsController = AdminReportsController;
__decorate([
    (0, common_1.Get)('reports'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.paginationQuerySchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminReportsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('reports/:id/risk-assessment'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminReportsController.prototype, "riskAssessment", null);
__decorate([
    (0, common_1.Get)('reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminReportsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('reports/:id/status'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateReportStatusSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminReportsController.prototype, "updateStatus", null);
exports.AdminReportsController = AdminReportsController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_reports_service_1.AdminReportsService])
], AdminReportsController);
