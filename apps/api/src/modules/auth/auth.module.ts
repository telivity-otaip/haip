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
    // Register JWT strategy unless auth is explicitly disabled.
    // The guards (JwtAuthGuard / RolesGuard) are secure-by-default — they enforce
    // auth unless AUTH_ENABLED === 'false' — so the strategy must be registered
    // to match. The strategy is lazy — it only connects to JWKS when a token is
    // actually validated, so no runtime cost when auth is off.
    {
      provide: JwtStrategy,
      useFactory: (configService: ConfigService) => {
        const authEnabled = configService.get<string>('AUTH_ENABLED', 'true');
        if (authEnabled === 'false') {
          // Return a no-op strategy when auth is explicitly disabled
          return {} as JwtStrategy;
        }
        return new JwtStrategy(configService);
      },
      inject: [ConfigService],
    },
    // Global guards — applied to ALL endpoints
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
