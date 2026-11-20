import { User, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { FiscalTools } from './tools/fiscal.tools';
import { McpAuthService } from './mcp-auth.service';
import { FinanceTools } from './tools/finance.tools';
import { McpServerFactory } from './mcp-server.factory';
import { McpServerService } from './mcp-server.service';
import {
  MCP_ALL_TOOL_NAMES,
  MCP_READ_ONLY_TOOL_NAMES,
} from './mcp-server.factory';

const ENV_ADMIN: User = {
  id: 'env-admin',
  email: 'admin@lascar.pe',
  name: 'Env Admin',
  password: 'hash',
  role: Role.ADMIN,
  isActive: true,
  taxProfileEnabled: true,
  taxCountry: 'PE',
  taxRuc: '10705438233',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * S7: `bun run mcp:start` keeps its behavior — the env / first-ADMIN user and
 * all seven tools, now built by the same factory the HTTP route uses.
 */
describe('McpServerService (stdio)', () => {
  let authService: McpAuthService;
  let fiscalTools: FiscalTools;
  let financeTools: FinanceTools;
  let service: McpServerService;

  beforeEach(() => {
    authService = {
      getAdminUserContext: vi.fn().mockResolvedValue(ENV_ADMIN),
    } as unknown as McpAuthService;

    fiscalTools = {
      getFiscalSummary: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"fiscalYear":2026}' }],
      }),
      getMonthlyTaxChecklist: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
      }),
      simulateTaxScenario: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
      }),
    } as unknown as FiscalTools;

    financeTools = {
      getNetWorthAndLiquidity: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
      }),
      getBudgetAudit: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
      }),
      createTransaction: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"transaction":{}}' }],
      }),
      recordDebtPayment: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"loan_status":"PAID"}' }],
      }),
    } as unknown as FinanceTools;

    service = new McpServerService(
      authService,
      new McpServerFactory(fiscalTools, financeTools),
    );
  });

  it('expone las 7 herramientas al usuario resuelto por el entorno', async () => {
    const [clientLeg, serverLeg] = InMemoryTransport.createLinkedPair();
    await service.startStdioServer(serverLeg);

    const client = new Client({ name: 'stdio-spec', version: '1.0.0' });
    await client.connect(clientLeg);

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...MCP_ALL_TOOL_NAMES].sort(),
    );
    expect(MCP_ALL_TOOL_NAMES).toHaveLength(7);
    expect(
      tools
        .map((tool) => tool.name)
        .filter((name) => name.startsWith('tique_')),
    ).toHaveLength(7);

    await client.callTool({
      name: 'tique_create_transaction',
      arguments: {
        account_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6e',
        amount: 10,
        currency: 'PEN',
        type: 'EXPENSE',
        description: 'stdio sigue escribiendo',
      },
    });

    expect(authService.getAdminUserContext).toHaveBeenCalled();
    expect(financeTools.createTransaction).toHaveBeenCalledWith(
      ENV_ADMIN,
      expect.objectContaining({ amount: 10 }),
    );
  });

  it('el modo stdio no es de solo lectura: incluye las 5 de lectura además', async () => {
    const [clientLeg, serverLeg] = InMemoryTransport.createLinkedPair();
    await service.startStdioServer(serverLeg);
    const client = new Client({ name: 'stdio-spec-2', version: '1.0.0' });
    await client.connect(clientLeg);

    const names = (await client.listTools()).tools.map((tool) => tool.name);
    for (const readOnly of MCP_READ_ONLY_TOOL_NAMES) {
      expect(names).toContain(readOnly);
    }
  });
});
