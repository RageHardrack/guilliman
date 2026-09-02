import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { User, TaxCategory, TaxDeductionType } from '@prisma/client';

@Injectable()
export class FinanceTools {
  constructor(private readonly prisma: PrismaService) {}

  async getNetWorthAndLiquidity(
    adminUser: User,
    args: { base_currency: 'USD' | 'PEN' | 'VES' },
  ) {
    const accounts = await this.prisma.account.findMany({
      where: { userId: adminUser.id },
    });

    const loans = await this.prisma.loan.findMany({
      where: {
        userId: adminUser.id,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
      },
      include: { payments: true },
    });

    const assetsByCurrency: Record<string, number> = {
      USD: 0,
      PEN: 0,
      VES: 0,
    };

    const liabilitiesByCurrency: Record<string, number> = {
      USD: 0,
      PEN: 0,
      VES: 0,
    };

    const creditCardLiquidityByCurrency: Record<string, number> = {
      USD: 0,
      PEN: 0,
      VES: 0,
    };

    const accountBreakdown = accounts.map((acc) => {
      const cur = acc.currency || 'USD';
      if (acc.type === 'CREDIT_CARD') {
        if (acc.balance < 0) {
          liabilitiesByCurrency[cur] =
            (liabilitiesByCurrency[cur] || 0) + Math.abs(acc.balance);
        } else {
          creditCardLiquidityByCurrency[cur] =
            (creditCardLiquidityByCurrency[cur] || 0) + acc.balance;
        }
      } else {
        if (acc.balance >= 0) {
          assetsByCurrency[cur] = (assetsByCurrency[cur] || 0) + acc.balance;
        } else {
          liabilitiesByCurrency[cur] =
            (liabilitiesByCurrency[cur] || 0) + Math.abs(acc.balance);
        }
      }

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: cur,
        balance: acc.balance,
      };
    });

    const loansBreakdown = loans.map((loan) => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingDebt = Math.max(
        0,
        loan.remainingAmount !== undefined
          ? loan.remainingAmount
          : loan.amount - totalPaid,
      );
      const cur = loan.currency || 'USD';
      if (loan.type === 'BORROWED') {
        liabilitiesByCurrency[cur] =
          (liabilitiesByCurrency[cur] || 0) + remainingDebt;
      } else if (loan.type === 'LENT') {
        assetsByCurrency[cur] = (assetsByCurrency[cur] || 0) + remainingDebt;
      }

      return {
        id: loan.id,
        personName: loan.personName,
        type: loan.type,
        originalAmount: loan.amount,
        totalPaid,
        remainingDebt,
        currency: cur,
        status: loan.status,
      };
    });

    const netWorthSummary = {
      USD:
        Math.round(
          ((assetsByCurrency.USD || 0) - (liabilitiesByCurrency.USD || 0)) *
            100,
        ) / 100,
      PEN:
        Math.round(
          ((assetsByCurrency.PEN || 0) - (liabilitiesByCurrency.PEN || 0)) *
            100,
        ) / 100,
      VES:
        Math.round(
          ((assetsByCurrency.VES || 0) - (liabilitiesByCurrency.VES || 0)) *
            100,
        ) / 100,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              base_currency: args.base_currency,
              net_worth_by_currency: netWorthSummary,
              assets_by_currency: assetsByCurrency,
              liabilities_by_currency: liabilitiesByCurrency,
              operational_credit_card_liquidity: creditCardLiquidityByCurrency,
              accounts: accountBreakdown,
              loans_and_debts: loansBreakdown,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async getBudgetAudit(adminUser: User, args: { period: string }) {
    const [yearStr, monthStr] = args.period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: adminUser.id,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        category: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    let needsExpense = 0;
    let wantsExpense = 0;
    let savingsExpense = 0;

    const antExpenses: Array<{
      id: string;
      description: string;
      amount: number;
      category?: string;
      date: Date;
    }> = [];

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;

        const group = tx.category?.budgetGroup || 'WANTS';
        if (group === 'NEEDS') {
          needsExpense += tx.amount;
        } else if (group === 'SAVINGS') {
          savingsExpense += tx.amount;
        } else {
          wantsExpense += tx.amount;
        }

        if (tx.amount <= 35 && group !== 'NEEDS') {
          antExpenses.push({
            id: tx.id,
            description: tx.note || tx.category?.name || 'Gasto no categorizado',
            amount: tx.amount,
            category: tx.category?.name,
            date: tx.date,
          });
        }
      }
    }

    const needsPct = totalIncome > 0 ? (needsExpense / totalIncome) * 100 : 0;
    const wantsPct = totalIncome > 0 ? (wantsExpense / totalIncome) * 100 : 0;
    const savingsPct =
      totalIncome > 0 ? (savingsExpense / totalIncome) * 100 : 0;

    const totalAntAmount = antExpenses.reduce((s, a) => s + a.amount, 0);

    const auditResult = {
      period: args.period,
      total_income: Math.round(totalIncome * 100) / 100,
      total_expense: Math.round(totalExpense * 100) / 100,
      net_savings: Math.round((totalIncome - totalExpense) * 100) / 100,
      rule_50_30_20: {
        needs: {
          actual_amount: Math.round(needsExpense * 100) / 100,
          actual_percentage: Math.round(needsPct * 10) / 10,
          target_percentage: 50,
          status: needsPct <= 50 ? 'HEALTHY' : 'EXCEEDED',
        },
        wants: {
          actual_amount: Math.round(wantsExpense * 100) / 100,
          actual_percentage: Math.round(wantsPct * 10) / 10,
          target_percentage: 30,
          status: wantsPct <= 30 ? 'HEALTHY' : 'EXCEEDED',
        },
        savings: {
          actual_amount: Math.round(savingsExpense * 100) / 100,
          actual_percentage: Math.round(savingsPct * 10) / 10,
          target_percentage: 20,
          status: savingsPct >= 20 ? 'HEALTHY' : 'BELOW_TARGET',
        },
      },
      ant_expenses_summary: {
        count: antExpenses.length,
        total_amount: Math.round(totalAntAmount * 100) / 100,
        ant_expenses: antExpenses,
      },
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(auditResult, null, 2),
        },
      ],
    };
  }

  async createTransaction(
    adminUser: User,
    args: {
      account_id: string;
      amount: number;
      currency: 'USD' | 'PEN' | 'VES';
      type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      category_id?: string;
      category?: string;
      description: string;
      is_deductible_3uit?: boolean;
      tax_deduction_type?: string;
      transaction_date?: string;
    },
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: args.account_id },
    });

    if (!account || account.userId !== adminUser.id) {
      throw new NotFoundException(
        `Cuenta con ID ${args.account_id} no encontrada para el administrador.`,
      );
    }

    let categoryId = args.category_id;
    if (!categoryId && args.category) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          userId: adminUser.id,
          name: { equals: args.category, mode: 'insensitive' },
        },
      });

      if (existingCategory) {
        categoryId = existingCategory.id;
      }
    }

    const txDate = args.transaction_date
      ? new Date(args.transaction_date)
      : new Date();

    const taxCat: TaxCategory = args.is_deductible_3uit
      ? TaxCategory.DEDUCTIBLE_EXPENSE_3UIT
      : TaxCategory.NONE;

    const taxDedType: TaxDeductionType = (
      args.tax_deduction_type && args.tax_deduction_type !== 'NONE'
        ? args.tax_deduction_type
        : TaxDeductionType.NONE
    ) as TaxDeductionType;

    const delta = args.type === 'INCOME' ? args.amount : -args.amount;

    const result = await this.prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          userId: adminUser.id,
          accountId: args.account_id,
          categoryId: categoryId || null,
          amount: args.amount,
          type: args.type,
          note: args.description,
          date: txDate,
          taxCategory: taxCat,
          taxDeductionType: taxDedType,
        },
      });

      const updatedAccount = await tx.account.update({
        where: { id: args.account_id },
        data: {
          balance: { increment: delta },
        },
      });

      return { transaction: newTx, updatedBalance: updatedAccount.balance };
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              message: 'Transacción registrada exitosamente.',
              transaction: result.transaction,
              account_new_balance: result.updatedBalance,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async recordDebtPayment(
    adminUser: User,
    args: {
      source_account_id: string;
      target_debt_id: string;
      amount: number;
      currency: 'USD' | 'PEN' | 'VES';
      payment_date?: string;
      note?: string;
    },
  ) {
    const sourceAccount = await this.prisma.account.findUnique({
      where: { id: args.source_account_id },
    });

    if (!sourceAccount || sourceAccount.userId !== adminUser.id) {
      throw new NotFoundException(
        `Cuenta de origen con ID ${args.source_account_id} no encontrada.`,
      );
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: args.target_debt_id },
      include: { payments: true },
    });

    if (!loan || loan.userId !== adminUser.id) {
      throw new NotFoundException(
        `Deuda o préstamo con ID ${args.target_debt_id} no encontrado.`,
      );
    }

    const payDate = args.payment_date
      ? new Date(args.payment_date)
      : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create loan payment
      const payment = await tx.loanPayment.create({
        data: {
          loanId: loan.id,
          amount: args.amount,
          date: payDate,
          notes: args.note || 'Abono registrado vía MCP',
        },
      });

      // 2. Decrement source account balance
      const updatedAccount = await tx.account.update({
        where: { id: args.source_account_id },
        data: { balance: { decrement: args.amount } },
      });

      // 3. Create expense/transfer transaction for traceability
      const expenseTx = await tx.transaction.create({
        data: {
          userId: adminUser.id,
          accountId: args.source_account_id,
          amount: args.amount,
          type: 'EXPENSE',
          note: `Pago de deuda a ${loan.personName}: ${args.note || ''}`.trim(),
          date: payDate,
        },
      });

      // 4. Update loan status and remaining amount
      const allPaymentsSum =
        loan.payments.reduce((sum, p) => sum + p.amount, 0) + args.amount;
      const newRemainingAmount = Math.max(0, loan.amount - allPaymentsSum);
      const isFullyPaid = newRemainingAmount <= 0;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          remainingAmount: newRemainingAmount,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        },
      });

      return {
        payment,
        expenseTx,
        updatedLoan,
        remainingDebt: newRemainingAmount,
        accountNewBalance: updatedAccount.balance,
      };
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              message: 'Pago de deuda registrado con consistencia transaccional.',
              loan_id: loan.id,
              person_name: loan.personName,
              payment_id: result.payment.id,
              amount_paid: args.amount,
              remaining_debt: result.remainingDebt,
              loan_status: result.updatedLoan.status,
              source_account_balance: result.accountNewBalance,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
