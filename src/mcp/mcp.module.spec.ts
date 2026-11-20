import { Test } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { describe, expect, it } from 'vitest';

import { McpModule } from './mcp.module';
import { McpServerFactory } from './mcp-server.factory';
import { McpTokenAuthGuard } from './guards/mcp-token-auth.guard';
import { McpHttpController } from './controllers/mcp-http.controller';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { McpTokensController } from './tokens/infrastructure/controllers/mcp-tokens.controller';

/**
 * Wiring proof (S4, S7): the Streamable HTTP controller and its token guard
 * resolve inside the real McpModule graph, and the SSE routes are gone. The
 * module is compiled, never initialized, so no database is touched.
 */
describe('MCP module wiring', () => {
  it('registra la ruta HTTP MCP con su guard y la fábrica de servidores', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(McpHttpController)).toBeInstanceOf(McpHttpController);
    expect(moduleRef.get(McpTokenAuthGuard)).toBeInstanceOf(McpTokenAuthGuard);
    expect(moduleRef.get(McpServerFactory)).toBeInstanceOf(McpServerFactory);
    expect(moduleRef.get(McpTokensController)).toBeInstanceOf(
      McpTokensController,
    );
  });

  it('declara solo mcp como controlador MCP expuesto por HTTP', async () => {
    const controllers = (Reflect.getMetadata('controllers', McpModule) ??
      []) as unknown[];

    expect(controllers).toContain(McpHttpController);
    expect(controllers).toContain(McpTokensController);
    expect(controllers).toHaveLength(2);
  });

  it('monta POST, GET y DELETE sobre /mcp, sin rutas sse ni messages', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, McpHttpController) as string,
    ).toBe('mcp');

    const controllers = (Reflect.getMetadata('controllers', McpModule) ??
      []) as unknown[];
    const routes = controllers.flatMap((controller) => {
      const shape = controller as { prototype: object; name: string };
      const prefix = Reflect.getMetadata(PATH_METADATA, controller) as string;
      return Object.getOwnPropertyNames(shape.prototype).flatMap((handler) => {
        const fn = shape.prototype[handler as keyof object] as unknown;
        if (typeof fn !== 'function') {
          return [];
        }
        const method = Reflect.getMetadata(METHOD_METADATA, fn);
        if (typeof method !== 'number') {
          return [];
        }
        const suffix = Reflect.getMetadata(PATH_METADATA, fn) as
          string | undefined;
        const joined =
          suffix === undefined || suffix === '/'
            ? `/${prefix}`
            : `/${prefix}/${suffix.replace(/^\//, '')}`;
        return [`${RequestMethod[method]} ${joined}`];
      });
    });

    expect(routes.sort()).toEqual(
      [
        'DELETE /mcp',
        'GET /mcp',
        'GET /mcp/tokens',
        'POST /mcp',
        'POST /mcp/tokens',
        'DELETE /mcp/tokens/:id',
      ].sort(),
    );
    expect(routes).not.toContain('GET /mcp/sse');
    expect(routes).not.toContain('POST /mcp/messages');
  });
});
