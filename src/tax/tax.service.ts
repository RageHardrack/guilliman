import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { UpdateTaxProfileDto } from './infrastructure/dtos/update-tax-profile.dto';
import {
  TaxDeductibleItem,
  TaxProjectionResult,
} from './domain/tax-projection.entity';
import {
  DATINCORP_MONTHLY_ADVANCE_TAX,
  DATINCORP_MONTHLY_GROSS,
  INITIAL_TAX_CREDIT_2026,
  RUC_LAST_DIGIT,
  SUNAT_DUE_DATES_2026_DIGIT_3,
  UIT_2026,
} from './domain/tax-rules.constant';

// Parámetros históricos de UIT por año fiscal en Perú
export const UIT_ANNUAL_VALUES: Record<number, number> = {
  2024: 5150,
  2025: 5350,
  2026: 5350, // Default proyectado
};

export interface SimulationParams {
  fiscalYear?: number;
  additionalIncome4th?: number;
  additionalExpenses3Uit?: number;
}

export interface MonthlyTaxChecklistResult {
  period: string;
  fiscalYear: number;
  month: number;
  rucLastDigit: number;
  filingDueDate: string;
  datincorpRheIssued: boolean;
  datincorpExpectedGross: number;
  calculatedMonthlyAdvanceTax: number;
  totalMonthly4thIncome: number;
  initialTaxCreditAvailable: number;
  prepaymentsCompensatedYtd: number;
  remainingTaxCredit: number;
  cashPaymentDue: number;
  checklistTasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    description: string;
  }>;
}

export interface FiscalSummaryResult {
  fiscalYear: number;
  grossIncome5thCategory: number;
  grossIncome4thCategory: number;
  deductionLegal4th20pct: number;
  netIncomeWorkTotal: number;
  deductionFixed7Uit: number;
  deductionAdditional3UitAccumulated: number;
  deductionAdditional3UitLimit: number;
  taxableNetIncome: number;
  estimatedTaxDetermined: number;
  withholdings5thYtd: number;
  withholdings4thYtd: number;
  prepayments4thCompensated: number;
  initialTaxCredit: number;
  remainingTaxCredit: number;
  projectedBalanceDjAnnual: number;
}

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateTaxProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        taxProfileEnabled: dto.taxProfileEnabled,
        ...(dto.taxCountry !== undefined && { taxCountry: dto.taxCountry }),
        ...(dto.taxRuc !== undefined && { taxRuc: dto.taxRuc }),
      },
    });

    return {
      taxProfileEnabled: updated.taxProfileEnabled,
      taxCountry: updated.taxCountry,
      taxRuc: updated.taxRuc,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }
    return {
      taxProfileEnabled: user.taxProfileEnabled,
      taxCountry: user.taxCountry,
      taxRuc: user.taxRuc,
    };
  }

  async getDeductibleItems(
    userId: string,
    year: number,
  ): Promise<TaxDeductibleItem[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const deductibleTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
        taxCategory: 'DEDUCTIBLE_EXPENSE_3UIT',
      },
      orderBy: { date: 'desc' },
    });

    return deductibleTxs.map((tx) => {
      let pct = 0;
      switch (tx.taxDeductionType) {
        case 'RESTAURANT_BAR':
        case 'HOTEL':
          pct = 0.15; // 15%
          break;
        case 'RENTAL':
        case 'PROFESSIONAL_SERVICE':
          pct = 0.3; // 30%
          break;
        case 'DOMESTIC_WORKER':
          pct = 1.0; // 100%
          break;
        default:
          pct = 0.15;
      }

      const deductible = Math.round(tx.amount * pct * 100) / 100;

      return {
        id: tx.id,
        date: tx.date,
        note: tx.note,
        documentType: tx.taxDocumentType,
        documentNumber: tx.taxDocumentNumber,
        deductionType: tx.taxDeductionType,
        originalAmount: tx.amount,
        deductionPercentage: pct * 100,
        deductibleAmount: deductible,
      };
    });
  }

  async calculateProjection(
    userId: string,
    year: number,
  ): Promise<TaxProjectionResult> {
    const uitValue = UIT_ANNUAL_VALUES[year] || UIT_2026;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // 1. Acumular Ingresos de 4ta y 5ta Categoría
    let grossFourthCategory = 0;
    let fourthCategoryWithholdings = 0;
    let grossFifthCategory = 0;
    let fifthCategoryWithholdings = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        if (tx.taxCategory === 'FOURTH_CATEGORY_INCOME') {
          grossFourthCategory += tx.amount;
          fourthCategoryWithholdings += tx.taxWithholdingAmount || 0;
        } else if (tx.taxCategory === 'FIFTH_CATEGORY_INCOME') {
          grossFifthCategory += tx.amount;
          fifthCategoryWithholdings += tx.taxWithholdingAmount || 0;
        }
      }
    }

    // 2. Deducción del 20% legal sobre 4ta Categoría (Máximo 24 UIT)
    const max24Uit = 24 * uitValue;
    const raw20PctDeduction = grossFourthCategory * 0.2;
    const fourthCategoryDeduction20 = Math.min(raw20PctDeduction, max24Uit);
    const netFourthCategory = Math.max(
      0,
      grossFourthCategory - fourthCategoryDeduction20,
    );

    // 3. Renta de 5ta Categoría (No tiene el 20% de deducción)
    const netFifthCategory = grossFifthCategory;

    // 4. Renta Neta Total de Trabajo
    const totalGrossIncome = grossFourthCategory + grossFifthCategory;
    const totalNetWorkIncome = netFourthCategory + netFifthCategory;

    // 5. Deducciones: 7 UIT Fija + hasta 3 UIT Adicionales
    const fixedDeduction7Uit = 7 * uitValue;
    const deductible3UitLimit = 3 * uitValue;

    // Calcular deducciones de 3 UIT
    const deductibleItems = await this.getDeductibleItems(userId, year);
    const totalDeductible3UitRaw = deductibleItems.reduce(
      (sum, item) => sum + item.deductibleAmount,
      0,
    );
    const appliedDeductible3Uit = Math.min(
      totalDeductible3UitRaw,
      deductible3UitLimit,
    );

    const totalDeductions = fixedDeduction7Uit + appliedDeductible3Uit;

    // 6. Base Imponible Neta del Impuesto (Renta Neta Imponible)
    const netTaxableIncome = Math.max(0, totalNetWorkIncome - totalDeductions);

    // 7. Escala Progresiva Acumulativa (SUNAT)
    const uit5 = 5 * uitValue;
    const uit20 = 20 * uitValue;
    const uit35 = 35 * uitValue;
    const uit45 = 45 * uitValue;

    const brackets = [
      {
        bracketNumber: 1,
        description: 'Hasta 5 UIT',
        rate: 0.08,
        uitRange: '0 - 5 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
      {
        bracketNumber: 2,
        description: 'Más de 5 hasta 20 UIT',
        rate: 0.14,
        uitRange: '5 - 20 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
      {
        bracketNumber: 3,
        description: 'Más de 20 hasta 35 UIT',
        rate: 0.17,
        uitRange: '20 - 35 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
      {
        bracketNumber: 4,
        description: 'Más de 35 hasta 45 UIT',
        rate: 0.2,
        uitRange: '35 - 45 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
      {
        bracketNumber: 5,
        description: 'Más de 45 UIT',
        rate: 0.3,
        uitRange: '> 45 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
    ];

    let remainingTaxable = netTaxableIncome;

    if (remainingTaxable > 0) {
      const taxable = Math.min(remainingTaxable, uit5);
      brackets[0].taxableAmount = taxable;
      brackets[0].taxAmount = Math.round(taxable * 0.08 * 100) / 100;
      remainingTaxable -= taxable;
    }

    if (remainingTaxable > 0) {
      const bracket2Capacity = uit20 - uit5;
      const taxable = Math.min(remainingTaxable, bracket2Capacity);
      brackets[1].taxableAmount = taxable;
      brackets[1].taxAmount = Math.round(taxable * 0.14 * 100) / 100;
      remainingTaxable -= taxable;
    }

    if (remainingTaxable > 0) {
      const bracket3Capacity = uit35 - uit20;
      const taxable = Math.min(remainingTaxable, bracket3Capacity);
      brackets[2].taxableAmount = taxable;
      brackets[2].taxAmount = Math.round(taxable * 0.17 * 100) / 100;
      remainingTaxable -= taxable;
    }

    if (remainingTaxable > 0) {
      const bracket4Capacity = uit45 - uit35;
      const taxable = Math.min(remainingTaxable, bracket4Capacity);
      brackets[3].taxableAmount = taxable;
      brackets[3].taxAmount = Math.round(taxable * 0.2 * 100) / 100;
      remainingTaxable -= taxable;
    }

    if (remainingTaxable > 0) {
      const taxable = remainingTaxable;
      brackets[4].taxableAmount = taxable;
      brackets[4].taxAmount = Math.round(taxable * 0.3 * 100) / 100;
      remainingTaxable = 0;
    }

    const totalCalculatedTax = brackets.reduce(
      (sum, b) => sum + b.taxAmount,
      0,
    );
    const totalWithholdings =
      fourthCategoryWithholdings + fifthCategoryWithholdings;
    const estimatedTaxDue =
      Math.round((totalCalculatedTax - totalWithholdings) * 100) / 100;

    let status: 'PAYMENT_DUE' | 'REFUND_DUE' | 'ZERO' = 'ZERO';
    if (estimatedTaxDue > 0.01) {
      status = 'PAYMENT_DUE';
    } else if (estimatedTaxDue < -0.01) {
      status = 'REFUND_DUE';
    }

    return {
      year,
      uitValue,
      currency: 'PEN',
      grossFourthCategory: Math.round(grossFourthCategory * 100) / 100,
      fourthCategoryDeduction20:
        Math.round(fourthCategoryDeduction20 * 100) / 100,
      netFourthCategory: Math.round(netFourthCategory * 100) / 100,
      grossFifthCategory: Math.round(grossFifthCategory * 100) / 100,
      netFifthCategory: Math.round(netFifthCategory * 100) / 100,
      totalGrossIncome: Math.round(totalGrossIncome * 100) / 100,
      totalNetWorkIncome: Math.round(totalNetWorkIncome * 100) / 100,
      fixedDeduction7Uit,
      deductible3UitLimit,
      appliedDeductible3Uit: Math.round(appliedDeductible3Uit * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netTaxableIncome: Math.round(netTaxableIncome * 100) / 100,
      brackets,
      totalCalculatedTax: Math.round(totalCalculatedTax * 100) / 100,
      fourthCategoryWithholdings:
        Math.round(fourthCategoryWithholdings * 100) / 100,
      fifthCategoryWithholdings:
        Math.round(fifthCategoryWithholdings * 100) / 100,
      totalWithholdings: Math.round(totalWithholdings * 100) / 100,
      estimatedTaxDue,
      status,
    };
  }

  async getMonthlyChecklist(
    userId: string,
    period: string,
  ): Promise<MonthlyTaxChecklistResult> {
    const [yearStr, monthStr] = period.split('-');
    const fiscalYear = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) || 1;

    const startOfMonth = new Date(fiscalYear, month - 1, 1);
    const endOfMonth = new Date(fiscalYear, month, 0, 23, 59, 59);

    // Get 4th category transactions for this specific month
    const monthlyTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'INCOME',
        taxCategory: 'FOURTH_CATEGORY_INCOME',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const totalMonthly4thIncome = monthlyTxs.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );

    // Check if Datincorp RHE is registered
    const datincorpTx = monthlyTxs.find(
      (tx) =>
        (tx.note || '').toLowerCase().includes('datincorp') ||
        tx.amount === DATINCORP_MONTHLY_GROSS,
    );
    const datincorpRheIssued = !!datincorpTx;

    // Calculate monthly advance payment (8%)
    const calculatedMonthlyAdvanceTax =
      Math.round(totalMonthly4thIncome * 0.08 * 100) / 100 ||
      (datincorpRheIssued ? DATINCORP_MONTHLY_ADVANCE_TAX : 0);

    // Calculate compensated prepayments in previous months of the same year
    const startOfYear = new Date(fiscalYear, 0, 1);
    const previousMonthEnd = new Date(fiscalYear, month - 1, 0, 23, 59, 59);

    let prepaymentsCompensatedYtd = 0;
    if (month > 1) {
      const priorTxs = await this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'INCOME',
          taxCategory: 'FOURTH_CATEGORY_INCOME',
          date: { gte: startOfYear, lte: previousMonthEnd },
        },
      });
      const prior4thTotal = priorTxs.reduce((sum, tx) => sum + tx.amount, 0);
      prepaymentsCompensatedYtd = Math.round(prior4thTotal * 0.08 * 100) / 100;
    }

    const initialTaxCreditAvailable = INITIAL_TAX_CREDIT_2026;
    const remainingTaxCredit = Math.max(
      0,
      Math.round(
        (initialTaxCreditAvailable -
          prepaymentsCompensatedYtd -
          calculatedMonthlyAdvanceTax) *
          100,
      ) / 100,
    );

    const cashPaymentDue =
      calculatedMonthlyAdvanceTax >
      initialTaxCreditAvailable - prepaymentsCompensatedYtd
        ? Math.round(
            (calculatedMonthlyAdvanceTax -
              (initialTaxCreditAvailable - prepaymentsCompensatedYtd)) *
              100,
          ) / 100
        : 0;

    const filingDueDate =
      SUNAT_DUE_DATES_2026_DIGIT_3[period] || `${fiscalYear}-${monthStr}-20`;

    const checklistTasks = [
      {
        id: 'RHE_ISSUANCE',
        title: 'Emisión de RHE Datincorp',
        completed: datincorpRheIssued,
        description: `Emitir RHE electrónico por S/ ${DATINCORP_MONTHLY_GROSS.toFixed(2)} sin retención.`,
      },
      {
        id: 'FV_616_DECLARATION',
        title: 'Declaración mensual FV 616 (Pago a Cuenta 8%)',
        completed: false,
        description: `Declarar pago a cuenta por S/ ${calculatedMonthlyAdvanceTax.toFixed(2)} antes del vencimiento (${filingDueDate}).`,
      },
      {
        id: 'TAX_CREDIT_COMPENSATION',
        title: 'Compensación con Saldo a Favor',
        completed: cashPaymentDue === 0,
        description: `Compensar S/ ${calculatedMonthlyAdvanceTax.toFixed(2)} contra saldo a favor disponible. Importe a pagar en efectivo: S/ ${cashPaymentDue.toFixed(2)}.`,
      },
    ];

    return {
      period,
      fiscalYear,
      month,
      rucLastDigit: RUC_LAST_DIGIT,
      filingDueDate,
      datincorpRheIssued,
      datincorpExpectedGross: DATINCORP_MONTHLY_GROSS,
      calculatedMonthlyAdvanceTax,
      totalMonthly4thIncome: Math.round(totalMonthly4thIncome * 100) / 100,
      initialTaxCreditAvailable,
      prepaymentsCompensatedYtd,
      remainingTaxCredit,
      cashPaymentDue,
      checklistTasks,
    };
  }

  async simulateTaxScenario(userId: string, params: SimulationParams) {
    const fiscalYear = params.fiscalYear || 2026;
    const additionalIncome4th = params.additionalIncome4th || 0;
    const additionalExpenses3Uit = params.additionalExpenses3Uit || 0;

    const baseline = await this.calculateProjection(userId, fiscalYear);

    // Compute simulated projection
    const uitValue = UIT_ANNUAL_VALUES[fiscalYear] || UIT_2026;
    const simGrossFourth = baseline.grossFourthCategory + additionalIncome4th;
    const max24Uit = 24 * uitValue;
    const simFourthDeduction20 = Math.min(simGrossFourth * 0.2, max24Uit);
    const simNetFourth = Math.max(0, simGrossFourth - simFourthDeduction20);
    const simTotalNetWork = simNetFourth + baseline.netFifthCategory;

    // Apply simulated 3 UIT additional deductible items (using 15% standard or direct amount if already proportioned)
    const simApplied3Uit = Math.min(
      baseline.appliedDeductible3Uit + additionalExpenses3Uit * 0.15,
      baseline.deductible3UitLimit,
    );
    const simTotalDeductions = baseline.fixedDeduction7Uit + simApplied3Uit;
    const simTaxableNet = Math.max(0, simTotalNetWork - simTotalDeductions);

    // Progressive scale calculation
    const uit5 = 5 * uitValue;
    const uit20 = 20 * uitValue;
    const uit35 = 35 * uitValue;
    const uit45 = 45 * uitValue;

    let simTax = 0;
    let remaining = simTaxableNet;

    if (remaining > 0) {
      const t = Math.min(remaining, uit5);
      simTax += t * 0.08;
      remaining -= t;
    }
    if (remaining > 0) {
      const t = Math.min(remaining, uit20 - uit5);
      simTax += t * 0.14;
      remaining -= t;
    }
    if (remaining > 0) {
      const t = Math.min(remaining, uit35 - uit20);
      simTax += t * 0.17;
      remaining -= t;
    }
    if (remaining > 0) {
      const t = Math.min(remaining, uit45 - uit35);
      simTax += t * 0.2;
      remaining -= t;
    }
    if (remaining > 0) {
      simTax += remaining * 0.3;
      remaining = 0;
    }

    const simCalculatedTax = Math.round(simTax * 100) / 100;
    const simTaxDue =
      Math.round((simCalculatedTax - baseline.totalWithholdings) * 100) / 100;

    return {
      fiscalYear,
      baseline: {
        totalGrossIncome: baseline.totalGrossIncome,
        netTaxableIncome: baseline.netTaxableIncome,
        totalCalculatedTax: baseline.totalCalculatedTax,
        estimatedTaxDue: baseline.estimatedTaxDue,
      },
      simulated: {
        additionalIncome4th,
        additionalExpenses3Uit,
        totalGrossIncome:
          Math.round((baseline.totalGrossIncome + additionalIncome4th) * 100) /
          100,
        netTaxableIncome: Math.round(simTaxableNet * 100) / 100,
        totalCalculatedTax: simCalculatedTax,
        estimatedTaxDue: simTaxDue,
      },
      delta: {
        taxableIncomeDifference:
          Math.round((simTaxableNet - baseline.netTaxableIncome) * 100) / 100,
        taxDueDifference:
          Math.round((simTaxDue - baseline.estimatedTaxDue) * 100) / 100,
      },
    };
  }

  async getFiscalSummary(
    userId: string,
    year = 2026,
  ): Promise<FiscalSummaryResult> {
    const projection = await this.calculateProjection(userId, year);

    // Calculate advance prepayments compensated
    const prepayments4thCompensated =
      Math.round(projection.grossFourthCategory * 0.08 * 100) / 100;
    const initialTaxCredit = INITIAL_TAX_CREDIT_2026;
    const remainingTaxCredit = Math.max(
      0,
      Math.round((initialTaxCredit - prepayments4thCompensated) * 100) / 100,
    );

    // Projected balance DJ Annual
    const projectedBalanceDjAnnual =
      Math.round(
        (projection.totalCalculatedTax -
          projection.fifthCategoryWithholdings -
          prepayments4thCompensated) *
          100,
      ) / 100;

    return {
      fiscalYear: year,
      grossIncome5thCategory: projection.grossFifthCategory,
      grossIncome4thCategory: projection.grossFourthCategory,
      deductionLegal4th20pct: projection.fourthCategoryDeduction20,
      netIncomeWorkTotal: projection.totalNetWorkIncome,
      deductionFixed7Uit: projection.fixedDeduction7Uit,
      deductionAdditional3UitAccumulated: projection.appliedDeductible3Uit,
      deductionAdditional3UitLimit: projection.deductible3UitLimit,
      taxableNetIncome: projection.netTaxableIncome,
      estimatedTaxDetermined: projection.totalCalculatedTax,
      withholdings5thYtd: projection.fifthCategoryWithholdings,
      withholdings4thYtd: projection.fourthCategoryWithholdings,
      prepayments4thCompensated,
      initialTaxCredit,
      remainingTaxCredit,
      projectedBalanceDjAnnual,
    };
  }
}
