import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: any): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should return true when no roles are required', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return false when user is not present in request', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ADMIN]);
    const context = createMockContext(undefined);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return false when user does not have the required role', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ userId: 'u1', role: Role.USER });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return true when user has the required role', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ userId: 'u1', role: Role.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });
});
