import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { Role, User } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { McpModule } from '../mcp.module';
import { FiscalTools } from '../tools/fiscal.tools';
import { registerBodyParsers } from '../../body-parsers';
import { McpToken } from '../tokens/domain/mcp-token.entity';
import { MCP_READ_ONLY_TOOL_NAMES } from '../mcp-server.factory';
import { hashMcpAccessToken } from '../tokens/domain/mcp-access-token';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { MCP_TOKEN_STORE_PORT } from '../tokens/application/ports/mcp-token.repository.port';

const OWNER_A: User = user('owner-a', 'a@lascar.pe');
const OWNER_B: User = user('owner-b', 'b@lascar.pe');

const TOKEN_A = `gmcp_${'a'.repeat(43)}`;
const TOKEN_B = `gmcp_${'b'.repeat(43)}`;
const TOKEN_REVOKED = `gmcp_${'c'.repeat(43)}`;

const HEADERS = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
};

function user(id: string, email: string): User {
  return {
    id,
    email,
    name: id,
    password: 'hash',
    role: Role.ADMIN,
    isActive: true,
    taxProfileEnabled: true,
    taxCountry: 'PE',
    taxRuc: '10705438233',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const rpc = (id: number, method: string, params: unknown) =>
  JSON.stringify({ jsonrpc: '2.0', id, method, params });

/** A stored token row with its owning account, as the store port returns it. */
type FakeLookup = {
  token: McpToken;
  account: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
};

function lookup(
  id: string,
  owner: User,
  hash: string,
  revoked = false,
): FakeLookup {
  return {
    token: new McpToken({
      id,
      userId: owner.id,
      name: 'Hermes',
      tokenHash: hash,
      revokedAt: revoked ? new Date('2026-11-01T00:00:00.000Z') : null,
    }),
    account: {
      id: owner.id,
      email: owner.email,
      role: owner.role,
      isActive: true,
    },
  };
}

/**
 * S2/S4/S5/S6/S7 over the real HTTP surface and the real module graph: the
 * genuine `McpTokenService.verify` guards the route, which answers only with
 * the five read tools and always as the token owner. Only Prisma and the token
 * store are faked, so no database is touched.
 */
describe('POST /api/v1/mcp (Streamable HTTP, stateless)', () => {
  let app: NestFastifyApplication;
  let adapter: FastifyAdapter;
  let fiscalTools: FiscalTools;
  let prisma: Record<string, unknown>;
  let findTokenByHash: ReturnType<typeof vi.fn>;
  let markUsed: ReturnType<typeof vi.fn>;

  const post = (body: string, token?: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/mcp',
      headers: {
        ...HEADERS,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      payload: body,
    });

  const callTool = (
    id: number,
    name: string,
    args: Record<string, unknown>,
    token: string,
  ) => post(rpc(id, 'tools/call', { name, arguments: args }), token);

  beforeEach(async () => {
    // Production body parsers, so a malformed POST body reaches the transport
    // as text instead of dying inside Fastify.
    adapter = new FastifyAdapter();
    registerBodyParsers(adapter);

    // S5: neither env identity may ever reach a tool over HTTP.
    process.env.MCP_USER_ID = 'env-user-must-be-ignored';
    process.env.MCP_USER_EMAIL = 'env@lascar.pe';

    findTokenByHash = vi.fn(async (hash: string) => {
      if (hash === hashMcpAccessToken(TOKEN_A)) {
        return lookup('token-a', OWNER_A, hash);
      }
      if (hash === hashMcpAccessToken(TOKEN_B)) {
        return lookup('token-b', OWNER_B, hash);
      }
      if (hash === hashMcpAccessToken(TOKEN_REVOKED)) {
        return lookup('token-r', OWNER_A, hash, true);
      }
      return null;
    });
    markUsed = vi.fn().mockResolvedValue(undefined);

    // The real FinanceTools over a mocked Prisma: the no-write and owner-scope
    // claims are then proven at the database boundary, not at a stub.
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      account: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      loan: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      loanPayment: { create: vi.fn() },
      transaction: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      },
      category: { findFirst: vi.fn() },
      $transaction: vi.fn(),
    };

    fiscalTools = {
      getFiscalSummary: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"fiscalYear":2026}' }],
      }),
      getMonthlyTaxChecklist: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"period":"2026-09"}' }],
      }),
      simulateTaxScenario: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"taxableIncomeDifference":1000}' }],
      }),
    } as unknown as FiscalTools;

    const moduleRef = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(MCP_TOKEN_STORE_PORT)
      .useValue({ findTokenByHash, markUsed })
      .overrideProvider(FiscalTools)
      .useValue(fiscalTools)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    delete process.env.MCP_USER_ID;
    delete process.env.MCP_USER_EMAIL;
    await app.close();
  });

  it('negocia initialize sin sesión y sin Mcp-Session-Id', async () => {
    const res = await post(
      rpc(1, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'hermes', version: '1' },
      }),
      TOKEN_A,
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers['mcp-session-id']).toBeUndefined();
    const body = JSON.parse(res.payload);
    expect(body.result.serverInfo.name).toBe('guilliman-tique-mcp');
    expect(body.result.protocolVersion).toBe('2025-06-18');
  });

  it('tools/list expone exactamente las 5 herramientas de lectura', async () => {
    const res = await post(rpc(2, 'tools/list', {}), TOKEN_A);

    expect(res.statusCode).toBe(200);
    const names: string[] = JSON.parse(res.payload).result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    expect([...names].sort()).toEqual([...MCP_READ_ONLY_TOOL_NAMES].sort());
    expect(names).toHaveLength(5);
    expect(names).not.toContain('tique_create_transaction');
    expect(names).not.toContain('tique_record_debt_payment');
  });

  it('tools/call consulta solo los datos del dueño del token, no por env', async () => {
    const res = await callTool(
      3,
      'tique_get_net_worth_and_liquidity',
      { base_currency: 'PEN' },
      TOKEN_B,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).result.isError).toBeFalsy();
    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: OWNER_B.id },
    });
    expect(prisma.loan.findMany).toHaveBeenCalledWith({
      where: {
        userId: OWNER_B.id,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
      },
      include: { payments: true },
    });
    // No MCP_USER_ID / MCP_USER_EMAIL / first-ADMIN lookup happened.
    expect(prisma.user).toEqual(
      expect.objectContaining({
        findUnique: expect.any(Function),
        findFirst: expect.any(Function),
      }),
    );
    expect(
      (prisma.user as { findUnique: ReturnType<typeof vi.fn> }).findUnique,
    ).not.toHaveBeenCalled();
    expect(
      (prisma.user as { findFirst: ReturnType<typeof vi.fn> }).findFirst,
    ).not.toHaveBeenCalled();
  });

  it('los dos dueños obtienen cada uno su propio userId', async () => {
    await callTool(4, 'tique_get_budget_audit', { period: '2026-09' }, TOKEN_A);
    await callTool(5, 'tique_get_budget_audit', { period: '2026-09' }, TOKEN_B);

    const calls = (
      prisma.transaction.findMany as ReturnType<typeof vi.fn>
    ).mock.calls.map(
      ([query]) => (query as { where: { userId: string } }).where.userId,
    );
    expect(calls).toEqual([OWNER_A.id, OWNER_B.id]);
    expect(calls).not.toContain('env-user-must-be-ignored');
  });

  it('cada herramienta de lectura recibe al dueño del token', async () => {
    await callTool(
      6,
      'tique_get_fiscal_summary',
      { fiscal_year: 2026 },
      TOKEN_A,
    );
    await callTool(
      7,
      'tique_get_fiscal_summary',
      { fiscal_year: 2026 },
      TOKEN_B,
    );

    const actors = vi
      .mocked(fiscalTools.getFiscalSummary)
      .mock.calls.map(([actor]) => actor.id);
    expect(actors).toEqual([OWNER_A.id, OWNER_B.id]);
  });

  it('las herramientas de escritura no existen: ni lista ni llamada, y no escriben', async () => {
    const write = await callTool(
      8,
      'tique_create_transaction',
      {
        account_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6e',
        amount: 10,
        currency: 'PEN',
        type: 'EXPENSE',
        description: 'intento de escritura',
      },
      TOKEN_A,
    );
    expect(JSON.parse(write.payload).result.isError).toBe(true);

    const debt = await callTool(
      9,
      'tique_record_debt_payment',
      {
        source_account_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6e',
        target_debt_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6f',
        amount: 25,
        currency: 'PEN',
      },
      TOKEN_A,
    );
    expect(JSON.parse(debt.payload).result.isError).toBe(true);

    // Neither attempt reached the database.
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(
      (prisma.transaction as { create: ReturnType<typeof vi.fn> }).create,
    ).not.toHaveBeenCalled();
    expect(
      (prisma.loanPayment as { create: ReturnType<typeof vi.fn> }).create,
    ).not.toHaveBeenCalled();
    expect(
      (prisma.account as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
    expect(
      (prisma.loan as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });

  it('sin encabezado: 401, sin lookup de token y sin ejecutar nada', async () => {
    const res = await callTool(
      10,
      'tique_get_fiscal_summary',
      { fiscal_year: 2026 },
      // no header below
    );

    expect(res.statusCode).toBe(401);
    expect(findTokenByHash).not.toHaveBeenCalled();
    expect(fiscalTools.getFiscalSummary).not.toHaveBeenCalled();
  });

  it.each([
    ['Bearer mal formado', 'Basic b3duZXI6c2VjcmV0'],
    ['JWT de sesión', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lci1hIn0.sig'],
    ['token inexistente', `gmcp_${'z'.repeat(43)}`],
    ['token revocado', TOKEN_REVOKED],
  ])('rechaza %p con 401 y sin ejecutar herramientas', async (_l, raw) => {
    const res = await callTool(
      11,
      'tique_get_net_worth_and_liquidity',
      { base_currency: 'USD' },
      raw,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).message).toBeDefined();
    expect(prisma.account.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('un token válido registra su último uso y responde con datos del dueño', async () => {
    await callTool(
      12,
      'tique_get_monthly_tax_checklist',
      { period: '2026-09' },
      TOKEN_A,
    );

    expect(markUsed).toHaveBeenCalledWith('token-a');
    expect(fiscalTools.getMonthlyTaxChecklist).toHaveBeenCalledWith(
      { id: OWNER_A.id, email: OWNER_A.email, role: OWNER_A.role },
      { period: '2026-09' },
    );
  });

  it('GET y DELETE responden 405 con Allow y error JSON-RPC', async () => {
    for (const method of ['GET', 'DELETE'] as const) {
      const res = await app.inject({
        method,
        url: '/api/v1/mcp',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${TOKEN_A}`,
        },
      });

      expect(res.statusCode).toBe(405);
      expect(res.headers.allow).toBe('POST');
      const body = JSON.parse(res.payload);
      expect(body.jsonrpc).toBe('2.0');
      expect(body.error.code).toBe(-32000);
      expect(body.error.message).toBe('Method not allowed.');
    }
  });

  it('GET sin token se rechaza con 401 antes que con 405', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/mcp' });
    expect(res.statusCode).toBe(401);
  });

  it.each([
    ['GET', '/api/v1/mcp/sse'],
    ['POST', '/api/v1/mcp/messages?sessionId=x'],
  ])('S7: %s %p ya no existe', async (method, url) => {
    const res = await app.inject({
      method: method as 'GET' | 'POST',
      url,
      headers: { ...HEADERS, authorization: `Bearer ${TOKEN_A}` },
      payload: rpc(13, 'tools/list', {}),
    });
    expect(res.statusCode).toBe(404);
  });

  it.each([
    ['JSON válido que no es JSON-RPC', '{"hello":"world"}'],
    ['JSON mal formado', '{ no es json-rpc'],
  ])(
    'un request roto (%s) responde 400 sin dejar transporte colgado',
    async (_label, body) => {
      const res = await post(body, TOKEN_A);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error.message).toContain('Parse error');
    },
  );
});
