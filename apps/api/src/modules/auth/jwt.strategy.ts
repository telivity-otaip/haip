import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { AuthUser } from './current-user.decorator';

/**
 * JWT Strategy — validates Keycloak-issued JWTs.
 *
 * Fetches Keycloak's public signing keys via JWKS endpoint.
 * Extracts user info and realm roles from the JWT claims.
 *
 * Audience enforcement:
 * - `aud` is validated against KEYCLOAK_CLIENT_ID (or KEYCLOAK_AUDIENCE if set).
 * - Keycloak also emits `azp` (authorized party) identifying the client that
 *   obtained the token. We enforce `azp === expected` in validate() so tokens
 *   from other realm clients cannot be replayed against this API.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly expectedAudience: string;

  constructor(configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'haip');
    const issuer = `${keycloakUrl}/realms/${realm}`;
    const audience =
      configService.get<string>('KEYCLOAK_AUDIENCE') ||
      configService.get<string>('KEYCLOAK_CLIENT_ID', 'haip-api');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      audience,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
      }),
    });

    this.expectedAudience = audience;
  }

  /**
   * Passport calls this after JWT signature + issuer + audience are verified.
   * We additionally enforce `azp` (Keycloak's authorized-party claim) so that
   * access tokens minted for a different realm client cannot pass through.
   * Returns the user object attached to req.user.
   */
  validate(payload: any): AuthUser {
    if (payload.azp && payload.azp !== this.expectedAudience) {
      throw new UnauthorizedException('Invalid token audience (azp mismatch)');
    }
    return {
      sub: payload.sub,
      email: payload.email ?? '',
      name: payload.name ?? payload.preferred_username ?? '',
      roles: payload.realm_access?.roles ?? [],
      propertyIds: payload.property_ids ?? undefined,
    };
  }
}
