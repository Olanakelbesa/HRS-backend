import { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema';
import * as authService from './service';

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await authService.register(parsed.data.body);

  // Set refresh token as HTTP-Only cookie
  authService.setRefreshTokenCookie(res, result.refreshToken);

  return res.status(201).json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await authService.login(parsed.data.body);

  // Set refresh token as HTTP-Only cookie
  authService.setRefreshTokenCookie(res, result.refreshToken);

  const { user, accessToken, refreshToken } = result;
  return res.status(200).json({
    status: 'success',
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
}

export async function refreshToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      status: 'error',
      message: 'Refresh token not found',
    });
  }

  const result = await authService.refreshAccessToken(refreshToken);

  // Set new refresh token as HTTP-Only cookie
  authService.setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Clear refresh token cookie
  authService.clearRefreshTokenCookie(res);

  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
}

export async function getMe(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId;
  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const user = await authService.getMe(userId);
  return res.status(200).json({
    status: 'success',
    data: { user },
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const parsed = verifyEmailSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  await authService.verifyEmail(parsed.data.body);

  return res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
  });
}

export async function resendVerificationCode(req: Request, res: Response) {
  const parsed = resendVerificationCodeSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  await authService.resendVerificationCode(parsed.data.body);

  return res.status(200).json({
    status: 'success',
    message: 'A new verification code has been sent.',
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  await authService.forgotPassword(parsed.data.body);

  return res.status(200).json({
    status: 'success',
    message: 'A password reset email has been sent.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  await authService.resetPassword(parsed.data.body);

  return res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully.',
  });
}
