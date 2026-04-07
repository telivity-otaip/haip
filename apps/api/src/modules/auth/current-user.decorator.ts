import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the authenticated user from the request.
 * Populated by JwtStrategy from the Keycloak JWT claims.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUser) {
 *   return { email: user.email, roles: user.roles };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export interface AuthUser {
  sub: string;          // Keycloak user ID
  email: string;
  name: string;
  roles: string[];      // Realm roles from realm_access.roles
  propertyIds?: string[]; // Allowed property IDs (from user attributes)
}
