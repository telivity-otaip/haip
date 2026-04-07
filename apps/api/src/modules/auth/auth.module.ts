import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Authentication & Authorization module.
 *
 * Uses Keycloak as the OIDC provider. JWT tokens issued by Keycloak
 * are validated against the JWKS endpoint.
 *
 * AUTH_ENABLED env var controls whether auth is enforced:
 * - 'false' (default) — all requests pass through, no JWT required
 * - 'true' — JWT required on all endpoints except @Public()
 *
 * Guards are registered globally:
 * 1. JwtAuthGuard — validates JWT (or skips if AUTH_ENABLED=false)
 * 2. RolesGuard — checks @Roles() decorator (or skips if AUTH_ENABLED=false)
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  providers: [
    // Only register JWT strategy when auth might be enabled
    // The strategy itself is lazy — only connects to JWKS when a token is actually validated
    {
      provide: JwtStrategy,
      useFactory: (configService: ConfigService) => {
        const authEnabled = configService.get<string>('AUTH_ENABLED', 'false');
        if (authEnabled === 'true') {
          return new JwtStrategy(configService);
        }
        // Return a no-op strategy when auth is disabled
        return {} as JwtStrategy;
      },
      inject: [ConfigService],
    },
    // Global guards — applied to ALL endpoints
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
