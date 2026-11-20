import { GUARDS_METADATA } from '@nestjs/common/constants';

import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RolesGuard } from '../../../../auth/roles.guard';
import { ROLES_KEY } from '../../../../auth/roles.decorator';
import { McpTokensController } from './mcp-tokens.controller';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { McpTokenService } from '../../application/mcp-token.service';

describe('McpTokensController (S3)', () => {
  let controller: McpTokensController;
  let service: McpTokenService;

  const created = {
    id: 'tok-1',
    name: 'Hermes laptop',
    createdAt: '2026-11-01T00:00:00.000Z',
    token: 'gmcp_' + 'A'.repeat(43),
  };

  beforeEach(() => {
    service = {
      create: vi.fn().mockResolvedValue(created),
      list: vi.fn().mockResolvedValue([]),
      revoke: vi.fn().mockResolvedValue({ success: true }),
      verify: vi.fn().mockResolvedValue(null),
    } as unknown as McpTokenService;

    controller = new McpTokensController(service);
  });

  it('creates using the JWT user id and the body name only', async () => {
    await expect(
      controller.create({ userId: 'jwt-user' }, {
        name: 'Hermes laptop',
        userId: 'body-user',
        token: 'gmcp_x',
      } as {
        name: unknown;
      }),
    ).resolves.toEqual(created);

    expect(service.create).toHaveBeenCalledWith('jwt-user', 'Hermes laptop');
    expect(
      JSON.stringify(
        (service.create as ReturnType<typeof vi.fn>).mock.calls[0],
      ),
    ).not.toContain('body-user');
  });

  it('passes a missing name on a null body to the service validation instead of throwing', async () => {
    await expect(
      controller.create(
        { userId: 'jwt-user' },
        null as unknown as { name: unknown },
      ),
    ).resolves.toEqual(created);

    expect(service.create).toHaveBeenCalledWith('jwt-user', undefined);
  });

  it('lists the JWT user tokens', async () => {
    await controller.list({ userId: 'jwt-user' });

    expect(service.list).toHaveBeenCalledWith('jwt-user');
  });

  it('revokes the JWT user token by id', async () => {
    await expect(
      controller.remove('tok-1', { userId: 'jwt-user' }),
    ).resolves.toEqual({ success: true });

    expect(service.revoke).toHaveBeenCalledWith('jwt-user', 'tok-1');
  });

  it('guards every route with JWT and ADMIN', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      McpTokensController,
    ) as unknown[];

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));

    for (const handler of ['create', 'list', 'remove']) {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          McpTokensController.prototype[handler as 'create'],
        ) ?? Reflect.getMetadata(ROLES_KEY, McpTokensController),
      ).toContain(Role.ADMIN);
    }
  });
});
