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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const messaging_api_service_1 = require("./messaging.api.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const schema_1 = require("./schema");
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
let ConversationsController = class ConversationsController {
    constructor(messagingService) {
        this.messagingService = messagingService;
    }
    async listConversations(user) {
        const conversations = await this.messagingService.listConversations(user.userId);
        return { status: 'success', data: { conversations } };
    }
    async createConversation(user, body) {
        const conversation = await this.messagingService.createConversation(user.userId, body);
        return { status: 'success', data: { conversation } };
    }
    async getMetadata(user, id) {
        const conversation = await this.messagingService.getConversationMetadata(id, user.userId);
        return { status: 'success', data: { conversation } };
    }
    async deleteConversation(user, id) {
        const result = await this.messagingService.deleteConversation(id, user.userId);
        return { status: 'success', data: result };
    }
    async listMessages(user, id, query) {
        const result = await this.messagingService.listMessages(id, user.userId, query);
        return { status: 'success', data: result };
    }
    async sendMessage(user, id, body) {
        const result = await this.messagingService.sendMessage(id, user.userId, body);
        return { status: 'success', data: { message: result.message } };
    }
    async markRead(user, id) {
        const result = await this.messagingService.markConversationAsRead(id, user.userId);
        return { status: 'success', data: result };
    }
    async sendAttachment(user, id, file, body) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        const result = await this.messagingService.sendAttachment(id, user.userId, file, body);
        return { status: 'success', data: { message: result.message } };
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.createConversationSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "getMetadata", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "deleteConversation", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.listMessagesQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "listMessages", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    (0, common_1.HttpCode)(201),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.createMessageSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => cb(null, uploadDir),
            filename: (_req, file, cb) => {
                const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = path_1.default.extname(file.originalname) || '';
                cb(null, `${unique}${ext}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.sendAttachmentSchema, 'body'))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "sendAttachment", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, swagger_1.ApiTags)('Conversations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('owner', 'renter'),
    (0, common_1.Controller)('conversations'),
    __metadata("design:paramtypes", [messaging_api_service_1.MessagingApiService])
], ConversationsController);
