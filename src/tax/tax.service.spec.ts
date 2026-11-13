import { NotFoundException } from '@nestjs/common';

import type { Mock } from 'vitest';
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

  describe('branch coverage of the tax rules', () => {
    type AsyncMock = Mock<(...args: unknown[]) => Promise<unknown>>;

    let findMany: AsyncMock;
    let findUnique: AsyncMock;
    let update: AsyncMock;

    beforeEach(() => {
      findMany = prisma.transaction.findMany as unknown as AsyncMock;
      findUnique = prisma.user.findUnique as unknown as AsyncMock;
      update = prisma.user.update as unknown as AsyncMock;
      findMany.mockResolvedValue([]);
    });

    describe('tax profile', () => {
      it('rejects reading the profile of an unknown user', async () => {
        findUnique.mockResolvedValue(null);

        await expect(service.getProfile('ghost')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('returns the stored tax profile', async () => {
        findUnique.mockResolvedValue({
          taxProfileEnabled: true,
          taxCountry: 'PE',
          taxRuc: '10456789013',
        });

        await expect(service.getProfile('user-1')).resolves.toEqual({
          taxProfileEnabled: true,
          taxCountry: 'PE',
          taxRuc: '10456789013',
        });
      });

      it('rejects updating the profile of an unknown user without writing', async () => {
        findUnique.mockResolvedValue(null);

        await expect(
          service.updateProfile('ghost', { taxProfileEnabled: true }),
        ).rejects.toThrow('Usuario con ID ghost no encontrado.');
        expect(update).not.toHaveBeenCalled();
      });

      it('writes country and RUC only when they are provided', async () => {
        findUnique.mockResolvedValue({ id: 'user-1' });
        update.mockResolvedValue({
          taxProfileEnabled: true,
          taxCountry: 'PE',
          taxRuc: '10456789013',
        });

        await service.updateProfile('user-1', {
          taxProfileEnabled: true,
          taxCountry: 'PE',
          taxRuc: '10456789013',
        });
        await service.updateProfile('user-1', { taxProfileEnabled: false });

        expect(update).toHaveBeenNthCalledWith(1, {
          where: { id: 'user-1' },
          data: {
            taxProfileEnabled: true,
            taxCountry: 'PE',
            taxRuc: '10456789013',
          },
        });
        expect(update).toHaveBeenNthCalledWith(2, {
          where: { id: 'user-1' },
          data: { taxProfileEnabled: false },
        });
      });
    });

    it('applies the deduction percentage of every deduction type', async () => {
      const expense = (id: string, taxDeductionType: string) => ({
        id,
        date: new Date('2026-05-01'),
        type: 'EXPENSE',
        amount: 1000,
        taxCategory: 'DEDUCTIBLE_EXPENSE_3UIT',
        taxDeductionType,
      });
      findMany.mockResolvedValueOnce([
        expense('hotel', 'HOTEL'),
        expense('professional', 'PROFESSIONAL_SERVICE'),
        expense('domestic', 'DOMESTIC_WORKER'),
        expense('unknown', 'NONE'),
      ]);

      const items = await service.getDeductibleItems('user-1', 2026);

      expect(items.map((item) => [item.id, item.deductionPercentage])).toEqual([
        ['hotel', 15],
        ['professional', 30],
        ['domestic', 100],
        ['unknown', 15],
      ]);
      expect(items.map((item) => item.deductibleAmount)).toEqual([
        150, 300, 1000, 150,
      ]);
    });

    describe('annual projection', () => {
      it('fills all five brackets, caps both deductions and reports a payment due', async () => {
        findMany
          .mockResolvedValueOnce([
            {
              type: 'INCOME',
              amount: 700000,
              taxCategory: 'FOURTH_CATEGORY_INCOME',
              taxWithholdingAmount: 10000,
            },
            {
              type: 'INCOME',
              amount: 400000,
              taxCategory: 'FIFTH_CATEGORY_INCOME',
              taxWithholdingAmount: null,
            },
            { type: 'INCOME', amount: 999, taxCategory: 'NONE' },
            {
              type: 'EXPENSE',
              amount: 999,
              taxCategory: 'FOURTH_CATEGORY_INCOME',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'nanny',
              date: new Date('2026-06-01'),
              amount: 20000,
              taxDeductionType: 'DOMESTIC_WORKER',
            },
          ]);

        const result = await service.calculateProjection('user-1', 2026);

        // 20% of 700,000 = 140,000, capped at 24 UIT = 128,400
        expect(result.fourthCategoryDeduction20).toBe(128400);
        expect(result.netFourthCategory).toBe(571600);
        expect(result.grossFifthCategory).toBe(400000);
        expect(result.totalGrossIncome).toBe(1100000);
        // 20,000 deductible, capped at 3 UIT = 16,050
        expect(result.appliedDeductible3Uit).toBe(16050);
        expect(result.netTaxableIncome).toBe(918100);
        expect(result.brackets.map((b) => b.taxAmount)).toEqual([
          2140, 11235, 13642.5, 10700, 203205,
        ]);
        expect(result.totalCalculatedTax).toBe(240922.5);
        expect(result.fifthCategoryWithholdings).toBe(0);
        expect(result.totalWithholdings).toBe(10000);
        expect(result.estimatedTaxDue).toBe(230922.5);
        expect(result.status).toBe('PAYMENT_DUE');
      });

      it('reports ZERO with no income and uses the UIT of the fiscal year', async () => {
        const result2024 = await service.calculateProjection('user-1', 2024);
        const result2030 = await service.calculateProjection('user-1', 2030);

        expect(result2024.uitValue).toBe(5150);
        expect(result2024.fixedDeduction7Uit).toBe(36050);
        expect(result2024.netTaxableIncome).toBe(0);
        expect(result2024.status).toBe('ZERO');
        // A year without a published UIT falls back to the 2026 value
        expect(result2030.uitValue).toBe(5350);
      });
    });

    describe('monthly checklist', () => {
      it('detects the Datincorp RHE by amount and skips prior months in January', async () => {
        findMany.mockResolvedValueOnce([
          {
            type: 'INCOME',
            amount: 4080,
            taxCategory: 'FOURTH_CATEGORY_INCOME',
            note: null,
          },
        ]);

        const checklist = await service.getMonthlyChecklist(
          'user-1',
          '2027-01',
        );

        expect(findMany).toHaveBeenCalledTimes(1);
        expect(checklist.fiscalYear).toBe(2027);
        expect(checklist.month).toBe(1);
        expect(checklist.datincorpRheIssued).toBe(true);
        expect(checklist.calculatedMonthlyAdvanceTax).toBe(326.4);
        expect(checklist.prepaymentsCompensatedYtd).toBe(0);
        expect(checklist.remainingTaxCredit).toBe(2473.6);
        expect(checklist.cashPaymentDue).toBe(0);
        // Not in the 2026 SUNAT calendar: the 20th of the month
        expect(checklist.filingDueDate).toBe('2027-01-20');
        expect(checklist.checklistTasks[2].completed).toBe(true);
      });

      it('asks for a cash payment once the tax credit is used up', async () => {
        findMany
          .mockResolvedValueOnce([
            {
              type: 'INCOME',
              amount: 5000,
              taxCategory: 'FOURTH_CATEGORY_INCOME',
              note: 'Consultoria',
            },
          ])
          .mockResolvedValueOnce([
            {
              type: 'INCOME',
              amount: 32000,
              taxCategory: 'FOURTH_CATEGORY_INCOME',
            },
          ]);

        const checklist = await service.getMonthlyChecklist(
          'user-1',
          '2026-12',
        );

        expect(checklist.datincorpRheIssued).toBe(false);
        expect(checklist.calculatedMonthlyAdvanceTax).toBe(400);
        // 8% of 32,000 already compensated: 2,560 of the 2,800 credit
        expect(checklist.prepaymentsCompensatedYtd).toBe(2560);
        expect(checklist.remainingTaxCredit).toBe(0);
        expect(checklist.cashPaymentDue).toBe(160);
        expect(checklist.filingDueDate).toBe('2027-01-20');
        expect(checklist.checklistTasks[0].completed).toBe(false);
        expect(checklist.checklistTasks[2].completed).toBe(false);
      });

      it('falls back to January 2026 for an empty period', async () => {
        const checklist = await service.getMonthlyChecklist('user-1', '');

        expect(checklist.fiscalYear).toBe(2026);
        expect(checklist.month).toBe(1);
        expect(checklist.calculatedMonthlyAdvanceTax).toBe(0);
        expect(checklist.datincorpRheIssued).toBe(false);
      });
    });

    describe('scenario simulation', () => {
      it('defaults to 2026 with no additional income or expenses', async () => {
        const simulation = await service.simulateTaxScenario('user-1', {});

        expect(simulation.fiscalYear).toBe(2026);
        expect(simulation.simulated.additionalIncome4th).toBe(0);
        expect(simulation.simulated.additionalExpenses3Uit).toBe(0);
        expect(simulation.simulated.totalCalculatedTax).toBe(0);
        expect(simulation.delta.taxDueDifference).toBe(0);
      });

      it('runs the simulated income through all five brackets', async () => {
        const simulation = await service.simulateTaxScenario('user-1', {
          fiscalYear: 2026,
          additionalIncome4th: 1000000,
          additionalExpenses3Uit: 200000,
        });

        // 1,000,000 - 128,400 (24 UIT cap) - 37,450 (7 UIT) - 16,050 (3 UIT cap)
        expect(simulation.simulated.netTaxableIncome).toBe(818100);
        // 2,140 + 11,235 + 13,642.5 + 10,700 + 577,350 * 30%
        expect(simulation.simulated.totalCalculatedTax).toBe(210922.5);
        expect(simulation.simulated.estimatedTaxDue).toBe(210922.5);
        expect(simulation.delta.taxableIncomeDifference).toBe(818100);
        expect(simulation.delta.taxDueDifference).toBe(210922.5);
      });
    });

    it('builds the 2026 fiscal summary by default', async () => {
      findMany
        .mockResolvedValueOnce([
          {
            type: 'INCOME',
            amount: 50000,
            taxCategory: 'FOURTH_CATEGORY_INCOME',
            taxWithholdingAmount: 4000,
          },
          {
            type: 'INCOME',
            amount: 30000,
            taxCategory: 'FIFTH_CATEGORY_INCOME',
            taxWithholdingAmount: 1500,
          },
        ])
        .mockResolvedValueOnce([]);

      const summary = await service.getFiscalSummary('user-1');

      expect(summary.fiscalYear).toBe(2026);
      expect(summary.taxableNetIncome).toBe(32550);
      // 26,750 * 8% + 5,800 * 14%
      expect(summary.estimatedTaxDetermined).toBe(2952);
      expect(summary.prepayments4thCompensated).toBe(4000);
      expect(summary.remainingTaxCredit).toBe(0);
      // 2,952 - 1,500 (5th withholdings) - 4,000 (4th prepayments)
      expect(summary.projectedBalanceDjAnnual).toBe(-2548);
    });
  });
});
