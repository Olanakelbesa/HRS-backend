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
exports.OwnerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const owner_api_service_1 = require("./owner.api.service");
const schema_1 = require("./schema");
let OwnerController = class OwnerController {
    constructor(ownerService) {
        this.ownerService = ownerService;
    }
    async overview(user, query) {
        const data = await this.ownerService.getOverview(user.userId, query);
        return { status: 'success', message: 'Owner overview loaded', data };
    }
};
exports.OwnerController = OwnerController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.getOwnerOverviewQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OwnerController.prototype, "overview", null);
exports.OwnerController = OwnerController = __decorate([
    (0, swagger_1.ApiTags)('Owner'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Controller)('owner'),
    __metadata("design:paramtypes", [owner_api_service_1.OwnerApiService])
], OwnerController);
