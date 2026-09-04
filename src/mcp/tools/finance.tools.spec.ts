import { Role, User } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FinanceTools } from './finance.tools';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

describe('FinanceTools', () => {
  let tools: FinanceTools;
  let prisma: PrismaService;

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
    prisma = {
      account: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      loan: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      loanPayment: {
        create: vi.fn(),
      },
      transaction: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      category: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    } as unknown as PrismaService;

    tools = new FinanceTools(prisma);
  });

  it('calcula patrimonio neto y liquidez operativa multimoneda', async () => {
    (prisma.account.findMany as any).mockResolvedValue([
      {
        id: 'acc-1',
        name: 'BCP Soles',
        type: 'SAVINGS',
        currency: 'PEN',
        balance: 15000,
      },
      {
        id: 'acc-2',
        name: 'Interbank USD',
        type: 'CHECKING',
        currency: 'USD',
        balance: 5000,
      },
      {
        id: 'acc-3',
        name: 'TC BBVA',
        type: 'CREDIT_CARD',
        currency: 'PEN',
        balance: 8000, // available limit
      },
    ]);

    (prisma.loan.findMany as any).mockResolvedValue([
      {
        id: 'loan-1',
        personName: 'Banco',
        type: 'BORROWED',
        amount: 2000,
        currency: 'USD',
        status: 'PARTIALLY_PAID',
        payments: [{ amount: 500 }],
        remainingAmount: 1500,
      },
    ]);

    const res = await tools.getNetWorthAndLiquidity(mockAdmin, {
      base_currency: 'USD',
    });

    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.net_worth_by_currency.USD).toBe(3500); // 5000 - 1500
    expect(parsed.net_worth_by_currency.PEN).toBe(15000);
    expect(parsed.operational_credit_card_liquidity.PEN).toBe(8000);
  });

  it('audita presupuesto bajo regla 50/30/20 y detecta gastos hormiga', async () => {
    (prisma.transaction.findMany as any).mockResolvedValue([
      {
        id: 'tx-inc-1',
        type: 'INCOME',
        amount: 10000,
        date: new Date('2026-09-01'),
      },
      {
        id: 'tx-exp-1',
        type: 'EXPENSE',
        amount: 4000,
        date: new Date('2026-09-02'),
        category: { budgetGroup: 'NEEDS', name: 'Alquiler' },
      },
      {
        id: 'tx-exp-2',
        type: 'EXPENSE',
        amount: 2500,
        date: new Date('2026-09-05'),
        category: { budgetGroup: 'WANTS', name: 'Restaurantes' },
      },
      {
        id: 'tx-exp-ant',
        type: 'EXPENSE',
        amount: 15,
        note: 'Café de paso',
        date: new Date('2026-09-10'),
        category: { budgetGroup: 'WANTS', name: 'Cafés' },
      },
      {
        id: 'tx-exp-3',
        type: 'EXPENSE',
        amount: 2000,
        date: new Date('2026-09-15'),
        category: { budgetGroup: 'SAVINGS', name: 'Fondos Mutuos' },
      },
    ]);

    const res = await tools.getBudgetAudit(mockAdmin, { period: '2026-09' });
    const parsed = JSON.parse(res.content[0].text);

    expect(parsed.total_income).toBe(10000);
    expect(parsed.rule_50_30_20.needs.status).toBe('HEALTHY'); // 4000 = 40% <= 50%
    expect(parsed.ant_expenses_summary.count).toBe(1);
    expect(parsed.ant_expenses_summary.total_amount).toBe(15);
  });

  it('crea una transacción con trazabilidad fiscal 3 UIT', async () => {
    (prisma.account.findUnique as any).mockResolvedValue({
      id: 'acc-1',
      userId: 'admin-123',
      balance: 1000,
    });

    (prisma.category.findFirst as any).mockResolvedValue({
      id: 'cat-1',
      name: 'Restaurante',
    });

    (prisma.transaction.create as any).mockResolvedValue({
      id: 'tx-created-1',
      amount: 120,
      type: 'EXPENSE',
      taxCategory: 'DEDUCTIBLE_EXPENSE_3UIT',
    });

    (prisma.account.update as any).mockResolvedValue({
      id: 'acc-1',
      balance: 880,
    });

    const res = await tools.createTransaction(mockAdmin, {
      account_id: 'acc-1',
      amount: 120,
      currency: 'PEN',
      type: 'EXPENSE',
      category: 'Restaurante',
      description: 'Almuerzo ejecutivo',
      is_deductible_3uit: true,
      tax_deduction_type: 'RESTAURANT_BAR',
    });

    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.transaction.id).toBe('tx-created-1');
    expect(parsed.account_new_balance).toBe(880);
  });

  it('registra abono a deuda con consistencia transaccional', async () => {
    (prisma.account.findUnique as any).mockResolvedValue({
      id: 'acc-source',
      userId: 'admin-123',
      balance: 5000,
    });

    (prisma.loan.findUnique as any).mockResolvedValue({
      id: 'loan-target',
      userId: 'admin-123',
      personName: 'Banco de Crédito',
      amount: 1000,
      payments: [{ amount: 200 }],
    });

    (prisma.loanPayment.create as any).mockResolvedValue({
      id: 'payment-1',
      amount: 300,
    });

    (prisma.account.update as any).mockResolvedValue({
      id: 'acc-source',
      balance: 4700,
    });

    (prisma.loan.update as any).mockResolvedValue({
      id: 'loan-target',
      status: 'PARTIALLY_PAID',
    });

    const res = await tools.recordDebtPayment(mockAdmin, {
      source_account_id: 'acc-source',
      target_debt_id: 'loan-target',
      amount: 300,
      currency: 'PEN',
      note: 'Cuota mensual',
    });

    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.amount_paid).toBe(300);
    expect(parsed.remaining_debt).toBe(500); // 1000 - (200 + 300)
    expect(parsed.source_account_balance).toBe(4700);
  });
});
