import { Injectable } from '@nestjs/common';
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
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'haip');
    const issuer = `${keycloakUrl}/realms/${realm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
      }),
    });
  }

  /**
   * Passport calls this after JWT signature is verified.
   * Returns the user object attached to req.user.
   */
  validate(payload: any): AuthUser {
    return {
      sub: payload.sub,
      email: payload.email ?? '',
      name: payload.name ?? payload.preferred_username ?? '',
      roles: payload.realm_access?.roles ?? [],
      propertyIds: payload.property_ids ?? undefined,
    };
  }
}
