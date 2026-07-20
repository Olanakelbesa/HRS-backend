"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRefreshTokenCookie = setRefreshTokenCookie;
exports.clearRefreshTokenCookie = clearRefreshTokenCookie;
exports.register = register;
exports.login = login;
exports.refreshAccessToken = refreshAccessToken;
exports.logout = logout;
exports.verifyEmail = verifyEmail;
exports.resendVerificationCode = resendVerificationCode;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../../config/database"));
const env_1 = require("../../config/env");
const AppError_1 = require("../../core/AppError");
const emailService_1 = require("../../emails/emailService");
const jwt_utils_1 = require("../../utils/jwt.utils");
const SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 1;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
function generateSixDigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function createEmailVerificationToken(email) {
    return createSixDigitCodeToken(email, EMAIL_VERIFICATION_EXPIRY_HOURS);
}
async function createSixDigitCodeToken(email, expiryHours) {
    let token = generateSixDigitCode();
    let attempts = 0;
    while (attempts < 5) {
        const existing = await database_1.default.verificationToken.findUnique({ where: { token } });
        if (!existing)
            break;
        token = generateSixDigitCode();
        attempts += 1;
    }
    if (attempts >= 5) {
        throw new AppError_1.AppError('Could not generate verification code. Please try again.', 500);
    }
    const expires = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    await database_1.default.verificationToken.deleteMany({ where: { identifier: email } });
    await database_1.default.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires,
        },
    });
    return token;
}
async function sendVerificationEmail(email, firstName) {
    const verificationCode = await createEmailVerificationToken(email);
    await (0, emailService_1.sendEmail)('verifyEmail', email, {
        firstName: firstName ?? 'there',
        verificationCode,
        expiryHours: EMAIL_VERIFICATION_EXPIRY_HOURS,
        supportEmail: env_1.env.SUPPORT_EMAIL ?? env_1.env.EMAIL_FROM,
    }, 'Verify your email address');
}
/**
 * Set HTTP-Only cookie with refresh token
 */
function setRefreshTokenCookie(res, refreshToken) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: isDevelopment ? 'lax' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
    });
}
/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(res) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: isDevelopment ? 'lax' : 'strict',
        path: '/',
    });
}
/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId, refreshToken) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await database_1.default.refreshToken.create({
        data: {
            token: refreshToken,
            userId,
            expiresAt,
        },
    });
}
/**
 * Register new user
 */
async function register(input) {
    const existing = await database_1.default.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw new AppError_1.AppError('Email already registered', 409);
    }
    const normalizedPhone = input.phone?.trim() || null;
    if (normalizedPhone) {
        const existingPhone = await database_1.default.user.findUnique({ where: { phone: normalizedPhone } });
        if (existingPhone) {
            throw new AppError_1.AppError('Phone number already registered', 409);
        }
    }
    const hashedPassword = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    // Registration supports only renter/owner roles, with renter as default.
    const role = input.role ?? 'renter';
    let user;
    try {
        user = await database_1.default.user.create({
            data: {
                email: input.email,
                password: hashedPassword,
                first_name: input.first_name ?? null,
                last_name: input.last_name ?? null,
                phone: normalizedPhone,
                role,
            },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                createdAt: true,
                emailVerified: true,
                isVerified: true,
            },
        });
    }
    catch (error) {
        const prismaError = error;
        if (prismaError.code === 'P2002') {
            const target = prismaError.meta?.target;
            const fields = Array.isArray(target) ? target : target ? [target] : [];
            if (fields.includes('email')) {
                throw new AppError_1.AppError('Email already registered', 409);
            }
            if (fields.includes('phone')) {
                throw new AppError_1.AppError('Phone number already registered', 409);
            }
            throw new AppError_1.AppError('Duplicate value violates unique constraint', 409);
        }
        throw error;
    }
    const { isVerified, ...safeUser } = user;
    const responseUser = user.role === 'owner' ? { ...safeUser, isVerified } : safeUser;
    const { accessToken, refreshToken } = (0, jwt_utils_1.generateTokenPair)(user.id, user.role);
    await storeRefreshToken(user.id, refreshToken);
    if (user.email) {
        try {
            await sendVerificationEmail(user.email, user.first_name);
        }
        catch (error) {
            console.warn(`Email verification could not be sent to ${user.email}: ${error.message}`);
        }
    }
    return { user: responseUser, accessToken, refreshToken };
}
/**
 * Login user with email and password
 */
async function login(input) {
    const user = await database_1.default.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw new AppError_1.AppError('Invalid email or password', 401);
    }
    // Check if account has password (social login users might not)
    if (!user.password) {
        throw new AppError_1.AppError('Please login with your social account', 400);
    }
    const valid = await bcryptjs_1.default.compare(input.password, user.password);
    if (!valid) {
        throw new AppError_1.AppError('Invalid email or password', 401);
    }
    if (!user.emailVerified) {
        throw new AppError_1.AppError('Please verify your email before logging in', 403);
    }
    const { accessToken, refreshToken } = (0, jwt_utils_1.generateTokenPair)(user.id, user.role);
    await storeRefreshToken(user.id, refreshToken);
    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
}
/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(oldRefreshToken) {
    // Verify the refresh token
    const decoded = (0, jwt_utils_1.verifyRefreshToken)(oldRefreshToken);
    // Check if refresh token exists in database
    const storedToken = await database_1.default.refreshToken.findUnique({
        where: { token: oldRefreshToken },
        include: { user: true },
    });
    if (!storedToken) {
        throw new AppError_1.AppError('Invalid refresh token', 401);
    }
    if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await database_1.default.refreshToken.delete({ where: { id: storedToken.id } });
        throw new AppError_1.AppError('Refresh token expired', 401);
    }
    // Delete old refresh token (token rotation)
    await database_1.default.refreshToken.delete({ where: { id: storedToken.id } });
    // Generate new token pair
    const { accessToken, refreshToken } = (0, jwt_utils_1.generateTokenPair)(storedToken.user.id, storedToken.user.role);
    // Store new refresh token
    await storeRefreshToken(storedToken.user.id, refreshToken);
    const { password: _, ...safeUser } = storedToken.user;
    return { user: safeUser, accessToken, refreshToken };
}
/**
 * Logout user (invalidate refresh token)
 */
async function logout(refreshToken) {
    await database_1.default.refreshToken.deleteMany({
        where: { token: refreshToken },
    });
}
/**
 * Verify Email
 */
async function verifyEmail(input) {
    const tokenRecord = await database_1.default.verificationToken.findUnique({
        where: { token: input.code },
    });
    if (!tokenRecord) {
        throw new AppError_1.AppError('Invalid verification token', 400);
    }
    if (tokenRecord.expires < new Date()) {
        await database_1.default.verificationToken.delete({
            where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
        });
        throw new AppError_1.AppError('Verification token expired', 400);
    }
    const user = await database_1.default.user.update({
        where: { email: tokenRecord.identifier },
        data: { emailVerified: true },
        select: { id: true, email: true, emailVerified: true },
    });
    // Clean up token
    await database_1.default.verificationToken.delete({
        where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
    });
    return user;
}
/**
 * Resend email verification code
 */
async function resendVerificationCode(input) {
    const user = await database_1.default.user.findUnique({
        where: { email: input.email },
        select: { email: true, first_name: true, emailVerified: true },
    });
    if (!user || !user.email) {
        throw new AppError_1.AppError('Email not found', 404);
    }
    if (user.emailVerified) {
        throw new AppError_1.AppError('Email is already verified', 400);
    }
    await sendVerificationEmail(user.email, user.first_name);
}
/**
 * Forgot Password - Send Reset Code
 */
async function forgotPassword(input) {
    const user = await database_1.default.user.findUnique({ where: { email: input.email } });
    if (!user || !user.email) {
        throw new AppError_1.AppError('Email not found', 404);
    }
    const resetCode = await createSixDigitCodeToken(user.email, PASSWORD_RESET_EXPIRY_HOURS);
    await (0, emailService_1.sendEmail)('resetPassword', user.email, {
        firstName: user.first_name ?? 'there',
        resetCode,
        expiryHours: PASSWORD_RESET_EXPIRY_HOURS,
        supportEmail: env_1.env.SUPPORT_EMAIL ?? env_1.env.EMAIL_FROM,
    }, 'Reset your password');
}
/**
 * Reset Password
 */
async function resetPassword(input) {
    const tokenRecord = await database_1.default.verificationToken.findUnique({
        where: { token: input.code },
    });
    if (!tokenRecord) {
        throw new AppError_1.AppError('Invalid or expired password reset code', 400);
    }
    if (tokenRecord.expires < new Date()) {
        await database_1.default.verificationToken.delete({
            where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
        });
        throw new AppError_1.AppError('Code expired', 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    const user = await database_1.default.user.update({
        where: { email: tokenRecord.identifier },
        data: { password: hashedPassword },
    });
    // Clean up token
    await database_1.default.verificationToken.delete({
        where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
    });
    return { message: 'Password reset successfully' };
}
/**
 * Get current user
 */
async function getMe(userId) {
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            createdAt: true,
            emailVerified: true,
            phone: true,
        },
    });
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    return user;
}
