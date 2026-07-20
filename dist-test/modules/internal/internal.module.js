"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalModule = void 0;
const common_1 = require("@nestjs/common");
const internal_controller_1 = require("./internal.controller");
const internal_api_service_1 = require("./internal.api.service");
const service_auth_guard_1 = require("../../common/guards/service-auth.guard");
let InternalModule = class InternalModule {
};
exports.InternalModule = InternalModule;
exports.InternalModule = InternalModule = __decorate([
    (0, common_1.Module)({
        controllers: [internal_controller_1.InternalController],
        providers: [internal_api_service_1.InternalApiService, service_auth_guard_1.ServiceAuthGuard],
    })
], InternalModule);
