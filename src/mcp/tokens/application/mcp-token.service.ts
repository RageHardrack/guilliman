import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Role } from '@prisma/client';

import { McpToken, McpTokenDomainError } from '../domain/mcp-token.entity';
import {
  McpTokenStorePort,
  MCP_TOKEN_STORE_PORT,
} from './ports/mcp-token.repository.port';
import {
  generateMcpAccessToken,
  hashMcpAccessToken,
  isMcpAccessTokenWellFormed,
} from '../domain/mcp-access-token';

/**
 * The account a verified token resolves to, for the MCP transport to bind to
 * (S5 in T2 reads it; nothing here resolves a user from env or "first ADMIN").
 */
export interface McpVerifiedAccount {
  id: string;
  email: string;
  role: string;
}

/**
 * MCP access token management and verification (S2, S3). `verify` is the
 * single entry point the MCP HTTP guard calls.
 */
@Injectable()
export class McpTokenService {
  constructor(
    @Inject(MCP_TOKEN_STORE_PORT)
    private readonly store: McpTokenStorePort,
  ) {}

  /**
   * Issues a new token for the caller. The plaintext is returned here and
   * only here; the store receives its sha256 digest.
   */
  async create(userId: string, name: unknown) {
    const plaintext = generateMcpAccessToken();
    const draft = this.buildDraft({ userId, name, plaintext });

    const created = await this.store.create({
      userId: draft.userId,
      name: draft.name,
      tokenHash: hashMcpAccessToken(plaintext),
    });

    return {
      id: created.id,
      name: created.name,
      createdAt: created.createdAt.toISOString(),
      token: plaintext,
    };
  }

  /** The caller's own tokens, without any secret material (S3). */
  async list(userId: string) {
    const tokens = await this.store.findAllByUserId(userId);

    return tokens.map((token) => token.toJSON());
  }

  /**
   * Revokes one of the caller's tokens. A foreign or missing id is a 404 and
   * leaves every row untouched (S3).
   */
  async revoke(userId: string, id: string) {
    const revoked = await this.store.revoke(id, userId);
    if (!revoked) {
      throw new NotFoundException('MCP token not found');
    }

    return { success: true };
  }

  /**
   * Resolves the owning account of an MCP token, or null. Fails closed on a
   * malformed value, an unknown hash, a revoked token, or an owner that is no
   * longer an active ADMIN (S2). On success the token's last use is recorded.
   */
  async verify(rawToken: unknown): Promise<McpVerifiedAccount | null> {
    if (!isMcpAccessTokenWellFormed(rawToken)) {
      return null;
    }

    const found = await this.store.findTokenByHash(
      hashMcpAccessToken(rawToken),
    );
    if (!found || found.token.isRevoked()) {
      return null;
    }

    const { token, account } = found;
    if (!account.isActive || account.role !== Role.ADMIN) {
      return null;
    }

    await this.store.markUsed(token.id as string);

    return { id: account.id, email: account.email, role: account.role };
  }

  /**
   * Validates through the domain entity before any write, so a rejected name
   * can never leave a stored hash behind.
   */
  private buildDraft(props: {
    userId: string;
    name: unknown;
    plaintext: string;
  }): McpToken {
    try {
      return new McpToken({
        userId: props.userId,
        name: props.name,
        tokenHash: hashMcpAccessToken(props.plaintext),
      });
    } catch (error) {
      if (error instanceof McpTokenDomainError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
