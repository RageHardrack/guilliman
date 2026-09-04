import { Role, User } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FiscalTools } from './tools/fiscal.tools';
import { McpAuthService } from './mcp-auth.service';
import { FinanceTools } from './tools/finance.tools';
import { McpServerService } from './mcp-server.service';

describe('McpServerService', () => {
  let service: McpServerService;
  let authService: McpAuthService;
  let fiscalTools: FiscalTools;
  let financeTools: FinanceTools;

  const mockAdmin: User = {
    id: 'admin-123',
    email: 'admin@lascar.pe',
    name: 'Admin Lascar',
    password: 'hash',
    role: Role.ADMIN,
    isActive: true,
    taxProfileEnabled: true,
    taxCountry: 'PE',
    taxRuc: '10705438233',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    authService = {
      getAdminUserContext: vi.fn().mockResolvedValue(mockAdmin),
    } as unknown as McpAuthService;

    fiscalTools = {
      getFiscalSummary: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"fiscalYear":2026}' }],
      }),
      getMonthlyTaxChecklist: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"datincorpRheIssued":true}' }],
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
      createTransaction: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"transaction":{}}' }],
      }),
      recordDebtPayment: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"loan_status":"PAID"}' }],
      }),
    } as unknown as FinanceTools;

    service = new McpServerService(authService, fiscalTools, financeTools);
    service.onModuleInit();
  });

  it('inicializa y expone la instancia de McpServer', () => {
    const serverInstance = service.getServerInstance();
    expect(serverInstance).toBeDefined();
  });

  it('valida el contexto de ADMIN antes de iniciar el transporte Stdio', async () => {
    const connectSpy = vi
      .spyOn(service.getServerInstance(), 'connect')
      .mockResolvedValue();

    await service.startStdioServer();

    expect(authService.getAdminUserContext).toHaveBeenCalled();
    expect(connectSpy).toHaveBeenCalled();
  });
});
