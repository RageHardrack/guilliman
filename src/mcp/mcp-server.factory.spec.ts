import { User, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { FiscalTools } from './tools/fiscal.tools';
import { FinanceTools } from './tools/finance.tools';
import {
  MCP_ALL_TOOL_NAMES,
  MCP_READ_ONLY_TOOL_NAMES,
  McpServerFactory,
} from './mcp-server.factory';

const OWNER: User = {
  id: 'owner-1',
  email: 'owner@lascar.pe',
  name: 'Owner',
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
 * S5/S6: one server per caller, built around that caller's user. The read-only
 * tool set is the HTTP surface; the full set stays for stdio.
 */
describe('McpServerFactory', () => {
  let fiscalTools: FiscalTools;
  let financeTools: FinanceTools;
  let factory: McpServerFactory;

  beforeEach(() => {
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

    financeTools = {
      getNetWorthAndLiquidity: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"net_worth_by_currency":{}}' }],
      }),
      getBudgetAudit: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"period":"2026-09"}' }],
      }),
      createTransaction: vi.fn(),
      recordDebtPayment: vi.fn(),
    } as unknown as FinanceTools;

    factory = new McpServerFactory(fiscalTools, financeTools);
  });

  /** Talks to a factory-built server through the real MCP protocol. */
  async function connect(
    toolset: Parameters<McpServerFactory['createServer']>[1],
  ): Promise<Client> {
    const server = factory.createServer(OWNER, toolset);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: 'spec-client', version: '1.0.0' });
    await client.connect(clientTransport);
    return client;
  }

  it('registra exactamente las 5 herramientas de lectura', async () => {
    const client = await connect('read-only');

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...MCP_READ_ONLY_TOOL_NAMES].sort(),
    );
    expect(MCP_READ_ONLY_TOOL_NAMES).toHaveLength(5);
  });

  it('registra las 7 herramientas para stdio', async () => {
    const client = await connect('stdio');

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...MCP_ALL_TOOL_NAMES].sort(),
    );
    expect(MCP_ALL_TOOL_NAMES).toHaveLength(7);
  });

  it('ejecuta las herramientas de lectura como el usuario del servidor', async () => {
    const client = await connect('read-only');

    const netWorth = await client.callTool({
      name: 'tique_get_net_worth_and_liquidity',
      arguments: { base_currency: 'PEN' },
    });
    expect(netWorth.isError).not.toBe(true);
    expect(financeTools.getNetWorthAndLiquidity).toHaveBeenCalledWith(OWNER, {
      base_currency: 'PEN',
    });

    const summary = await client.callTool({
      name: 'tique_get_fiscal_summary',
      arguments: { fiscal_year: 2026 },
    });
    expect(summary.isError).not.toBe(true);
    expect(fiscalTools.getFiscalSummary).toHaveBeenCalledWith(OWNER, {
      fiscal_year: 2026,
    });
  });

  it('oculta las herramientas de escritura en modo lectura: fallan sin ejecutar nada', async () => {
    const client = await connect('read-only');

    const attempt = await client.callTool({
      name: 'tique_create_transaction',
      arguments: {
        account_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6e',
        amount: 12.5,
        currency: 'PEN',
        type: 'EXPENSE',
        description: 'no debe escribirse',
      },
    });
    expect(attempt.isError).toBe(true);
    expect(financeTools.createTransaction).not.toHaveBeenCalled();

    const debt = await client.callTool({
      name: 'tique_record_debt_payment',
      arguments: {
        source_account_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6e',
        target_debt_id: '2f6f0b7c-3a2b-4a3e-9b41-9c2a3b4c5d6f',
        amount: 50,
        currency: 'PEN',
      },
    });
    expect(debt.isError).toBe(true);
    expect(financeTools.recordDebtPayment).not.toHaveBeenCalled();
  });

  it('dos servidores con usuarios distintos no comparten estado ni identidad', async () => {
    const other: User = { ...OWNER, id: 'owner-2', email: 'other@lascar.pe' };
    const firstServer = factory.createServer(OWNER, 'read-only');
    const secondServer = factory.createServer(other, 'read-only');
    expect(firstServer).not.toBe(secondServer);

    const [aClientLeg, aServerLeg] = InMemoryTransport.createLinkedPair();
    await firstServer.connect(aServerLeg);
    const clientA = new Client({ name: 'a', version: '1.0.0' });
    await clientA.connect(aClientLeg);
    await clientA.callTool({
      name: 'tique_get_budget_audit',
      arguments: { period: '2026-09' },
    });

    const [bClientLeg, bServerLeg] = InMemoryTransport.createLinkedPair();
    await secondServer.connect(bServerLeg);
    const clientB = new Client({ name: 'b', version: '1.0.0' });
    await clientB.connect(bClientLeg);
    await clientB.callTool({
      name: 'tique_get_budget_audit',
      arguments: { period: '2026-10' },
    });

    expect(financeTools.getBudgetAudit).toHaveBeenNthCalledWith(1, OWNER, {
      period: '2026-09',
    });
    expect(financeTools.getBudgetAudit).toHaveBeenNthCalledWith(2, other, {
      period: '2026-10',
    });
  });

  it('los servidores sin conexión no retienen transporte entre requests', () => {
    const server = factory.createServer(OWNER, 'read-only');
    expect(server.isConnected()).toBe(false);
  });
});
