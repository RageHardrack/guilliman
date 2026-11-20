import { Role } from '@prisma/client';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { McpToken } from '../../domain/mcp-token.entity';
import { PrismaMcpTokenStore } from './prisma-mcp-token.store';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

const row = {
  id: 'tok-1',
  userId: 'user-1',
  name: 'Hermes laptop',
  tokenHash: 'c'.repeat(64),
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  lastUsedAt: null,
  revokedAt: null,
  user: {
    id: 'user-1',
    email: 'daniel@lascar.pe',
    role: Role.ADMIN,
    isActive: true,
  },
};

describe('PrismaMcpTokenStore (S2)', () => {
  let store: PrismaMcpTokenStore;
  let prisma: {
    mcpToken: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      mcpToken: {
        create: vi.fn().mockResolvedValue({ ...row, user: undefined }),
        findMany: vi.fn().mockResolvedValue([{ ...row, user: undefined }]),
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    store = new PrismaMcpTokenStore(prisma as unknown as PrismaService);
  });

  it('persists exactly the fields it is given and maps the row back to the domain', async () => {
    const token = await store.create({
      userId: 'user-1',
      name: 'Hermes laptop',
      tokenHash: 'c'.repeat(64),
    });

    expect(prisma.mcpToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Hermes laptop',
        tokenHash: 'c'.repeat(64),
      },
    });
    expect(token).toBeInstanceOf(McpToken);
    expect(token.tokenHash).toBe('c'.repeat(64));
  });

  it('lists only the caller rows, newest first', async () => {
    const tokens = await store.findAllByUserId('user-1');

    expect(prisma.mcpToken.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].userId).toBe('user-1');
  });

  it('looks a token up by its unique hash and returns the owning account', async () => {
    const found = await store.findTokenByHash('c'.repeat(64));

    expect(prisma.mcpToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: 'c'.repeat(64) },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    });
    expect(found).toEqual({
      token: expect.any(McpToken),
      account: {
        id: 'user-1',
        email: 'daniel@lascar.pe',
        role: Role.ADMIN,
        isActive: true,
      },
    });
  });

  it('returns null for an unknown hash without touching the account', async () => {
    prisma.mcpToken.findUnique.mockResolvedValue(null);

    await expect(store.findTokenByHash('d'.repeat(64))).resolves.toBeNull();
  });

  it('stamps lastUsedAt without rewriting the hash', async () => {
    await store.markUsed('tok-1');

    expect(prisma.mcpToken.update).toHaveBeenCalledWith({
      where: { id: 'tok-1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it('revokes only an active token, scoped to the owner', async () => {
    const revoked = await store.revoke('tok-1', 'user-1');

    // `revokedAt: null` in the filter is what keeps the first revocation time
    // from being rewritten by a second revoke (S13).
    expect(prisma.mcpToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'tok-1', userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(revoked).toBe(true);
  });

  it('keeps the original revokedAt when the owner revokes twice, writing nothing', async () => {
    // The guarded update changes zero rows because the token is already
    // revoked, and the owner still gets the same 200 answer (S13).
    prisma.mcpToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.mcpToken.count.mockResolvedValue(1);

    await expect(store.revoke('tok-1', 'user-1')).resolves.toBe(true);

    expect(prisma.mcpToken.count).toHaveBeenCalledWith({
      where: { id: 'tok-1', userId: 'user-1' },
    });
    expect(prisma.mcpToken.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.mcpToken.update).not.toHaveBeenCalled();
  });

  it.each(['foreign token', 'missing token'])(
    'reports no change for a %s without writing it',
    async (_label) => {
      prisma.mcpToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.mcpToken.count.mockResolvedValue(0);

      await expect(store.revoke('tok-1', 'other-user')).resolves.toBe(false);

      // Ownership scoping lives in both filters: zero rows read, zero written.
      expect(prisma.mcpToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'tok-1', userId: 'other-user', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.mcpToken.count).toHaveBeenCalledWith({
        where: { id: 'tok-1', userId: 'other-user' },
      });
      expect(prisma.mcpToken.update).not.toHaveBeenCalled();
    },
  );
});
