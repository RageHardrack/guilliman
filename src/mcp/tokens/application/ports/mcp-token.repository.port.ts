import { McpToken } from '../../domain/mcp-token.entity';

/**
 * The owning account as a verification needs to see it: only the fields that
 * decide whether the token may be used (S2).
 */
export interface McpTokenAccount {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface CreateMcpTokenData {
  userId: string;
  name: string;
  tokenHash: string;
}

export interface McpTokenLookup {
  token: McpToken;
  account: McpTokenAccount;
}

/**
 * Persistence port for MCP tokens. Every method is scoped or hashed: a token
 * is only ever found by its digest, and management reads and writes carry the
 * owner so a foreign id is indistinguishable from a missing one (S3).
 */
export abstract class McpTokenStorePort {
  abstract create(data: CreateMcpTokenData): Promise<McpToken>;

  abstract findAllByUserId(userId: string): Promise<McpToken[]>;

  abstract findTokenByHash(tokenHash: string): Promise<McpTokenLookup | null>;

  abstract markUsed(id: string): Promise<void>;

  /** Returns false when the id is missing or belongs to another user. */
  abstract revoke(id: string, userId: string): Promise<boolean>;
}

export const MCP_TOKEN_STORE_PORT = Symbol('McpTokenStorePort');
