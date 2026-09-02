import { describe, expect, it, vi, beforeEach } from 'vitest';

import { TaxService } from './tax.service';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

describe('TaxService (SUNAT 4ta y 5ta Categoría)', () => {
  let service: TaxService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      transaction: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new TaxService(prisma);
  });

  it('calcula correctamente la proyección de 4ta categoría con deducción del 20%, 7 UIT y tramo del 8%', async () => {
    const userId = 'user-123';
    const year = 2026; // UIT = 5,350 -> 7 UIT = 37,450

    (prisma.transaction.findMany as any)
      .mockResolvedValueOnce([
        {
          id: 'tx-1',
          type: 'INCOME',
          amount: 60000,
          taxCategory: 'FOURTH_CATEGORY_INCOME',
          taxWithholdingAmount: 4800,
        },
      ])
      .mockResolvedValueOnce([]); // getDeductibleItems (0 deducibles)

    const result = await service.calculateProjection(userId, year);

    // 1. Ingreso Bruto 4ta = 60,000
    expect(result.grossFourthCategory).toBe(60000);
    // 2. Deducción del 20% = 12,000
    expect(result.fourthCategoryDeduction20).toBe(12000);
    // 3. Renta Neta 4ta = 48,000
    expect(result.netFourthCategory).toBe(48000);
    // 4. Deducción 7 UIT = 37,450
    expect(result.fixedDeduction7Uit).toBe(37450);
    // 5. Base Imponible Neta = 48,000 - 37,450 = 10,550
    expect(result.netTaxableIncome).toBe(10550);
    // 6. Tramo 1 (hasta 5 UIT = 26,750 a 8%): 10,550 * 0.08 = 844
    expect(result.totalCalculatedTax).toBe(844);
    // 7. Retenciones efectuadas = 4,800
    expect(result.totalWithholdings).toBe(4800);
    // 8. Saldo estimado = 844 - 4,800 = -3,956 (Saldo a favor / Devolución)
    expect(result.estimatedTaxDue).toBe(-3956);
    expect(result.status).toBe('REFUND_DUE');
  });

  it('aplica correctamente deducciones de 3 UIT por restaurantes y hoteles (15%) y alquileres (30%)', async () => {
    const userId = 'user-123';
    const year = 2026;

    (prisma.transaction.findMany as any).mockResolvedValueOnce([
      {
        id: 'tx-ded-1',
        date: new Date('2026-03-10'),
        type: 'EXPENSE',
        amount: 1000,
        taxCategory: 'DEDUCTIBLE_EXPENSE_3UIT',
        taxDeductionType: 'RESTAURANT_BAR',
      },
      {
        id: 'tx-ded-2',
        date: new Date('2026-03-15'),
        type: 'EXPENSE',
        amount: 2000,
        taxCategory: 'DEDUCTIBLE_EXPENSE_3UIT',
        taxDeductionType: 'RENTAL',
      },
    ]);

    const deductibles = await service.getDeductibleItems(userId, year);

    expect(deductibles.length).toBe(2);
    expect(deductibles[0].deductibleAmount).toBe(150);
    expect(deductibles[1].deductibleAmount).toBe(600);
  });

  it('genera checklist fiscal mensual con cálculo del 8% de pago a cuenta y saldo a favor', async () => {
    const userId = 'user-123';
    const period = '2026-09';

    (prisma.transaction.findMany as any)
      .mockResolvedValueOnce([
        {
          id: 'tx-rhe-sep',
          type: 'INCOME',
          amount: 4080,
          taxCategory: 'FOURTH_CATEGORY_INCOME',
          note: 'RHE Datincorp Servicios Septiembre',
        },
      ])
      .mockResolvedValueOnce([
        // Enero a Agosto (8 meses anteriores * 4080 = 32640 * 0.08 = 2611.20)
        {
          id: 'tx-prior',
          type: 'INCOME',
          amount: 32640,
          taxCategory: 'FOURTH_CATEGORY_INCOME',
        },
      ]);

    const checklist = await service.getMonthlyChecklist(userId, period);

    expect(checklist.period).toBe('2026-09');
    expect(checklist.datincorpRheIssued).toBe(true);
    expect(checklist.calculatedMonthlyAdvanceTax).toBe(326.4);
    expect(checklist.rucLastDigit).toBe(3);
    expect(checklist.checklistTasks.length).toBe(3);
  });

  it('simula escenarios tributarios ante ingresos adicionales en 4ta categoría', async () => {
    const userId = 'user-123';

    (prisma.transaction.findMany as any)
      .mockResolvedValueOnce([
        {
          id: 'tx-1',
          type: 'INCOME',
          amount: 40000,
          taxCategory: 'FOURTH_CATEGORY_INCOME',
          taxWithholdingAmount: 3200,
        },
      ])
      .mockResolvedValueOnce([]); // 0 deducibles

    const simulation = await service.simulateTaxScenario(userId, {
      fiscalYear: 2026,
      additionalIncome4th: 10000,
      additionalExpenses3Uit: 0,
    });

    expect(simulation.baseline.totalGrossIncome).toBe(40000);
    expect(simulation.simulated.totalGrossIncome).toBe(50000);
    expect(simulation.delta.taxableIncomeDifference).toBeGreaterThan(0);
  });
});
