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

    // En calculateProjection: primero busca las transacciones generales (line 104), luego llama a getDeductibleItems (line 147)
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

    // Simular un gasto de restaurante de S/ 1,000 (15% = S/ 150) y alquiler de S/ 2,000 (30% = S/ 600)
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
});
