"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisConnected = void 0;
const redis_1 = require("redis");
const env_1 = require("./env");
const redisClient = (0, redis_1.createClient)({
    url: env_1.env.REDIS_URL,
    socket: {
        // Avoid reconnection spam when Redis is not running (e.g. local dev)
        reconnectStrategy: () => false,
    },
});
redisClient.on('error', (err) => {
    if (env_1.env.NODE_ENV === 'production')
        console.error('Redis Client Error', err);
});
let connected = false;
exports.isRedisConnected = connected;
(async () => {
    try {
        await redisClient.connect();
        exports.isRedisConnected = connected = true;
        console.log('⚡ Redis Connected');
    }
    catch (err) {
        if (env_1.env.NODE_ENV === 'development') {
            console.warn('⚠ Redis unavailable (ECONNREFUSED). Running without cache. Start Redis for caching.');
        }
        else {
            console.error('Redis connection failed:', err);
        }
    }
})();
exports.default = redisClient;
