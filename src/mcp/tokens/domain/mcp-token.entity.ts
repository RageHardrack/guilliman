/**
 * Domain-level invariant violation. The application service maps it to HTTP
 * 400; nothing here depends on NestJS or Prisma.
 */
export class McpTokenDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpTokenDomainError';
  }
}

export const MCP_TOKEN_NAME_MAX_LENGTH = 60;

export interface McpTokenProps {
  id?: string;
  userId: string;
  name: unknown;
  tokenHash: string;
  createdAt?: Date;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
}

/**
 * A revocable MCP access token belonging to one user (S2, S3). It holds the
 * hash only: the plaintext exists exclusively in the create response.
 */
export class McpToken {
  readonly id?: string;
  readonly userId: string;
  readonly name: string;
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
  readonly revokedAt: Date | null;

  constructor(props: McpTokenProps) {
    if (!props.userId || props.userId.trim() === '') {
      throw new McpTokenDomainError('MCP token userId is required');
    }
    const name = typeof props.name === 'string' ? props.name.trim() : undefined;
    if (
      name === undefined ||
      name === '' ||
      name.length > MCP_TOKEN_NAME_MAX_LENGTH
    ) {
      throw new McpTokenDomainError(
        `MCP token name is required and must be at most ${MCP_TOKEN_NAME_MAX_LENGTH} characters`,
      );
    }
    if (!props.tokenHash) {
      throw new McpTokenDomainError('MCP token hash is required');
    }

    this.id = props.id;
    this.userId = props.userId.trim();
    this.name = name;
    this.tokenHash = props.tokenHash;
    this.createdAt = props.createdAt ?? new Date();
    this.lastUsedAt = props.lastUsedAt ?? null;
    this.revokedAt = props.revokedAt ?? null;
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /**
   * Management view for the API (S3): never the plaintext, never the hash,
   * never the owning userId.
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      lastUsedAt: this.lastUsedAt ? this.lastUsedAt.toISOString() : null,
      revokedAt: this.revokedAt ? this.revokedAt.toISOString() : null,
    };
  }
}
