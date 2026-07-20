"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCache = getCache;
exports.setCache = setCache;
exports.deleteCache = deleteCache;
const redis_1 = __importDefault(require("../config/redis"));
async function getCache(key) {
    try {
        if (!redis_1.default.isOpen)
            return null;
        const data = await redis_1.default.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (err) {
        console.error(`Cache get error for key ${key}:`, err);
        return null;
    }
}
async function setCache(key, value, ttlSeconds = 3600) {
    try {
        if (!redis_1.default.isOpen)
            return;
        await redis_1.default.set(key, JSON.stringify(value), { EX: ttlSeconds });
    }
    catch (err) {
        console.error(`Cache set error for key ${key}:`, err);
    }
}
async function deleteCache(key) {
    try {
        if (!redis_1.default.isOpen)
            return;
        await redis_1.default.del(key);
    }
    catch (err) {
        console.error(`Cache del error for key ${key}:`, err);
    }
}
