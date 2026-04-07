import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './auth.guard';

function createMockContext(handler?: any, classRef?: any): ExecutionContext {
  return {
    getHandler: () => handler ?? (() => {}),
    getClass: () => classRef ?? class {},
    switchToHttp: () => ({
      getRequest: () => ({ user: null }),
      getResponse: () => ({}),
      getNext: () => (() => {}),
    }),
    getType: () => 'http' as any,
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  describe('when AUTH_ENABLED=false', () => {
    let guard: JwtAuthGuard;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          Reflector,
          { provide: ConfigService, useValue: { get: () => 'false' } },
        ],
      }).compile();
      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    });

    it('should allow all requests without token', () => {
      const context = createMockContext();
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when AUTH_ENABLED=true', () => {
    let guard: JwtAuthGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          Reflector,
          { provide: ConfigService, useValue: { get: (key: string, def?: string) => key === 'AUTH_ENABLED' ? 'true' : def } },
        ],
      }).compile();
      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    it('should allow @Public() endpoints without token', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockContext();
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException when no user', () => {
      expect(() => guard.handleRequest(null, null, { message: 'No auth token' }))
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with error info', () => {
      expect(() => guard.handleRequest(null, null, { message: 'jwt expired' }))
        .toThrow('jwt expired');
    });

    it('should return user when valid', () => {
      const user = { sub: 'user-1', email: 'test@test.com', roles: ['admin'] };
      expect(guard.handleRequest(null, user, null)).toEqual(user);
    });

    it('should rethrow existing errors', () => {
      const error = new Error('Custom error');
      expect(() => guard.handleRequest(error, null, null))
        .toThrow('Custom error');
    });
  });
});
