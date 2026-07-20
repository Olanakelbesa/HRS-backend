import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user?.role) {
      throw new UnauthorizedException('Authentication required');
    }

    const normalizedUserRole = String(user.role).trim().toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.trim().toLowerCase());

    if (!normalizedAllowed.includes(normalizedUserRole)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
