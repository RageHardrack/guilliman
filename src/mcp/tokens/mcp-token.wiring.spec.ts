import { Test } from '@nestjs/testing';

import { describe, expect, it } from 'vitest';

import { McpModule } from '../mcp.module';
import { McpTokenService } from './application/mcp-token.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { MCP_TOKEN_STORE_PORT } from './application/ports/mcp-token.repository.port';
import { PrismaMcpTokenStore } from './infrastructure/adapters/prisma-mcp-token.store';
import { McpTokensController } from './infrastructure/controllers/mcp-tokens.controller';

/**
 * Wiring proof (S3): the token management stack resolves inside the real
 * McpModule graph, with the Prisma adapter bound to the store port. No
 * database call happens because the module is compiled, not initialized.
 */
describe('MCP token module wiring', () => {
  it('provides McpTokenService backed by the Prisma store port', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(McpTokensController)).toBeInstanceOf(
      McpTokensController,
    );
    expect(moduleRef.get(McpTokenService)).toBeInstanceOf(McpTokenService);
    expect(moduleRef.get(MCP_TOKEN_STORE_PORT)).toBeInstanceOf(
      PrismaMcpTokenStore,
    );
  });
});
