import { createZodDto } from 'nestjs-zod';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema';

/** Flat body schemas for Nest Swagger / nestjs-zod DTOs */
export const registerBodySchema = registerSchema.shape.body;
export const loginBodySchema = loginSchema.shape.body;
export const verifyEmailBodySchema = verifyEmailSchema.shape.body;
export const resendVerificationCodeBodySchema = resendVerificationCodeSchema.shape.body;
export const forgotPasswordBodySchema = forgotPasswordSchema.shape.body;
export const resetPasswordBodySchema = resetPasswordSchema.shape.body;

export class RegisterDto extends createZodDto(registerBodySchema) {}
export class LoginDto extends createZodDto(loginBodySchema) {}
export class VerifyEmailDto extends createZodDto(verifyEmailBodySchema) {}
export class ResendVerificationCodeDto extends createZodDto(
  resendVerificationCodeBodySchema,
) {}
export class ForgotPasswordDto extends createZodDto(forgotPasswordBodySchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordBodySchema) {}
