import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationCodeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    return {
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body);
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    return {
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
      return { status: 'error', message: 'Refresh token not found' };
    }

    const result = await this.authService.refreshAccessToken(refreshToken);
    this.authService.setRefreshTokenCookie(res, result.refreshToken);

    return {
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.authService.clearRefreshTokenCookie(res);
    return { status: 'success', message: 'Logged out successfully' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email using 6-digit code' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    await this.authService.verifyEmail(body);
    return { status: 'success', message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiBody({ type: ResendVerificationCodeDto })
  async resendCode(@Body() body: ResendVerificationCodeDto) {
    await this.authService.resendVerificationCode(body);
    return { status: 'success', message: 'A new verification code has been sent.' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset code' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body);
    return { status: 'success', message: 'A password reset code has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password using code' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);
    return { status: 'success', message: 'Password has been reset successfully.' };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: AuthUser) {
    const me = await this.authService.getMe(user.userId);
    return { status: 'success', data: { user: me } };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Auth module health check' })
  health() {
    return { status: 'ok', module: 'auth' };
  }
}
