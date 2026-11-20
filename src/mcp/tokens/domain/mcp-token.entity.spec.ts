import { describe, expect, it } from 'vitest';

import { McpToken } from './mcp-token.entity';
import { McpTokenDomainError } from './mcp-token.entity';

const props = {
  userId: 'user-1',
  name: 'Hermes laptop',
  tokenHash: 'a'.repeat(64),
};

describe('McpToken domain entity (S2, S3)', () => {
  it('keeps a valid token', () => {
    const token = new McpToken(props);

    expect(token.userId).toBe('user-1');
    expect(token.name).toBe('Hermes laptop');
    expect(token.tokenHash).toBe('a'.repeat(64));
    expect(token.isRevoked()).toBe(false);
  });

  it('trims the name', () => {
    expect(new McpToken({ ...props, name: '  Hermes  ' }).name).toBe('Hermes');
  });

  it.each([
    ['empty name', ''],
    ['blank name', '   '],
    ['non-string name', 42],
    ['name longer than 60 characters', 'n'.repeat(61)],
  ])('rejects it: %s', (_label, name) => {
    expect(() => new McpToken({ ...props, name })).toThrow(McpTokenDomainError);
  });

  it.each([
    ['missing userId', { userId: '', tokenHash: 'a'.repeat(64) }],
    ['missing tokenHash', { userId: 'user-1', tokenHash: '' }],
  ])('rejects a %s', (_label, override) => {
    expect(() => new McpToken({ ...props, ...override })).toThrow(
      McpTokenDomainError,
    );
  });

  it('marks a token with revokedAt as revoked and a past one stays revoked', () => {
    expect(
      new McpToken({
        ...props,
        revokedAt: new Date('2026-11-01T00:00:00Z'),
      }).isRevoked(),
    ).toBe(true);
  });

  it('never exposes the hash or a plaintext token over JSON (S3)', () => {
    const json = new McpToken({
      ...props,
      id: 'tok-1',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      lastUsedAt: new Date('2026-11-02T00:00:00.000Z'),
    }).toJSON();

    expect(json).toEqual({
      id: 'tok-1',
      name: 'Hermes laptop',
      createdAt: '2026-11-01T00:00:00.000Z',
      lastUsedAt: '2026-11-02T00:00:00.000Z',
      revokedAt: null,
    });
    expect(JSON.stringify(json)).not.toContain('a'.repeat(64));
    expect(Object.keys(json)).not.toContain('tokenHash');
    expect(Object.keys(json)).not.toContain('token');
  });
});
