import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { verifyAccessToken } from '../../utils/jwt.utils';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (isPublic) {
      // Optional auth: attach user when a valid Bearer token is present
      if (token) {
        try {
          const { userId, role } = verifyAccessToken(token);
          request.user = { userId, role };
        } catch {
          // Ignore invalid tokens on public routes
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authorization token required');
    }

    try {
      const { userId, role } = verifyAccessToken(token);
      request.user = { userId, role };
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid or expired token';
      throw new UnauthorizedException(message);
    }
  }
}
