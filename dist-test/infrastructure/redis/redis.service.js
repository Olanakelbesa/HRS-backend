"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const redis_1 = require("redis");
const env_1 = require("../../config/env");
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.logger = new common_1.Logger(RedisService_1.name);
        this.client = null;
        this.connected = false;
    }
    async onModuleInit() {
        this.client = (0, redis_1.createClient)({
            url: env_1.env.REDIS_URL,
            socket: {
                reconnectStrategy: () => false,
            },
        });
        this.client.on('error', (err) => {
            if (env_1.env.NODE_ENV === 'production') {
                this.logger.error('Redis Client Error', err);
            }
        });
        try {
            await this.client.connect();
            this.connected = true;
            this.logger.log('Redis Connected');
        }
        catch {
            if (env_1.env.NODE_ENV === 'development') {
                this.logger.warn('Redis unavailable. Running without cache.');
            }
            else {
                this.logger.error('Redis connection failed');
            }
        }
    }
    async onModuleDestroy() {
        if (this.client && this.connected) {
            await this.client.quit().catch(() => undefined);
        }
    }
    getClient() {
        return this.client;
    }
    isConnected() {
        return this.connected;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
