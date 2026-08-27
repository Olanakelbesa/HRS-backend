import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
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
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

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

  // ==========================================
  // SOCIAL OAUTH ENDPOINTS (Google, Facebook, Apple)
  // ==========================================

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth(
    @Query('role') role: string = 'renter',
    @Query('redirect') redirect: string = '',
    @Res() res: Response,
  ) {
    const state = this.oauthService.encodeState({
      provider: 'google',
      role,
      redirectUrl: redirect,
    });
    const url = this.oauthService.getGoogleAuthUrl(state);
    return res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') stateStr: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({ error, provider: 'google' }),
      );
    }
    try {
      const state = this.oauthService.decodeState(stateStr);
      const profile = await this.oauthService.handleGoogleCallback(code);
      const result = await this.authService.handleSocialAuth(profile, state?.role);
      this.authService.setRefreshTokenCookie(res, result.refreshToken);
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({
          token: result.accessToken,
          role: result.user.role,
          isNewUser: result.isNewUser,
          provider: 'google',
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({
          error: message,
          provider: 'google',
        }),
      );
    }
  }

  @Public()
  @Get('facebook')
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  facebookAuth(
    @Query('role') role: string = 'renter',
    @Query('redirect') redirect: string = '',
    @Res() res: Response,
  ) {
    const state = this.oauthService.encodeState({
      provider: 'facebook',
      role,
      redirectUrl: redirect,
    });
    const url = this.oauthService.getFacebookAuthUrl(state);
    return res.redirect(url);
  }

  @Public()
  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback handler' })
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') stateStr: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({ error, provider: 'facebook' }),
      );
    }
    try {
      const state = this.oauthService.decodeState(stateStr);
      const profile = await this.oauthService.handleFacebookCallback(code);
      const result = await this.authService.handleSocialAuth(profile, state?.role);
      this.authService.setRefreshTokenCookie(res, result.refreshToken);
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({
          token: result.accessToken,
          role: result.user.role,
          isNewUser: result.isNewUser,
          provider: 'facebook',
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Facebook authentication failed';
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({
          error: message,
          provider: 'facebook',
        }),
      );
    }
  }

  @Public()
  @Get('apple')
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  appleAuth(
    @Query('role') role: string = 'renter',
    @Query('redirect') redirect: string = '',
    @Res() res: Response,
  ) {
    const state = this.oauthService.encodeState({
      provider: 'apple',
      role,
      redirectUrl: redirect,
    });
    const url = this.oauthService.getAppleAuthUrl(state);
    return res.redirect(url);
  }

  @Public()
  @Get('apple/callback')
  @Post('apple/callback')
  @ApiOperation({ summary: 'Apple OAuth callback handler (GET or form_post)' })
  async appleCallback(@Req() req: Request, @Res() res: Response) {
    const body = (req.body as Record<string, unknown>) || {};
    const query = (req.query as Record<string, unknown>) || {};
    const code = (body.code || query.code) as string | undefined;
    const id_token = (body.id_token || query.id_token) as string | undefined;
    const user = (body.user || query.user) as
      | string
      | { name?: { firstName?: string; lastName?: string }; email?: string }
      | undefined;
    const stateStr = (body.state || query.state) as string | undefined;
    const error = (body.error || query.error) as string | undefined;

    if (error) {
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({ error, provider: 'apple' }),
      );
    }

    try {
      const state = this.oauthService.decodeState(stateStr);
      const profile = this.oauthService.handleAppleCallback({ code, id_token, user });
      const result = await this.authService.handleSocialAuth(profile, state?.role);
      this.authService.setRefreshTokenCookie(res, result.refreshToken);
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({
          token: result.accessToken,
          role: result.user.role,
          isNewUser: result.isNewUser,
          provider: 'apple',
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Apple authentication failed';
      return res.redirect(
        this.oauthService.getFrontendCallbackUrl({
          error: message,
          provider: 'apple',
        }),
      );
    }
  }

  @Public()
  @Get('dev-demo')
  @ApiOperation({ summary: 'Dev OAuth Simulator when provider keys are not yet in .env' })
  async devDemoAuth(
    @Query('state') stateStr: string,
    @Res() res: Response,
  ) {
    const state = this.oauthService.decodeState(stateStr);
    const provider = state?.provider || 'google';
    const role = state?.role || 'renter';

    const profile = this.oauthService.generateDemoProfile(provider, role);
    const result = await this.authService.handleSocialAuth(profile, role);
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    return res.redirect(
      this.oauthService.getFrontendCallbackUrl({
        token: result.accessToken,
        role: result.user.role,
        isNewUser: result.isNewUser,
        provider,
      }),
    );
  }

  @Public()
  @Post('social-login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Direct Social Login token exchange' })
  async directSocialLogin(
    @Body() body: { provider: 'google' | 'facebook' | 'apple'; profile: any; role?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.handleSocialAuth(body.profile, body.role);
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
