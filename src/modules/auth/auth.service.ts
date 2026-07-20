import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../infrastructure/mail/mail.service';
import { env } from '../../config/env';
import { AppError } from '../../core/AppError';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.utils';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationCodeInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './schema';

const SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 1;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async createSixDigitCodeToken(email: string, expiryHours: number): Promise<string> {
    let token = this.generateSixDigitCode();
    let attempts = 0;

    while (attempts < 5) {
      const existing = await this.prisma.verificationToken.findUnique({ where: { token } });
      if (!existing) break;
      token = this.generateSixDigitCode();
      attempts += 1;
    }

    if (attempts >= 5) {
      throw new AppError('Could not generate verification code. Please try again.', 500);
    }

    const expires = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await this.prisma.verificationToken.deleteMany({ where: { identifier: email } });

    await this.prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    return token;
  }

  private async sendVerificationEmail(email: string, firstName?: string | null): Promise<void> {
    const verificationCode = await this.createSixDigitCodeToken(email, EMAIL_VERIFICATION_EXPIRY_HOURS);

    await this.mailService.send(
      'verifyEmail',
      email,
      {
        firstName: firstName ?? 'there',
        verificationCode,
        expiryHours: EMAIL_VERIFICATION_EXPIRY_HOURS,
        supportEmail: env.SUPPORT_EMAIL ?? env.EMAIL_FROM,
      },
      'Verify your email address',
    );
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });
  }

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const normalizedPhone = input.phone?.trim() || null;
    if (normalizedPhone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        throw new AppError('Phone number already registered', 409);
      }
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
    const role = input.role ?? 'renter';

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          first_name: input.first_name ?? null,
          last_name: input.last_name ?? null,
          phone: normalizedPhone,
          role,
        } as Prisma.UserCreateInput,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          createdAt: true,
          emailVerified: true,
          isVerified: true,
        } as Prisma.UserSelect,
      });
    } catch (error) {
      const prismaError = error as { code?: string; meta?: { target?: string[] | string } };
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target;
        const fields = Array.isArray(target) ? target : target ? [target] : [];
        if (fields.includes('email')) {
          throw new AppError('Email already registered', 409);
        }
        if (fields.includes('phone')) {
          throw new AppError('Phone number already registered', 409);
        }
        throw new AppError('Duplicate value violates unique constraint', 409);
      }
      throw error;
    }

    const { isVerified, ...safeUser } = user;
    const responseUser = user.role === 'owner' ? { ...safeUser, isVerified } : safeUser;

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
    await this.storeRefreshToken(user.id, refreshToken);

    if (user.email) {
      try {
        await this.sendVerificationEmail(user.email, user.first_name);
      } catch (error) {
        console.warn(
          `Email verification could not be sent to ${user.email}: ${(error as Error).message}`,
        );
      }
    }

    return { user: responseUser, accessToken, refreshToken };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.password) {
      throw new AppError('Please login with your social account', 400);
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.emailVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
    await this.storeRefreshToken(user.id, refreshToken);

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async refreshAccessToken(oldRefreshToken: string) {
    const decoded = verifyRefreshToken(oldRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Refresh token expired', 401);
    }

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const { accessToken, refreshToken } = generateTokenPair(
      storedToken.user.id,
      storedToken.user.role,
    );

    await this.storeRefreshToken(storedToken.user.id, refreshToken);

    const { password: _, ...safeUser } = storedToken.user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async verifyEmail(input: VerifyEmailInput) {
    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token: input.code },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid verification token', 400);
    }

    if (tokenRecord.expires < new Date()) {
      await this.prisma.verificationToken.delete({
        where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
      });
      throw new AppError('Verification token expired', 400);
    }

    const user = await this.prisma.user.update({
      where: { email: tokenRecord.identifier },
      data: { emailVerified: true },
      select: { id: true, email: true, emailVerified: true },
    });

    await this.prisma.verificationToken.delete({
      where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
    });

    return user;
  }

  async resendVerificationCode(input: ResendVerificationCodeInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { email: true, first_name: true, emailVerified: true },
    });

    if (!user || !user.email) {
      throw new AppError('Email not found', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    await this.sendVerificationEmail(user.email, user.first_name);
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.email) {
      throw new AppError('Email not found', 404);
    }

    const resetCode = await this.createSixDigitCodeToken(user.email, PASSWORD_RESET_EXPIRY_HOURS);

    await this.mailService.send(
      'resetPassword',
      user.email,
      {
        firstName: user.first_name ?? 'there',
        resetCode,
        expiryHours: PASSWORD_RESET_EXPIRY_HOURS,
        supportEmail: env.SUPPORT_EMAIL ?? env.EMAIL_FROM,
      },
      'Reset your password',
    );
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token: input.code },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid or expired password reset code', 400);
    }

    if (tokenRecord.expires < new Date()) {
      await this.prisma.verificationToken.delete({
        where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
      });
      throw new AppError('Code expired', 400);
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { email: tokenRecord.identifier },
      data: { password: hashedPassword },
    });

    await this.prisma.verificationToken.delete({
      where: { identifier_token: { identifier: tokenRecord.identifier, token: input.code } },
    });

    return { message: 'Password reset successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
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
      throw new AppError('User not found', 404);
    }
    return user;
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: isDevelopment ? 'lax' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  clearRefreshTokenCookie(res: Response) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: isDevelopment ? 'lax' : 'strict',
      path: '/',
    });
  }
}
