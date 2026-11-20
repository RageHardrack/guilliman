import { createHash, randomBytes } from 'node:crypto';

/**
 * Recognizable prefix of a Guilliman MCP access token, so a leaked value in
 * a log or shell history is immediately identifiable as an MCP credential and
 * never confused with a session JWT (S2).
 */
export const MCP_TOKEN_PREFIX = 'gmcp_';

/** 32 random bytes, base64url encoded without padding. */
const MCP_TOKEN_ENTROPY_BYTES = 32;
const MCP_TOKEN_ENTROPY_LENGTH = 43;

const WELL_FORMED_TOKEN = new RegExp(
  `^${MCP_TOKEN_PREFIX}[A-Za-z0-9_-]{${MCP_TOKEN_ENTROPY_LENGTH}}$`,
);

/**
 * Issues a fresh high-entropy token. The plaintext exists only in the return
 * value of `create`; the caller stores `hashMcpAccessToken` of it and never
 * the plaintext (S2, S3).
 */
export function generateMcpAccessToken(): string {
  const entropy = randomBytes(MCP_TOKEN_ENTROPY_BYTES).toString('base64url');

  return `${MCP_TOKEN_PREFIX}${entropy}`;
}

/**
 * The single digest used for both storage and lookup: sha256 hex over the
 * full token string. Comparison is done by this lookup, never by comparing
 * plaintexts.
 */
export function hashMcpAccessToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Structural check before any database work, so a session JWT or garbage
 * header never reaches the hash lookup (S2).
 */
export function isMcpAccessTokenWellFormed(value: unknown): value is string {
  return typeof value === 'string' && WELL_FORMED_TOKEN.test(value);
}
