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
exports.AgreementsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const agreements_api_service_1 = require("./agreements.api.service");
const schema_1 = require("./schema");
let AgreementsController = class AgreementsController {
    constructor(agreementsService) {
        this.agreementsService = agreementsService;
    }
    // ── Owner ─────────────────────────────────────────────────────────────────
    async listOwner(user, query) {
        const data = await this.agreementsService.listOwnerAgreements(user.userId, query);
        return { status: 'success', message: 'Agreements retrieved', data };
    }
    async exportOwner(user, query, res) {
        const csv = await this.agreementsService.exportOwnerAgreements(user.userId, query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=agreements-${Date.now()}.csv`);
        return res.status(200).send(csv);
    }
    async create(user, body) {
        const agreement = await this.agreementsService.createOwnerAgreement(user.userId, body);
        return { status: 'success', message: 'Agreement created', data: { agreement } };
    }
    async updateDraft(user, id, body) {
        const agreement = await this.agreementsService.updateDraftAgreement(id, user.userId, body);
        return { status: 'success', message: 'Agreement updated', data: { agreement } };
    }
    async send(user, id, body) {
        const agreement = await this.agreementsService.sendAgreement(id, user.userId, body?.offerExpiresAt);
        return { status: 'success', message: 'Agreement sent', data: { agreement } };
    }
    async cancel(user, id, body) {
        const agreement = await this.agreementsService.cancelAgreement(id, user.userId, body?.reason);
        return { status: 'success', message: 'Agreement cancelled', data: { agreement } };
    }
    async terminate(user, id, body) {
        const agreement = await this.agreementsService.terminateAgreement(id, user.userId, body?.reason);
        return { status: 'success', message: 'Agreement terminated', data: { agreement } };
    }
    // ── Renter ────────────────────────────────────────────────────────────────
    async listMine(user, query) {
        const data = await this.agreementsService.listRenterAgreements(user.userId, query);
        return { status: 'success', message: 'Agreements retrieved', data };
    }
    async accept(user, id) {
        const agreement = await this.agreementsService.acceptAgreement(id, user.userId);
        return { status: 'success', message: 'Agreement accepted', data: { agreement } };
    }
    async reject(user, id, body) {
        const agreement = await this.agreementsService.rejectAgreement(id, user.userId, body?.reason);
        return { status: 'success', message: 'Agreement rejected', data: { agreement } };
    }
    async initiateDeposit(user, id) {
        const data = await this.agreementsService.initiateDeposit(id, user.userId);
        return { status: 'success', message: 'Deposit checkout ready', data };
    }
    async depositStatus(user, id) {
        const data = await this.agreementsService.getDepositStatus(id, user.userId);
        return { status: 'success', message: 'Deposit status retrieved', data };
    }
    // ── Shared (any authenticated party) ──────────────────────────────────────
    async getById(user, id) {
        const agreement = await this.agreementsService.getAgreementDetail(id, user.userId);
        return { status: 'success', message: 'Agreement retrieved', data: { agreement } };
    }
    async listPayments(user, id) {
        const data = await this.agreementsService.listAgreementPayments(id, user.userId);
        return { status: 'success', message: 'Payments retrieved', data };
    }
};
exports.AgreementsController = AgreementsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.listOwnerAgreementsQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "listOwner", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "exportOwner", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.createOwnerAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateDraftAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "updateDraft", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.sendAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.cancelAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/terminate'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.cancelAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "terminate", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('renter'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.listAgreementsQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    (0, roles_decorator_1.Roles)('renter'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, roles_decorator_1.Roles)('renter'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.rejectAgreementSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/deposit/initiate'),
    (0, roles_decorator_1.Roles)('renter'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "initiateDeposit", null);
__decorate([
    (0, common_1.Get)(':id/deposit/status'),
    (0, roles_decorator_1.Roles)('renter'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "depositStatus", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)(':id/payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "listPayments", null);
exports.AgreementsController = AgreementsController = __decorate([
    (0, swagger_1.ApiTags)('Agreements'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('agreements'),
    __metadata("design:paramtypes", [agreements_api_service_1.AgreementsApiService])
], AgreementsController);
