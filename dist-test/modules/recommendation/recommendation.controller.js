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
exports.RecommendationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const recommendation_api_service_1 = require("./recommendation.api.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const service_auth_guard_1 = require("../../common/guards/service-auth.guard");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const schema_1 = require("./schema");
const schema_2 = require("../interactions/schema");
let RecommendationController = class RecommendationController {
    constructor(recommendationService) {
        this.recommendationService = recommendationService;
    }
    async getRecommendations(user) {
        const data = await this.recommendationService.getRecommendationsFormatted(user.userId);
        return {
            status: 'success',
            message: 'Recommendations fetched successfully',
            data,
        };
    }
    async getSimilarProperties(propertyId) {
        const data = await this.recommendationService.getSimilarProperties(propertyId);
        return { status: 'success', data };
    }
    async trackInteraction(user, body, res) {
        const result = await this.recommendationService.trackInteraction(user.userId, body.propertyId, body.type);
        // Legacy trackInteraction returns interaction mutation result { statusCode, body }
        if (result &&
            typeof result === 'object' &&
            'statusCode' in result &&
            'body' in result) {
            const mutation = result;
            return res.status(mutation.statusCode).json(mutation.body);
        }
        return res.status(200).json(result);
    }
    async recordView(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.recordView(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async likeProperty(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.likeProperty(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async unlikeProperty(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.unlikeProperty(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async saveProperty(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.saveProperty(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async unsaveProperty(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.unsaveProperty(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async recordContact(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.recordContact(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async recordShare(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.recordShare(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async recordSchedule(user, body, res) {
        const source = this.recommendationService.validateSource(body.source);
        const result = await this.recommendationService.recordSchedule(user.userId, {
            ...body,
            source,
        });
        return res.status(result.statusCode).json(result.body);
    }
    async getPropertyState(user, params) {
        return this.recommendationService.getPropertyState(user.userId, params.propertyId);
    }
    async getHistory(user, query) {
        return this.recommendationService.getHistory(user.userId, query);
    }
    async exportUserEvents(params, query) {
        return this.recommendationService.exportUserEvents(params.userId, query.after);
    }
    async saveSearch(user, body) {
        const data = await this.recommendationService.saveSearch(user.userId, body.query, body.filters);
        return { status: 'success', data };
    }
    async getSearchHistory(user) {
        const data = await this.recommendationService.getSearchHistory(user.userId);
        return { status: 'success', data };
    }
};
exports.RecommendationController = RecommendationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)('similar/:propertyId'),
    __param(0, (0, common_1.Param)('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "getSimilarProperties", null);
__decorate([
    (0, common_1.Post)('interactions'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.interactionSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "trackInteraction", null);
__decorate([
    (0, common_1.Post)('interactions/view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.recordViewSchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "recordView", null);
__decorate([
    (0, common_1.Post)('interactions/like'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.likePropertySchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "likeProperty", null);
__decorate([
    (0, common_1.Delete)('interactions/like'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.likePropertySchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "unlikeProperty", null);
__decorate([
    (0, common_1.Post)('interactions/save'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.savePropertySchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "saveProperty", null);
__decorate([
    (0, common_1.Delete)('interactions/save'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.savePropertySchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "unsaveProperty", null);
__decorate([
    (0, common_1.Post)('interactions/contact'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.recordContactSchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "recordContact", null);
__decorate([
    (0, common_1.Post)('interactions/share'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.recordShareSchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "recordShare", null);
__decorate([
    (0, common_1.Post)('interactions/schedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.recordScheduleSchema, 'body'))),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "recordSchedule", null);
__decorate([
    (0, common_1.Get)('interactions/property/:propertyId/state'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.propertyStateParamsSchema, 'params'))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "getPropertyState", null);
__decorate([
    (0, common_1.Get)('interactions/history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.historyQuerySchema, 'query'))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "getHistory", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(service_auth_guard_1.ServiceAuthGuard),
    (0, common_1.Get)('interactions/export/user/:userId'),
    __param(0, (0, common_1.Param)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.exportParamsSchema, 'params'))),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(schema_2.exportQuerySchema, 'query'))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "exportUserEvents", null);
__decorate([
    (0, common_1.Post)('search-history'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.searchSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "saveSearch", null);
__decorate([
    (0, common_1.Get)('search-history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "getSearchHistory", null);
exports.RecommendationController = RecommendationController = __decorate([
    (0, swagger_1.ApiTags)('Recommendations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('recommendations'),
    __metadata("design:paramtypes", [recommendation_api_service_1.RecommendationApiService])
], RecommendationController);
