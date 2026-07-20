import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const serviceToken = process.env.RECOMMENDATION_SERVICE_TOKEN;

    if (!serviceToken) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'SERVICE_AUTHENTICATION_REQUIRED',
          message: 'Service token is not configured on the server',
        },
      });
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token || token !== serviceToken) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'SERVICE_AUTHENTICATION_REQUIRED',
          message: 'This endpoint requires a valid service token',
        },
      });
    }

    return true;
  }
}
