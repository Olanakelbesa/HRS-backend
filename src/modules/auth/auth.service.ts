import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import * as authService from './service';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationCodeInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './schema';

@Injectable()
export class AuthService {
  register(input: RegisterInput) {
    return authService.register(input);
  }

  login(input: LoginInput) {
    return authService.login(input);
  }

  refreshAccessToken(refreshToken: string) {
    return authService.refreshAccessToken(refreshToken);
  }

  logout(refreshToken: string) {
    return authService.logout(refreshToken);
  }

  verifyEmail(input: VerifyEmailInput) {
    return authService.verifyEmail(input);
  }

  resendVerificationCode(input: ResendVerificationCodeInput) {
    return authService.resendVerificationCode(input);
  }

  forgotPassword(input: ForgotPasswordInput) {
    return authService.forgotPassword(input);
  }

  resetPassword(input: ResetPasswordInput) {
    return authService.resetPassword(input);
  }

  getMe(userId: string) {
    return authService.getMe(userId);
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    authService.setRefreshTokenCookie(res, refreshToken);
  }

  clearRefreshTokenCookie(res: Response) {
    authService.clearRefreshTokenCookie(res);
  }
}
