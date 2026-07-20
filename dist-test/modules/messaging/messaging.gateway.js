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
var MessagingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const env_1 = require("../../config/env");
const jwt_utils_1 = require("../../utils/jwt.utils");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const access_1 = require("./access");
const messaging_api_service_1 = require("./messaging.api.service");
const conversationRoom = (conversationId) => `conversation:${conversationId}`;
const userRoom = (userId) => `user:${userId}`;
let MessagingGateway = MessagingGateway_1 = class MessagingGateway {
    constructor(messagingService) {
        this.messagingService = messagingService;
        this.logger = new common_1.Logger(MessagingGateway_1.name);
    }
    async afterInit(server) {
        await this.configureRedisAdapter(server);
        server.use((socket, next) => {
            const token = this.getToken(socket);
            if (!token)
                return next(new Error('Unauthorized'));
            try {
                const decoded = (0, jwt_utils_1.verifyAccessToken)(token);
                socket.data.userId = decoded.userId;
                socket.data.userRole = decoded.role;
                return next();
            }
            catch {
                return next(new Error('Unauthorized'));
            }
        });
    }
    handleConnection(client) {
        const userId = client.data.userId;
        if (userId) {
            client.join(userRoom(userId));
        }
    }
    async onConversationJoin(socket, conversationId) {
        if (this.rejectMessaging(socket)) {
            return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
        }
        try {
            const userId = socket.data.userId;
            await this.messagingService.assertParticipant(conversationId, userId);
            socket.join(conversationRoom(conversationId));
            return { status: 'ok' };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to join conversation';
            return { status: 'error', message };
        }
    }
    async onTyping(socket, payload) {
        if (this.rejectMessaging(socket)) {
            return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
        }
        try {
            const userId = socket.data.userId;
            const { conversationId, isTyping } = payload;
            await this.messagingService.assertParticipant(conversationId, userId);
            socket.to(conversationRoom(conversationId)).emit('message:typing', {
                conversationId,
                userId,
                isTyping,
            });
            return { status: 'ok' };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to send typing state';
            return { status: 'error', message };
        }
    }
    async onMessageSend(socket, payload) {
        if (this.rejectMessaging(socket)) {
            return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
        }
        try {
            const userId = socket.data.userId;
            const { conversationId, content, replyToId } = payload;
            const result = await this.messagingService.sendMessage(conversationId, userId, {
                content,
                replyToId,
            });
            const otherUserId = result.conversation.renterId === userId
                ? result.conversation.ownerId
                : result.conversation.renterId;
            this.server.to(conversationRoom(conversationId)).emit('message:new', result.message);
            this.server.to(userRoom(otherUserId)).emit('message:new', result.message);
            return { status: 'ok', data: result.message };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to send message';
            return { status: 'error', message };
        }
    }
    async onReactionAdd(socket, payload) {
        if (this.rejectMessaging(socket)) {
            return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
        }
        try {
            const userId = socket.data.userId;
            const message = await this.messagingService.addReaction(payload.messageId, userId, {
                emoji: payload.emoji,
            });
            if (!message)
                return { status: 'error', message: 'Message not found' };
            this.server.to(conversationRoom(message.conversationId)).emit('message:updated', message);
            return { status: 'ok', data: message };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to add reaction';
            return { status: 'error', message };
        }
    }
    async onReactionRemove(socket, payload) {
        if (this.rejectMessaging(socket)) {
            return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
        }
        try {
            const userId = socket.data.userId;
            const message = await this.messagingService.removeReaction(payload.messageId, userId, {
                emoji: payload.emoji,
            });
            if (!message)
                return { status: 'error', message: 'Message not found' };
            this.server.to(conversationRoom(message.conversationId)).emit('message:updated', message);
            return { status: 'ok', data: message };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to remove reaction';
            return { status: 'error', message };
        }
    }
    async onMessageDelete(socket, payload) {
        if (this.rejectMessaging(socket)) {
            return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
        }
        try {
            const userId = socket.data.userId;
            const result = await this.messagingService.deleteMessage(payload.messageId, userId);
            this.server.to(conversationRoom(result.conversationId)).emit('message:deleted', result);
            return { status: 'ok', data: result };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to delete message';
            return { status: 'error', message };
        }
    }
    /** Emit to a user's personal room (e.g. notification:new). */
    emitToUser(userId, event, payload) {
        this.server.to(userRoom(userId)).emit(event, payload);
    }
    rejectMessaging(socket) {
        return !(0, access_1.canUseMessaging)(socket.data.userRole);
    }
    getToken(socket) {
        const authToken = socket.handshake.auth?.token;
        if (typeof authToken === 'string' && authToken.length > 0)
            return authToken;
        const header = socket.handshake.headers.authorization;
        if (typeof header === 'string' && header.startsWith('Bearer '))
            return header.slice(7);
        return null;
    }
    async configureRedisAdapter(io) {
        if (!env_1.env.REDIS_URL)
            return;
        const pubClient = (0, redis_1.createClient)({ url: env_1.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        try {
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            this.logger.log('Socket.io Redis adapter connected');
        }
        catch {
            this.logger.warn('Socket.io Redis adapter unavailable, falling back to memory');
        }
    }
};
exports.MessagingGateway = MessagingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], MessagingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, String]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "onConversationJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "onTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "onMessageSend", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:reaction:add'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "onReactionAdd", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:reaction:remove'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "onReactionRemove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:delete'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "onMessageDelete", null);
exports.MessagingGateway = MessagingGateway = MessagingGateway_1 = __decorate([
    (0, public_decorator_1.Public)(),
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: env_1.env.ALLOWED_ORIGINS,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [messaging_api_service_1.MessagingApiService])
], MessagingGateway);
