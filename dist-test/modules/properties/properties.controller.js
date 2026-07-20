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
exports.PropertiesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const properties_api_service_1 = require("./properties.api.service");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const schema_1 = require("./schema");
const PROPERTY_UPLOAD = {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 10 * 1024 * 1024 },
};
function resolveLanguage(queryLang, acceptLanguage) {
    if (queryLang === 'en' || queryLang === 'am')
        return queryLang;
    const raw = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
    const normalized = raw?.split(',')[0]?.split('-')[0]?.toLowerCase();
    return normalized === 'am' ? 'am' : 'en';
}
let PropertiesController = class PropertiesController {
    constructor(propertiesService) {
        this.propertiesService = propertiesService;
    }
    async list(query, acceptLanguage) {
        const language = resolveLanguage(query.lang, acceptLanguage);
        const result = await this.propertiesService.getProperties(query, language);
        return {
            status: 'success',
            message: 'Properties fetched successfully',
            data: result.properties,
            meta: result.meta,
        };
    }
    async getMy(user) {
        const properties = await this.propertiesService.getMyProperties(user.userId);
        return {
            status: 'success',
            message: 'Owner properties fetched successfully',
            data: properties,
        };
    }
    async getSaved(user) {
        const saved = await this.propertiesService.getSavedProperties(user.userId);
        return {
            status: 'success',
            message: 'Saved properties fetched successfully',
            data: saved,
        };
    }
    async nearby(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const radius = Number(query.radius) || 10;
        const result = await this.propertiesService.getNearbyProperties(query.lat, query.lng, radius, page, limit, query.status, query.category);
        return {
            status: 'success',
            message: 'Nearby properties fetched successfully',
            data: result.properties,
            meta: result.meta,
        };
    }
    async analytics(user) {
        const analytics = await this.propertiesService.getOwnerPropertyAnalytics(user.userId);
        return {
            status: 'success',
            message: 'Property analytics fetched successfully',
            data: analytics,
        };
    }
    async similar(propertyId, query) {
        const similar = await this.propertiesService.getSimilarProperties(propertyId, Number(query.limit) || 12);
        return {
            status: 'success',
            message: 'Similar properties fetched successfully',
            data: similar,
        };
    }
    async save(user, propertyId) {
        const saved = await this.propertiesService.saveProperty(user.userId, propertyId);
        return { status: 'success', message: 'Property saved successfully', data: saved };
    }
    async unsave(user, propertyId) {
        await this.propertiesService.removeSavedProperty(user.userId, propertyId);
        return { status: 'success', message: 'Property removed from saved list successfully' };
    }
    async getById(propertyId, lang, acceptLanguage, user) {
        const language = resolveLanguage(lang, acceptLanguage);
        const property = await this.propertiesService.getPropertyById(propertyId, language, user?.userId);
        return {
            status: 'success',
            message: 'Property fetched successfully',
            data: property,
        };
    }
    async create(user, body, files) {
        const property = await this.propertiesService.createProperty(user.userId, body, files);
        return { status: 'success', message: 'Property created successfully', data: property };
    }
    async update(user, propertyId, body, files) {
        const property = await this.propertiesService.updateProperty(user.userId, propertyId, body, files);
        return { status: 'success', message: 'Property updated successfully', data: property };
    }
    async remove(user, propertyId) {
        const result = await this.propertiesService.softDeleteProperty(user.userId, propertyId);
        return {
            status: 'success',
            message: 'Property soft deleted successfully',
            data: result,
        };
    }
    async updateStatus(user, propertyId, body) {
        const property = await this.propertiesService.updatePropertyStatus(user.userId, propertyId, body.status);
        return {
            status: 'success',
            message: 'Property status updated successfully',
            data: property,
        };
    }
};
exports.PropertiesController = PropertiesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getPropertiesSchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Headers)('accept-language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "list", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "getMy", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('saved'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "getSaved", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('nearby'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getNearbyPropertiesSchema, 'query')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "nearby", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "analytics", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':propertyId/similar'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getSimilarPropertiesSchema, 'query'))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "similar", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)(':propertyId/save'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "save", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)(':propertyId/save'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "unsave", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':propertyId'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('lang')),
    __param(2, (0, common_1.Headers)('accept-language')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "getById", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
    ], PROPERTY_UPLOAD)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.createPropertySchema, 'body'))),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)(':propertyId'),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
    ], PROPERTY_UPLOAD)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propertyId')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updatePropertySchema, 'body'))),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)(':propertyId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "remove", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)(':propertyId/status'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updatePropertyStatusSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propertyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "updateStatus", null);
exports.PropertiesController = PropertiesController = __decorate([
    (0, swagger_1.ApiTags)('Properties'),
    (0, common_1.Controller)('properties'),
    __metadata("design:paramtypes", [properties_api_service_1.PropertiesApiService])
], PropertiesController);
