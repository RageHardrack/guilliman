import { Injectable } from '@nestjs/common';

import { Role } from '@prisma/client';

import { McpToken } from '../../domain/mcp-token.entity';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateMcpTokenData,
  McpTokenLookup,
  McpTokenStorePort,
} from '../../application/ports/mcp-token.repository.port';

/**
 * A stored token row as read back by this adapter. `user` is present only on
 * the verification lookup.
 */
type McpTokenRow = {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  user?: {
    id: string;
    email: string;
    role: Role;
    isActive: boolean;
  } | null;
};

@Injectable()
export class PrismaMcpTokenStore implements McpTokenStorePort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMcpTokenData): Promise<McpToken> {
    const created = await this.prisma.mcpToken.create({
      data: {
        userId: data.userId,
        name: data.name,
        tokenHash: data.tokenHash,
      },
    });

    return this.toDomain(created);
  }

  async findAllByUserId(userId: string): Promise<McpToken[]> {
    const rows = await this.prisma.mcpToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findTokenByHash(tokenHash: string): Promise<McpTokenLookup | null> {
    const row = await this.prisma.mcpToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    });

    if (!row || !row.user) {
      return null;
    }

    return {
      token: this.toDomain(row),
      account: {
        id: row.user.id,
        email: row.user.email,
        role: row.user.role,
        isActive: row.user.isActive,
      },
    };
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.mcpToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Ownership-scoped update: a foreign or missing id changes zero rows, so the
   * caller sees 404 and no write happens (S3). Revoking twice is idempotent
   * for the owner.
   */
  async revoke(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.mcpToken.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });

    return result.count > 0;
  }

  private toDomain(row: McpTokenRow): McpToken {
    return new McpToken({
      id: row.id,
      userId: row.userId,
      name: row.name,
      tokenHash: row.tokenHash,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
    });
  }
}
