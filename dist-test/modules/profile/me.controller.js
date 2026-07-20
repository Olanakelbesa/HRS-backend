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
exports.MeController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const profile_api_service_1 = require("./profile.api.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const schema_1 = require("./schema");
const schema_2 = require("../recommendation/schema");
const PROFILE_UPLOAD = {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 5 * 1024 * 1024 },
};
let MeController = class MeController {
    constructor(profileService) {
        this.profileService = profileService;
    }
    async getProfile(user) {
        const data = await this.profileService.getProfile(user.userId);
        return { status: 'success', message: 'Profile loaded', data };
    }
    async updatePersonalInfo(user, body, file) {
        const bodyParsed = schema_1.updatePersonalInfoSchema.safeParse({ body });
        if (!bodyParsed.success) {
            throw new common_1.BadRequestException({
                message: 'Validation failed',
                errors: bodyParsed.error.flatten().fieldErrors,
            });
        }
        if (file) {
            const fileParsed = schema_1.uploadAvatarSchema.safeParse({
                file: { size: file.size, mimetype: file.mimetype },
            });
            if (!fileParsed.success) {
                throw new common_1.BadRequestException({
                    message: 'Avatar validation failed',
                    errors: fileParsed.error.flatten().fieldErrors,
                });
            }
        }
        const data = await this.profileService.updatePersonalInfo(user.userId, bodyParsed.data.body, file);
        return { status: 'success', message: 'Profile updated successfully', data };
    }
    async getDocuments(user) {
        const doc = await this.profileService.getVerificationDoc(user.userId);
        if (!doc) {
            return { status: 'success', message: 'No documents found', data: null };
        }
        const uploadedFiles = [];
        if (doc.frontUrl) {
            uploadedFiles.push({
                documentType: 'NATIONAL_ID_FRONT',
                label: 'National ID - Front',
                file: doc.frontUrl.split('/').pop(),
                url: doc.frontUrl,
            });
        }
        if (doc.backUrl) {
            uploadedFiles.push({
                documentType: 'NATIONAL_ID_BACK',
                label: 'National ID - Back',
                file: doc.backUrl.split('/').pop(),
                url: doc.backUrl,
            });
        }
        if (doc.livePhotoUrl) {
            uploadedFiles.push({
                documentType: 'OWNER_PHOTO',
                label: 'Your Photo',
                file: doc.livePhotoUrl.split('/').pop(),
                url: doc.livePhotoUrl,
            });
        }
        return {
            status: 'success',
            data: {
                id: doc.id,
                overallStatus: doc.status,
                note: doc.note,
                submittedAt: doc.submittedAt,
                reviewedAt: doc.reviewedAt,
                uploadedFiles,
            },
        };
    }
    async uploadDocuments(user, files) {
        if (!files || Object.keys(files).length === 0) {
            throw new common_1.BadRequestException('No files provided');
        }
        const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        const MAX_SIZE = 5 * 1024 * 1024;
        const fieldToDocType = {
            nationalIdFront: 'NATIONAL_ID_FRONT',
            nationalIdBack: 'NATIONAL_ID_BACK',
            ownerPhoto: 'OWNER_PHOTO',
        };
        for (const [fieldName, fileArr] of Object.entries(files)) {
            const file = fileArr?.[0];
            if (!file)
                continue;
            if (!fieldToDocType[fieldName]) {
                throw new common_1.BadRequestException(`Unknown field: ${fieldName}. Allowed: nationalIdFront, nationalIdBack, ownerPhoto`);
            }
            if (file.size > MAX_SIZE) {
                throw new common_1.PayloadTooLargeException(`File "${fieldName}" exceeds the 5 MB limit`);
            }
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                throw new common_1.BadRequestException(`File "${fieldName}" has an unsupported format. Allowed: pdf, jpg, jpeg, png`);
            }
        }
        for (const [fieldName, fileArr] of Object.entries(files)) {
            const file = fileArr?.[0];
            if (!file)
                continue;
            await this.profileService.uploadDocument(user.userId, fieldToDocType[fieldName], file);
        }
        const doc = await this.profileService.getVerificationDoc(user.userId);
        const uploadedFiles = [];
        if (doc?.frontUrl) {
            uploadedFiles.push({
                documentType: 'NATIONAL_ID_FRONT',
                label: 'National ID - Front',
                file: doc.frontUrl.split('/').pop(),
                url: doc.frontUrl,
            });
        }
        if (doc?.backUrl) {
            uploadedFiles.push({
                documentType: 'NATIONAL_ID_BACK',
                label: 'National ID - Back',
                file: doc.backUrl.split('/').pop(),
                url: doc.backUrl,
            });
        }
        if (doc?.livePhotoUrl) {
            uploadedFiles.push({
                documentType: 'OWNER_PHOTO',
                label: 'Your Photo',
                file: doc.livePhotoUrl.split('/').pop(),
                url: doc.livePhotoUrl,
            });
        }
        return {
            status: 'success',
            message: 'Documents uploaded successfully',
            data: {
                id: doc.id,
                overallStatus: doc.status,
                submittedAt: doc.submittedAt,
                uploadedFiles,
            },
        };
    }
    async updateBankDetails(user, body) {
        const data = await this.profileService.updateBankDetails(user.userId, body);
        return { status: 'success', message: 'Bank details updated successfully', data };
    }
    async updateNotificationPreferences(user, body) {
        const data = await this.profileService.updateNotificationPreferences(user.userId, body);
        return {
            status: 'success',
            message: 'Notification preferences updated successfully',
            data,
        };
    }
    async updateLanguagePreference(user, body) {
        const data = await this.profileService.updateLanguagePreference(user.userId, body);
        return { status: 'success', message: 'Language preference updated successfully', data };
    }
    async changePassword(user, body) {
        await this.profileService.changePassword(user.userId, body);
        return { status: 'success', message: 'Password changed successfully' };
    }
    async getPreferences(user) {
        const data = await this.profileService.getPreferences(user.userId);
        return { status: 'success', message: 'Preferences fetched successfully', data };
    }
    async savePreferences(user, body) {
        const data = await this.profileService.savePreferences(user.userId, body);
        return { status: 'success', message: 'Preferences saved successfully', data };
    }
    async updatePreferences(user, body) {
        const data = await this.profileService.updatePreferences(user.userId, body);
        return { status: 'success', message: 'Preferences updated successfully', data };
    }
};
exports.MeController = MeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', PROFILE_UPLOAD)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "updatePersonalInfo", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.Post)('documents'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'nationalIdFront', maxCount: 1 },
        { name: 'nationalIdBack', maxCount: 1 },
        { name: 'ownerPhoto', maxCount: 1 },
    ], PROFILE_UPLOAD)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "uploadDocuments", null);
__decorate([
    (0, common_1.Patch)('bank'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateBankDetailsSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "updateBankDetails", null);
__decorate([
    (0, common_1.Patch)('notifications'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateNotificationPreferencesSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "updateNotificationPreferences", null);
__decorate([
    (0, common_1.Patch)('language'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateLanguagePreferenceSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "updateLanguagePreference", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.changePasswordSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Post)('preferences'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.preferenceSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "savePreferences", null);
__decorate([
    (0, common_1.Patch)('preferences'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.preferenceSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "updatePreferences", null);
exports.MeController = MeController = __decorate([
    (0, swagger_1.ApiTags)('Me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('me'),
    __metadata("design:paramtypes", [profile_api_service_1.ProfileApiService])
], MeController);
