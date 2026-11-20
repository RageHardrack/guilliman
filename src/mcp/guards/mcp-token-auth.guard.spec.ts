import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { Role } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { McpTokenAuthGuard } from './mcp-token-auth.guard';
import { McpTokenService } from '../tokens/application/mcp-token.service';

const OWNER = { id: 'owner-1', email: 'owner@lascar.pe', role: Role.ADMIN };

/**
 * S4/S5: the HTTP MCP route authenticates with an MCP token only. A request
 * without a well-formed `Authorization: Bearer` header is rejected before
 * `McpTokenService.verify` is reached, so no DB lookup and no tool can run.
 */
describe('McpTokenAuthGuard', () => {
  let guard: McpTokenAuthGuard;
  let tokens: { verify: ReturnType<typeof vi.fn> };
  let request: { headers: Record<string, string> };

  beforeEach(() => {
    tokens = { verify: vi.fn().mockResolvedValue(OWNER) };
    guard = new McpTokenAuthGuard(tokens as unknown as McpTokenService);
    request = { headers: {} };
  });

  const context = () =>
    ({
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('rechaza sin encabezado Authorization y sin consultar verify', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokens.verify).not.toHaveBeenCalled();
  });

  it.each([['Basic b3duZXI6c2VjcmV0'], ['bearer'], ['Bearer '], [OWNER.id]])(
    'rechaza un encabezado que no es Bearer con token: %p',
    async (value) => {
      request.headers.authorization = value;

      await expect(guard.canActivate(context())).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokens.verify).not.toHaveBeenCalled();
    },
  );

  it('acepta el esquema Bearer sin distinción de mayúsculas', async () => {
    request.headers.authorization = 'bearer gmcp_token';

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(tokens.verify).toHaveBeenCalledWith('gmcp_token');
  });

  it('adjunta el usuario verificado al request', async () => {
    request.headers.authorization = 'Bearer gmcp_token';

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect((request as unknown as { mcpActor: typeof OWNER }).mcpActor).toEqual(
      OWNER,
    );
  });

  it.each([['inexistente'], ['revocado'], ['JWT de sesión']])(
    'rechaza un token %p: verify devuelve null y no se adjunta usuario',
    async () => {
      request.headers.authorization = 'Bearer gmcp_token';
      tokens.verify.mockResolvedValue(null);

      await expect(guard.canActivate(context())).rejects.toThrow(
        UnauthorizedException,
      );
      expect(request).not.toHaveProperty('mcpActor');
    },
  );

  it('no deja escapar un fallo inesperado de verify como acceso concedido', async () => {
    request.headers.authorization = 'Bearer gmcp_token';
    tokens.verify.mockRejectedValue(new Error('store down'));

    await expect(guard.canActivate(context())).rejects.toThrow('store down');
    expect(
      (request as unknown as { mcpActor?: unknown }).mcpActor,
    ).toBeUndefined();
  });

  it('usa la cabecera de Fastify tipada, sin leer el cuerpo', async () => {
    request.headers.authorization = 'Bearer gmcp_token';
    const ctx = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request as unknown as FastifyRequest,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
