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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminEmbeddingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const admin_embeddings_service_1 = require("./admin-embeddings.service");
let AdminEmbeddingsController = class AdminEmbeddingsController {
    constructor(embeddingsService) {
        this.embeddingsService = embeddingsService;
    }
    async resync() {
        try {
            const result = await this.embeddingsService.resyncAll();
            return {
                message: 'Embedding resync completed',
                ...result,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new common_1.HttpException({ message: 'Embedding resync failed', error: message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AdminEmbeddingsController = AdminEmbeddingsController;
__decorate([
    (0, common_1.Post)('embeddings/resync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminEmbeddingsController.prototype, "resync", null);
exports.AdminEmbeddingsController = AdminEmbeddingsController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_embeddings_service_1.AdminEmbeddingsService])
], AdminEmbeddingsController);
