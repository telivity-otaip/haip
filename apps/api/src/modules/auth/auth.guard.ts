import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global JWT authentication guard.
 *
 * All endpoints require a valid JWT by default.
 * Exceptions:
 * - Endpoints decorated with @Public() are exempt
 * - When AUTH_ENABLED=false (dev/testing), all requests pass through
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    // If auth is disabled (dev/testing), allow all requests
    const authEnabled = this.configService.get<string>('AUTH_ENABLED', 'false');
    if (authEnabled !== 'true') {
      return true;
    }

    // Check if endpoint is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message ?? 'Invalid or missing token');
    }
    return user;
  }
}
