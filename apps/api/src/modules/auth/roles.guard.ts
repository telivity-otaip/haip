import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ROLES_KEY } from './roles.decorator';
import type { AuthUser } from './current-user.decorator';

/**
 * Role-based access control guard.
 *
 * Checks if the authenticated user has at least one of the required roles.
 * If no @Roles() decorator is set on the handler, any authenticated user can access.
 *
 * When AUTH_ENABLED=false, all role checks are skipped.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // If auth is disabled, skip role checks
    const authEnabled = this.configService.get<string>('AUTH_ENABLED', 'false');
    if (authEnabled !== 'true') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → any authenticated user can access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your roles: ${user.roles.join(', ') || 'none'}`,
      );
    }

    return true;
  }
}
