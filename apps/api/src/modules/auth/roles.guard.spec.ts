import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RolesGuard } from './roles.guard';

function createMockContext(user?: any): ExecutionContext {
  return {
    getHandler: () => (() => {}),
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getType: () => 'http' as any,
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  describe('when AUTH_ENABLED=false', () => {
    let guard: RolesGuard;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RolesGuard,
          Reflector,
          { provide: ConfigService, useValue: { get: () => 'false' } },
        ],
      }).compile();
      guard = module.get<RolesGuard>(RolesGuard);
    });

    it('should allow all requests regardless of roles', () => {
      const context = createMockContext();
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when AUTH_ENABLED=true', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RolesGuard,
          Reflector,
          { provide: ConfigService, useValue: { get: (key: string, def?: string) => key === 'AUTH_ENABLED' ? 'true' : def } },
        ],
      }).compile();
      guard = module.get<RolesGuard>(RolesGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    it('should allow when no @Roles() is defined (any authenticated user)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const user = { sub: 'u1', roles: ['housekeeping'] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow admin access to admin-only endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const user = { sub: 'u1', roles: ['admin'] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow front_desk access to front_desk+admin endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'front_desk']);
      const user = { sub: 'u1', roles: ['front_desk'] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny housekeeping access to admin-only endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const user = { sub: 'u1', roles: ['housekeeping'] };
      const context = createMockContext(user);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny front_desk access to admin-only endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const user = { sub: 'u1', roles: ['front_desk'] };
      const context = createMockContext(user);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny when no user is present', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const context = createMockContext(undefined);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow user with multiple roles if any matches', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['night_auditor']);
      const user = { sub: 'u1', roles: ['housekeeping_manager', 'night_auditor'] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny when user has roles but none match', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'front_desk']);
      const user = { sub: 'u1', roles: ['housekeeping', 'readonly'] };
      const context = createMockContext(user);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should include role info in error message', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const user = { sub: 'u1', roles: ['housekeeping'] };
      const context = createMockContext(user);
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.message).toContain('admin');
        expect(e.message).toContain('housekeeping');
      }
    });

    it('should allow empty roles array to pass when @Roles() is not set', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const user = { sub: 'u1', roles: [] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow housekeeping to access housekeeping endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'housekeeping', 'housekeeping_manager']);
      const user = { sub: 'u1', roles: ['housekeeping'] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny readonly user from write endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'front_desk']);
      const user = { sub: 'u1', roles: ['readonly'] };
      const context = createMockContext(user);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow night_auditor to run night audit', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'night_auditor']);
      const user = { sub: 'u1', roles: ['night_auditor'] };
      const context = createMockContext(user);
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
