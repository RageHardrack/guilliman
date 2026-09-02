import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FiscalTools } from './fiscal.tools';
import { TaxService } from '../../tax/tax.service';
import { Role, User } from '@prisma/client';

describe('FiscalTools', () => {
  let tools: FiscalTools;
  let taxService: TaxService;

  const mockAdmin: User = {
    id: 'admin-123',
    email: 'admin@lascar.pe',
    name: 'Daniel',
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
    taxService = {
      getFiscalSummary: vi.fn().mockResolvedValue({
        fiscalYear: 2026,
        grossIncome4thCategory: 16320,
        remainingTaxCredit: 1494.4,
      }),
      getMonthlyChecklist: vi.fn().mockResolvedValue({
        period: '2026-09',
        datincorpRheIssued: true,
        calculatedMonthlyAdvanceTax: 326.4,
      }),
      simulateTaxScenario: vi.fn().mockResolvedValue({
        fiscalYear: 2026,
        delta: { taxableIncomeDifference: 8000 },
      }),
    } as unknown as TaxService;

    tools = new FiscalTools(taxService);
  });

  it('ejecuta getFiscalSummary y retorna estructura JSON válida para el MCP', async () => {
    const res = await tools.getFiscalSummary(mockAdmin, { fiscal_year: 2026 });
    expect(res.content[0].type).toBe('text');
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.fiscalYear).toBe(2026);
    expect(parsed.grossIncome4thCategory).toBe(16320);
    expect(taxService.getFiscalSummary).toHaveBeenCalledWith('admin-123', 2026);
  });

  it('ejecuta getMonthlyTaxChecklist para el período indicado', async () => {
    const res = await tools.getMonthlyTaxChecklist(mockAdmin, {
      period: '2026-09',
    });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.period).toBe('2026-09');
    expect(parsed.datincorpRheIssued).toBe(true);
    expect(taxService.getMonthlyChecklist).toHaveBeenCalledWith(
      'admin-123',
      '2026-09',
    );
  });

  it('ejecuta simulateTaxScenario con parámetros adicionales', async () => {
    const res = await tools.simulateTaxScenario(mockAdmin, {
      fiscal_year: 2026,
      additional_income_4th: 10000,
      additional_expenses_3uit: 1500,
    });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.delta.taxableIncomeDifference).toBe(8000);
    expect(taxService.simulateTaxScenario).toHaveBeenCalledWith('admin-123', {
      fiscalYear: 2026,
      additionalIncome4th: 10000,
      additionalExpenses3Uit: 1500,
    });
  });
});
