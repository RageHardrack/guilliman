import { describe, expect, it } from 'vitest';

import {
  MCP_TOKEN_PREFIX,
  generateMcpAccessToken,
  hashMcpAccessToken,
  isMcpAccessTokenWellFormed,
} from './mcp-access-token';

describe('MCP access token codec (S2)', () => {
  it('issues tokens with the recognizable prefix', () => {
    const token = generateMcpAccessToken();

    expect(token.startsWith(`${MCP_TOKEN_PREFIX}`)).toBe(true);
  });

  it('issues 32 bytes of base64url entropy after the prefix', () => {
    const token = generateMcpAccessToken();
    const entropy = token.slice(MCP_TOKEN_PREFIX.length);

    // 32 random bytes encode to 43 base64url characters (no padding).
    expect(entropy).toHaveLength(43);
    expect(entropy).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('never issues the same token twice', () => {
    const issued = new Set<string>();

    for (let i = 0; i < 500; i += 1) {
      issued.add(generateMcpAccessToken());
    }

    expect(issued.size).toBe(500);
  });

  it('hashes to a stable lowercase sha256 hex digest', () => {
    const token = generateMcpAccessToken();

    expect(hashMcpAccessToken(token)).toBe(hashMcpAccessToken(token));
    expect(hashMcpAccessToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashMcpAccessToken('gmcp_other')).not.toBe(
      hashMcpAccessToken(token),
    );
  });

  it('accepts a well-formed token', () => {
    expect(isMcpAccessTokenWellFormed(generateMcpAccessToken())).toBe(true);
  });

  it.each([
    ['a session JWT', 'eyJhbGciOiJIUzI1NiJ9.payload.signature'],
    ['the bare prefix', 'gmcp_'],
    ['a wrong prefix', 'abcd_' + 'A'.repeat(43)],
    ['short entropy', 'gmcp_' + 'A'.repeat(42)],
    ['long entropy', 'gmcp_' + 'A'.repeat(44)],
    ['padding characters', 'gmcp_' + 'A'.repeat(42) + '='],
    ['non base64url characters', 'gmcp_' + 'a'.repeat(41) + '+/'],
    ['leading whitespace', ' ' + 'gmcp_' + 'A'.repeat(43)],
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an object', { token: 'gmcp_' + 'A'.repeat(43) }],
  ])('rejects a malformed token: %s', (_label, value) => {
    expect(isMcpAccessTokenWellFormed(value)).toBe(false);
  });
});
