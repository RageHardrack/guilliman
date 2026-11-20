import { Test } from '@nestjs/testing';

import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

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

// Guilliman has no Prisma migrations: production syncs the schema with
// `prisma db push` before the server starts, which is what creates the
// `mcp_tokens` table. That deploy contract is pinned here.
describe('mcp_tokens deploy schema sync', () => {
  const root = join(__dirname, '..', '..', '..');
  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> };

  it('pushes the Prisma schema before starting the production server', () => {
    const startProd = packageJson.scripts['start:prod'];

    expect(startProd).toMatch(/^bun x prisma db push && /);
    expect(startProd.indexOf('prisma db push')).toBeLessThan(
      startProd.indexOf('dist/src/main.js'),
    );
  });

  it('keeps db push as the only schema sync, with no migrations folder', () => {
    expect(existsSync(join(root, 'prisma', 'migrations'))).toBe(false);
  });

  it('declares the mcp_tokens table in the pushed schema', () => {
    const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');

    expect(schema).toMatch(/model McpToken \{[\s\S]*@@map\("mcp_tokens"\)/);
  });
});
