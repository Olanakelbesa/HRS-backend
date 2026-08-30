import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../core/AppError';

export interface OAuthUserProfile {
  provider: 'google' | 'facebook' | 'telegram' | 'apple';
  providerAccountId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
}

export interface OAuthStateData {
  provider: 'google' | 'facebook' | 'telegram' | 'apple';
  role?: string;
  redirectUrl?: string;
  nonce?: string;
  isDemo?: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  encodeState(data: OAuthStateData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  decodeState(stateStr?: string): OAuthStateData | null {
    if (!stateStr) return null;
    try {
      return JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf-8'));
    } catch {
      try {
        return JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
      } catch {
        return null;
      }
    }
  }

  getFrontendCallbackUrl(params: {
    token?: string;
    role?: string;
    isNewUser?: boolean;
    error?: string;
    provider?: string;
  }): string {
    const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const query = new URLSearchParams();

    if (params.token) query.set('token', params.token);
    if (params.role) query.set('role', params.role);
    if (params.isNewUser !== undefined) query.set('isNewUser', String(params.isNewUser));
    if (params.provider) query.set('provider', params.provider);
    if (params.error) query.set('error', params.error);

    return `${frontendUrl}/auth/callback?${query.toString()}`;
  }

  // ==========================================
  // GOOGLE OAUTH
  // ==========================================
  isGoogleConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }

  getGoogleAuthUrl(state: string): string {
    const redirectUri = `${env.APP_BASE_URL}/api/auth/google/callback`;

    if (!this.isGoogleConfigured()) {
      return `${env.APP_BASE_URL}/api/auth/dev-demo?state=${state}`;
    }

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string): Promise<OAuthUserProfile> {
    const redirectUri = `${env.APP_BASE_URL}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      this.logger.error(`Google token exchange failed: ${errText}`);
      throw new AppError('Failed to exchange Google authorization code.', 400);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
    };

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      throw new AppError('Failed to fetch user info from Google.', 400);
    }

    const userInfo = (await userRes.json()) as {
      sub: string;
      email: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    if (!userInfo.email) {
      throw new AppError('Google account does not have a verified email.', 400);
    }

    return {
      provider: 'google',
      providerAccountId: userInfo.sub,
      email: userInfo.email.toLowerCase().trim(),
      firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || 'GoogleUser',
      lastName: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
      image: userInfo.picture || null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      idToken: tokens.id_token || null,
    };
  }

  // ==========================================
  // FACEBOOK OAUTH
  // ==========================================
  isFacebookConfigured(): boolean {
    const appId = env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID;
    const appSecret = env.FACEBOOK_APP_SECRET || env.FACEBOOK_CLIENT_SECRET;
    return Boolean(appId && appSecret);
  }

  getFacebookAuthUrl(state: string): string {
    const appId = env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID;
    const redirectUri = `${env.APP_BASE_URL}/api/auth/facebook/callback`;

    if (!this.isFacebookConfigured()) {
      return `${env.APP_BASE_URL}/api/auth/dev-demo?state=${state}`;
    }

    const params = new URLSearchParams({
      client_id: appId!,
      redirect_uri: redirectUri,
      scope: 'email,public_profile',
      state,
      response_type: 'code',
    });

    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  }

  async handleFacebookCallback(code: string): Promise<OAuthUserProfile> {
    const appId = env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID;
    const appSecret = env.FACEBOOK_APP_SECRET || env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = `${env.APP_BASE_URL}/api/auth/facebook/callback`;

    const params = new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      redirect_uri: redirectUri,
      code,
    });
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`;
    const tokenRes = await fetch(tokenUrl);

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      let fbMessage = '';
      try {
        const parsed = JSON.parse(errText);
        fbMessage = parsed?.error?.message || '';
      } catch {
        // ignore json parse error
      }
      this.logger.error(`Facebook token exchange failed: ${errText}`);
      throw new AppError(fbMessage || 'Failed to exchange Facebook authorization code.', 400);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const profileUrl = `https://graph.facebook.com/me?fields=id,name,first_name,last_name,email,picture.type(large)&access_token=${tokenData.access_token}`;
    const profileRes = await fetch(profileUrl);

    if (!profileRes.ok) {
      throw new AppError('Failed to fetch user profile from Facebook.', 400);
    }

    const fbProfile = (await profileRes.json()) as {
      id: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    const email = fbProfile.email
      ? fbProfile.email.toLowerCase().trim()
      : `fb_${fbProfile.id}@facebook.user.local`;

    return {
      provider: 'facebook',
      providerAccountId: fbProfile.id,
      email,
      firstName: fbProfile.first_name || fbProfile.name?.split(' ')[0] || 'FacebookUser',
      lastName: fbProfile.last_name || fbProfile.name?.split(' ').slice(1).join(' ') || '',
      image: fbProfile.picture?.data?.url || null,
      accessToken: tokenData.access_token,
    };
  }

  // ==========================================
  // APPLE OAUTH
  // ==========================================
  isAppleConfigured(): boolean {
    return Boolean(env.APPLE_CLIENT_ID);
  }

  getAppleAuthUrl(state: string): string {
    const redirectUri = `${env.APP_BASE_URL}/api/auth/apple/callback`;

    if (!this.isAppleConfigured()) {
      return `${env.APP_BASE_URL}/api/auth/dev-demo?state=${state}`;
    }

    const params = new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      scope: 'name email',
      response_mode: 'form_post',
      state,
    });

    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  parseAppleIdToken(idToken: string): { sub: string; email?: string } {
    try {
      const parts = idToken.split('.');
      if (parts.length < 2) throw new Error('Invalid token structure');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      return {
        sub: payload.sub,
        email: payload.email,
      };
    } catch {
      throw new AppError('Invalid Apple ID Token.', 400);
    }
  }

  handleAppleCallback(params: {
    code?: string;
    id_token?: string;
    user?: string | { name?: { firstName?: string; lastName?: string }; email?: string };
  }): OAuthUserProfile {
    if (!params.id_token) {
      throw new AppError('Apple response missing id_token.', 400);
    }

    const tokenPayload = this.parseAppleIdToken(params.id_token);

    let parsedUser: { name?: { firstName?: string; lastName?: string }; email?: string } | undefined;
    if (typeof params.user === 'string') {
      try {
        parsedUser = JSON.parse(params.user);
      } catch {
        // ignore
      }
    } else if (params.user) {
      parsedUser = params.user;
    }

    const email = (parsedUser?.email || tokenPayload.email || `apple_${tokenPayload.sub}@privaterelay.appleid.com`).toLowerCase().trim();
    const firstName = parsedUser?.name?.firstName || 'Apple';
    const lastName = parsedUser?.name?.lastName || 'User';

    return {
      provider: 'apple',
      providerAccountId: tokenPayload.sub,
      email,
      firstName,
      lastName,
      idToken: params.id_token,
    };
  }

  // ==========================================
  // TELEGRAM AUTH
  // ==========================================
  isTelegramConfigured(): boolean {
    return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
  }

  getTelegramAuthUrl(state: string): string {
    if (!this.isTelegramConfigured()) {
      return `${env.APP_BASE_URL}/api/auth/dev-demo?state=${state}`;
    }

    const botId = env.TELEGRAM_BOT_TOKEN!.split(':')[0];
    const callbackUrl = `${env.APP_BASE_URL}/api/auth/telegram/callback`;

    return `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(env.APP_BASE_URL)}&return_to=${encodeURIComponent(callbackUrl)}&request_access=write`;
  }

  verifyTelegramAuth(data: Record<string, any>): boolean {
    if (!env.TELEGRAM_BOT_TOKEN) return false;

    const hash = data.hash ? String(data.hash) : '';
    if (!hash) return false;

    const authDate = Number(data.auth_date);
    if (!authDate || (Date.now() / 1000 - authDate) > 86400) {
      this.logger.warn('Telegram auth data expired (older than 24 hours)');
      return false;
    }

    const dataCheckArr: string[] = [];
    for (const key of Object.keys(data).sort()) {
      if (key !== 'hash' && key !== 'state' && data[key] !== undefined && data[key] !== null) {
        dataCheckArr.push(`${key}=${data[key]}`);
      }
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHash('sha256').update(env.TELEGRAM_BOT_TOKEN).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return hmac === hash;
  }

  handleTelegramCallback(query: Record<string, any>): OAuthUserProfile {
    if (!this.verifyTelegramAuth(query)) {
      throw new AppError('Telegram authentication signature verification failed.', 400);
    }

    const telegramId = String(query.id);
    const firstName = query.first_name || 'TelegramUser';
    const lastName = query.last_name || '';
    const username = query.username;
    const photoUrl = query.photo_url || null;

    const email = username
      ? `${String(username).toLowerCase()}@telegram.user.local`
      : `tg_${telegramId}@telegram.user.local`;

    return {
      provider: 'telegram',
      providerAccountId: telegramId,
      email,
      firstName,
      lastName,
      image: photoUrl,
    };
  }

  // ==========================================
  // DEV DEMO SIMULATION (Fallback when keys aren't in .env)
  // ==========================================
  generateDemoProfile(provider: 'google' | 'facebook' | 'telegram' | 'apple', role = 'renter'): OAuthUserProfile {
    const demoProfiles: Record<'google' | 'facebook' | 'telegram' | 'apple', OAuthUserProfile> = {
      google: {
        provider: 'google',
        providerAccountId: 'demo_google_id_1029384756',
        email: `alex.estay.${role}@gmail.com`,
        firstName: 'Alex',
        lastName: 'Abebe',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop&q=80',
      },
      facebook: {
        provider: 'facebook',
        providerAccountId: 'demo_fb_id_9876543210',
        email: `sarah.estay.${role}@facebook.com`,
        firstName: 'Sarah',
        lastName: 'Tadesse',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&fit=crop&q=80',
      },
      telegram: {
        provider: 'telegram',
        providerAccountId: 'demo_tg_id_5544332211',
        email: `samuel.estay.${role}@telegram.user.local`,
        firstName: 'Samuel',
        lastName: 'Alemu',
        image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80',
      },
      apple: {
        provider: 'apple',
        providerAccountId: 'demo_apple_id_0192837465',
        email: `david.estay.${role}@icloud.com`,
        firstName: 'David',
        lastName: 'Bekele',
        image: null,
      },
    };

    return demoProfiles[provider];
  }
}
