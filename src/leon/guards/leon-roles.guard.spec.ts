import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeonRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonRolesGuard } from './leon-roles.guard';

describe('LeonRolesGuard', () => {
  let guard: LeonRolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;

    guard = new LeonRolesGuard(reflector);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValueOnce(null);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user is missing or app is not LEON', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValueOnce([LeonRole.ADMIN]);
    const context = createMockContext({ role: 'ADMIN', app: 'TIQUE' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access if user does not have the required LeonRole', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValueOnce([LeonRole.ADMIN]);
    const context = createMockContext({ role: 'USER', app: 'LEON' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access if user has the required LeonRole and app: LEON', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValueOnce([LeonRole.ADMIN]);
    const context = createMockContext({ role: 'ADMIN', app: 'LEON' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
