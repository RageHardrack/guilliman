import { BadRequestException, NotFoundException } from '@nestjs/common';

import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { McpToken } from '../domain/mcp-token.entity';
import { McpTokenService } from './mcp-token.service';
import { hashMcpAccessToken } from '../domain/mcp-access-token';
import type { McpTokenStorePort } from './ports/mcp-token.repository.port';

const account = {
  id: 'user-1',
  email: 'daniel@lascar.pe',
  role: Role.ADMIN,
  isActive: true,
};

const issued = {
  id: 'tok-1',
  name: 'Hermes laptop',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
};

describe('McpTokenService (S2, S3)', () => {
  let service: McpTokenService;
  let store: {
    create: ReturnType<typeof vi.fn>;
    findAllByUserId: ReturnType<typeof vi.fn>;
    findTokenByHash: ReturnType<typeof vi.fn>;
    markUsed: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };

  const tokenOf = (overrides: Partial<{ revokedAt: Date | null }> = {}) =>
    new McpToken({
      id: 'tok-1',
      userId: 'user-1',
      name: 'Hermes laptop',
      tokenHash: 'b'.repeat(64),
      createdAt: issued.createdAt,
      ...overrides,
    });

  beforeEach(() => {
    store = {
      create: vi.fn().mockResolvedValue(tokenOf()),
      findAllByUserId: vi.fn().mockResolvedValue([tokenOf()]),
      findTokenByHash: vi.fn().mockResolvedValue({ token: tokenOf(), account }),
      markUsed: vi.fn().mockResolvedValue(undefined),
      revoke: vi.fn().mockResolvedValue(true),
    };

    service = new McpTokenService(store as unknown as McpTokenStorePort);
  });

  describe('create — S3 returns the plaintext once, S2 stores only the hash', () => {
    it('returns id, name, createdAt and the plaintext token', async () => {
      const result = await service.create('user-1', 'Hermes laptop');

      expect(result.id).toBe('tok-1');
      expect(result.name).toBe('Hermes laptop');
      expect(result.createdAt).toBe('2026-11-01T00:00:00.000Z');
      expect(result.token).toMatch(/^gmcp_/);
      expect(Object.keys(result).sort()).toEqual([
        'createdAt',
        'id',
        'name',
        'token',
      ]);
    });

    it('stores the sha256 hash of the issued plaintext and nothing else', async () => {
      const result = await service.create('user-1', 'Hermes laptop');

      expect(store.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Hermes laptop',
        tokenHash: hashMcpAccessToken(result.token),
      });
      expect(JSON.stringify(store.create.mock.calls[0][0])).not.toContain(
        result.token,
      );
    });

    it.each([
      ['empty name', ''],
      ['blank name', '   '],
      ['over-long name', 'n'.repeat(61)],
    ])('rejects a %s with 400 and writes nothing', async (_label, name) => {
      await expect(service.create('user-1', name)).rejects.toThrow(
        BadRequestException,
      );

      expect(store.create).not.toHaveBeenCalled();
    });

    it('rejects a missing userId with 400 and writes nothing', async () => {
      await expect(service.create('', 'Hermes laptop')).rejects.toThrow(
        BadRequestException,
      );

      expect(store.create).not.toHaveBeenCalled();
    });
  });

  describe('list — S3 shows only the caller tokens without secret material', () => {
    it('maps every stored token through toJSON, which omits token and hash', async () => {
      const result = await service.list('user-1');

      expect(store.findAllByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([
        {
          id: 'tok-1',
          name: 'Hermes laptop',
          createdAt: '2026-11-01T00:00:00.000Z',
          lastUsedAt: null,
          revokedAt: null,
        },
      ]);
      expect(JSON.stringify(result)).not.toContain('b'.repeat(64));
    });
  });

  describe('revoke — S3 foreign or missing is 404 with no change', () => {
    it('revokes the caller token by id and userId', async () => {
      await expect(service.revoke('user-1', 'tok-1')).resolves.toEqual({
        success: true,
      });

      expect(store.revoke).toHaveBeenCalledWith('tok-1', 'user-1');
    });

    it.each([
      ['a foreign token id', 'tok-other'],
      ['a missing id', 'tok-missing'],
    ])('throws NotFoundException for %s', async (_label, id) => {
      store.revoke.mockResolvedValue(false);

      await expect(service.revoke('user-1', id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verify — S2 fails closed', () => {
    it('accepts a valid token and records its use', async () => {
      const raw = 'gmcp_' + 'A'.repeat(43);
      store.findTokenByHash.mockResolvedValue({
        token: tokenOf(),
        account,
      });

      await expect(service.verify(raw)).resolves.toEqual({
        id: 'user-1',
        email: 'daniel@lascar.pe',
        role: Role.ADMIN,
      });

      expect(store.findTokenByHash).toHaveBeenCalledWith(
        hashMcpAccessToken(raw),
      );
      expect(store.markUsed).toHaveBeenCalledWith('tok-1');
    });

    it('still accepts a valid token when recording its use fails', async () => {
      store.findTokenByHash.mockResolvedValue({
        token: tokenOf(),
        account,
      });
      store.markUsed.mockRejectedValue(new Error('database unavailable'));

      await expect(service.verify('gmcp_' + 'A'.repeat(43))).resolves.toEqual({
        id: 'user-1',
        email: 'daniel@lascar.pe',
        role: Role.ADMIN,
      });
    });

    it('rejects a revoked token and records no use', async () => {
      store.findTokenByHash.mockResolvedValue({
        token: tokenOf({ revokedAt: new Date('2026-11-05T00:00:00.000Z') }),
        account,
      });

      await expect(
        service.verify('gmcp_' + 'A'.repeat(43)),
      ).resolves.toBeNull();
      expect(store.markUsed).not.toHaveBeenCalled();
    });

    it('rejects an unknown hash and records no use', async () => {
      store.findTokenByHash.mockResolvedValue(null);

      await expect(
        service.verify('gmcp_' + 'A'.repeat(43)),
      ).resolves.toBeNull();
      expect(store.markUsed).not.toHaveBeenCalled();
    });

    it.each([
      ['inactive account', { isActive: false, role: Role.ADMIN }],
      ['non-admin account', { isActive: true, role: Role.USER }],
      ['inactive non-admin', { isActive: false, role: Role.USER }],
    ])('rejects an %s and records no use', async (_label, override) => {
      store.findTokenByHash.mockResolvedValue({
        token: tokenOf(),
        account: { ...account, ...override },
      });

      await expect(
        service.verify('gmcp_' + 'A'.repeat(43)),
      ).resolves.toBeNull();
      expect(store.markUsed).not.toHaveBeenCalled();
    });

    it.each([
      ['a session JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.sig'],
      ['an empty string', ''],
      ['undefined', undefined],
      ['a non-string value', 42],
    ])(
      'rejects a malformed token %s without querying the store',
      async (_label, raw) => {
        await expect(service.verify(raw)).resolves.toBeNull();

        expect(store.findTokenByHash).not.toHaveBeenCalled();
        expect(store.markUsed).not.toHaveBeenCalled();
      },
    );
  });
});
