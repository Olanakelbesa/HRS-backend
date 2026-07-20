"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const conversations_controller_1 = require("./conversations.controller");
const messages_controller_1 = require("./messages.controller");
const messaging_api_service_1 = require("./messaging.api.service");
const messaging_gateway_1 = require("./messaging.gateway");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        controllers: [conversations_controller_1.ConversationsController, messages_controller_1.MessagesController],
        providers: [messaging_api_service_1.MessagingApiService, messaging_gateway_1.MessagingGateway],
        exports: [messaging_api_service_1.MessagingApiService, messaging_gateway_1.MessagingGateway],
    })
], MessagingModule);
