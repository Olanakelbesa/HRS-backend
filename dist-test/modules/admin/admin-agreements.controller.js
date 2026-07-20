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
exports.AdminAgreementsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const admin_agreements_service_1 = require("./admin-agreements.service");
const schema_1 = require("./schema");
let AdminAgreementsController = class AdminAgreementsController {
    constructor(agreementsService) {
        this.agreementsService = agreementsService;
    }
    async list(query) {
        const data = await this.agreementsService.getAgreements(query);
        return { status: 'success', data };
    }
    async create(user, body) {
        const data = await this.agreementsService.createAgreement(user.userId, body);
        return { status: 'success', data };
    }
    async riskAssessment(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.agreementsService.getAgreementRiskAssessment(id);
        if (!data)
            throw new common_1.NotFoundException('Agreement not found');
        return { status: 'success', data };
    }
    async paymentSummary(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.agreementsService.getAgreementPaymentSummary(id);
        if (!data)
            throw new common_1.NotFoundException('Agreement not found');
        return { status: 'success', data };
    }
    async payments(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.agreementsService.listAgreementPayments(id);
        if (data === null)
            throw new common_1.NotFoundException('Agreement not found');
        return { status: 'success', data };
    }
    async get(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.agreementsService.getAgreementById(id);
        if (!data)
            throw new common_1.NotFoundException('Not found');
        return { status: 'success', data };
    }
    async updateStatus(user, id, body) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.agreementsService.updateAgreementStatus(user.userId, id, body.status);
        return { status: 'success', data };
    }
    async paymentProof(id) {
        schema_1.paramIdSchema.parse({ id });
        const data = await this.agreementsService.getPaymentProof(id);
        if (!data)
            throw new common_1.NotFoundException('Payment not found');
        return { status: 'success', data };
    }
};
exports.AdminAgreementsController = AdminAgreementsController;
__decorate([
    (0, common_1.Get)('agreements'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.paginationQuerySchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('agreements'),
    (0, common_1.HttpCode)(201),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.createAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('agreements/:id/risk-assessment'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "riskAssessment", null);
__decorate([
    (0, common_1.Get)('agreements/:id/payment-summary'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "paymentSummary", null);
__decorate([
    (0, common_1.Get)('agreements/:id/payments'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "payments", null);
__decorate([
    (0, common_1.Get)('agreements/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('agreements/:id/status'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateAgreementStatusSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('payments/:id/proof'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAgreementsController.prototype, "paymentProof", null);
exports.AdminAgreementsController = AdminAgreementsController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_agreements_service_1.AdminAgreementsService])
], AdminAgreementsController);
