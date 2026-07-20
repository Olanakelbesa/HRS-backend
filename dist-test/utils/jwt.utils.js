"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.generateTokenPair = generateTokenPair;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const AppError_1 = require("../core/AppError");
/**
 * Generate Access Token (short-lived, contains user identity and role)
 */
function generateAccessToken(userId, role) {
    const payload = {
        sub: userId,
        role,
        type: 'access',
    };
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        expiresIn: env_1.env.JWT_ACCESS_EXPIRY,
    });
}
/**
 * Generate Refresh Token (long-lived, only contains user ID)
 */
function generateRefreshToken(userId) {
    const payload = {
        sub: userId,
        role: '', // Refresh tokens don't need role
        type: 'refresh',
    };
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_1.env.JWT_REFRESH_EXPIRY,
    });
}
/**
 * Generate both Access and Refresh tokens
 */
function generateTokenPair(userId, role) {
    return {
        accessToken: generateAccessToken(userId, role),
        refreshToken: generateRefreshToken(userId),
    };
}
/**
 * Verify Access Token
 */
function verifyAccessToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (decoded.type !== 'access') {
            throw new AppError_1.AppError('Invalid token type', 401);
        }
        return {
            userId: decoded.sub,
            role: decoded.role,
        };
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new AppError_1.AppError('Access token expired', 401);
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new AppError_1.AppError('Invalid access token', 401);
        }
        throw error;
    }
}
/**
 * Verify Refresh Token
 */
function verifyRefreshToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
        if (decoded.type !== 'refresh') {
            throw new AppError_1.AppError('Invalid token type', 401);
        }
        return {
            userId: decoded.sub,
            role: decoded.role,
        };
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new AppError_1.AppError('Refresh token expired', 401);
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new AppError_1.AppError('Invalid refresh token', 401);
        }
        throw error;
    }
}
// Legacy support - deprecated
function signToken(userId) {
    return generateAccessToken(userId, 'RENTER');
}
function verifyToken(token) {
    const decoded = verifyAccessToken(token);
    return { userId: decoded.userId };
}
