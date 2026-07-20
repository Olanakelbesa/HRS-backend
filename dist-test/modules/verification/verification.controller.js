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
exports.VerificationController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const verification_api_service_1 = require("./verification.api.service");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const schema_1 = require("./schema");
const VERIFICATION_UPLOAD = {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 10 * 1024 * 1024 },
};
let VerificationController = class VerificationController {
    constructor(verificationService) {
        this.verificationService = verificationService;
    }
    async uploadDocuments(user, files) {
        const doc = await this.verificationService.uploadDocuments(user.userId, files || {});
        return {
            status: 'success',
            message: 'Verification documents uploaded successfully',
            data: doc,
        };
    }
    async myStatus(user) {
        const status = await this.verificationService.getMyStatus(user.userId);
        return {
            status: 'success',
            message: 'Verification status fetched successfully',
            data: status,
        };
    }
    async pending(user) {
        const pending = await this.verificationService.getPending(user.userId);
        return {
            status: 'success',
            message: 'Pending verifications fetched successfully',
            data: pending,
        };
    }
    async getDocuments(user, userId) {
        const doc = await this.verificationService.getDocuments(userId, user.userId, user.role);
        return {
            status: 'success',
            message: 'Verification documents fetched successfully',
            data: doc,
        };
    }
    async updateStatus(user, userId, body) {
        const updated = await this.verificationService.updateStatus(user.userId, userId, body);
        return {
            status: 'success',
            message: 'Verification status updated successfully',
            data: updated,
        };
    }
};
exports.VerificationController = VerificationController;
__decorate([
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Post)('documents'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
        { name: 'livePhoto', maxCount: 1 },
    ], VERIFICATION_UPLOAD)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VerificationController.prototype, "uploadDocuments", null);
__decorate([
    (0, common_1.Get)('my-status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VerificationController.prototype, "myStatus", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('pending'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VerificationController.prototype, "pending", null);
__decorate([
    (0, common_1.Get)('documents/:userId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VerificationController.prototype, "getDocuments", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)('documents/:userId/status'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateVerificationStatusSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], VerificationController.prototype, "updateStatus", null);
exports.VerificationController = VerificationController = __decorate([
    (0, swagger_1.ApiTags)('Verification'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('verification'),
    __metadata("design:paramtypes", [verification_api_service_1.VerificationApiService])
], VerificationController);
