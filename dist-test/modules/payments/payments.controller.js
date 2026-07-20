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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const env_1 = require("../../config/env");
const payments_api_service_1 = require("./payments.api.service");
const schema_1 = require("./schema");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async chapaWebhook(body) {
        const data = await this.paymentsService.handleChapaWebhook(body);
        return { status: 'success', message: 'Webhook processed', data };
    }
    async chapaCallback(txRefQuery, txRefAlt, res) {
        const txRef = String(txRefQuery || txRefAlt || '');
        try {
            await this.paymentsService.processChapaTxRef(txRef);
            const redirect = `${env_1.env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}&status=success`;
            return res.redirect(302, redirect);
        }
        catch {
            const redirect = `${env_1.env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}&status=failed`;
            return res.redirect(302, redirect);
        }
    }
    async list(user, query) {
        const data = await this.paymentsService.listPayments(user.userId, query);
        return { status: 'success', data };
    }
    async summary(user) {
        const data = await this.paymentsService.getPaymentSummary(user.userId);
        return { status: 'success', data };
    }
    async export(user, query, res) {
        const csv = await this.paymentsService.exportPaymentsCsv(user.userId, query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payments-export-${Date.now()}.csv`);
        return res.status(200).send(csv);
    }
    async chapaVerify(body) {
        const data = await this.paymentsService.processChapaTxRef(body.tx_ref);
        return { status: 'success', message: 'Verification complete', data };
    }
    async getProof(user, id) {
        const data = await this.paymentsService.getPaymentProof(id, user.userId);
        return { status: 'success', data };
    }
    async uploadProof(user, id, file) {
        const buffer = this.paymentsService.requireFileBuffer(file);
        const payment = await this.paymentsService.uploadPaymentProof(id, user.userId, buffer);
        return { status: 'success', data: { payment } };
    }
    async confirm(user, id) {
        const payment = await this.paymentsService.confirmPayment(id, user.userId);
        return { status: 'success', data: { payment } };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('chapa/webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "chapaWebhook", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('chapa/callback'),
    __param(0, (0, common_1.Query)('tx_ref')),
    __param(1, (0, common_1.Query)('txRef')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "chapaCallback", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.listPaymentsQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "list", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "summary", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('export'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.exportPaymentsQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "export", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('chapa/verify'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.chapaVerifySchema, 'body')),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "chapaVerify", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(':id/proof'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getProof", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)(':id/proof'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "uploadProof", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)(':id/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirm", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_api_service_1.PaymentsApiService])
], PaymentsController);
