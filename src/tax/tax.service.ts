import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { TaxDeductibleItem, TaxProjectionResult } from './domain/tax-projection.entity';
import { UpdateTaxProfileDto } from './infrastructure/dtos/update-tax-profile.dto';

// Parámetros históricos de UIT por año fiscal en Perú
export const UIT_ANNUAL_VALUES: Record<number, number> = {
  2024: 5150,
  2025: 5350,
  2026: 5350, // Default proyectado
};

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

  async getDeductibleItems(userId: string, year: number): Promise<TaxDeductibleItem[]> {
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
          pct = 0.30; // 30%
          break;
        case 'DOMESTIC_WORKER':
          pct = 1.00; // 100%
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

  async calculateProjection(userId: string, year: number): Promise<TaxProjectionResult> {
    const uitValue = UIT_ANNUAL_VALUES[year] || 5350;
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
    const raw20PctDeduction = grossFourthCategory * 0.20;
    const fourthCategoryDeduction20 = Math.min(raw20PctDeduction, max24Uit);
    const netFourthCategory = Math.max(0, grossFourthCategory - fourthCategoryDeduction20);

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
    const totalDeductible3UitRaw = deductibleItems.reduce((sum, item) => sum + item.deductibleAmount, 0);
    const appliedDeductible3Uit = Math.min(totalDeductible3UitRaw, deductible3UitLimit);

    const totalDeductions = fixedDeduction7Uit + appliedDeductible3Uit;

    // 6. Base Imponible Neta del Impuesto (Renta Neta Imponible)
    const netTaxableIncome = Math.max(0, totalNetWorkIncome - totalDeductions);

    // 7. Escala Progresiva Acumulativa (SUNAT)
    // Tramo 1: Hasta 5 UIT -> 8%
    // Tramo 2: > 5 UIT hasta 20 UIT -> 14%
    // Tramo 3: > 20 UIT hasta 35 UIT -> 17%
    // Tramo 4: > 35 UIT hasta 45 UIT -> 20%
    // Tramo 5: > 45 UIT -> 30%
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
        rate: 0.20,
        uitRange: '35 - 45 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
      {
        bracketNumber: 5,
        description: 'Más de 45 UIT',
        rate: 0.30,
        uitRange: '> 45 UIT',
        taxableAmount: 0,
        taxAmount: 0,
      },
    ];

    let remainingTaxable = netTaxableIncome;

    // Tramo 1 (hasta 5 UIT)
    if (remainingTaxable > 0) {
      const taxable = Math.min(remainingTaxable, uit5);
      brackets[0].taxableAmount = taxable;
      brackets[0].taxAmount = Math.round(taxable * 0.08 * 100) / 100;
      remainingTaxable -= taxable;
    }

    // Tramo 2 (de 5 a 20 UIT = 15 UIT)
    if (remainingTaxable > 0) {
      const bracket2Capacity = uit20 - uit5;
      const taxable = Math.min(remainingTaxable, bracket2Capacity);
      brackets[1].taxableAmount = taxable;
      brackets[1].taxAmount = Math.round(taxable * 0.14 * 100) / 100;
      remainingTaxable -= taxable;
    }

    // Tramo 3 (de 20 a 35 UIT = 15 UIT)
    if (remainingTaxable > 0) {
      const bracket3Capacity = uit35 - uit20;
      const taxable = Math.min(remainingTaxable, bracket3Capacity);
      brackets[2].taxableAmount = taxable;
      brackets[2].taxAmount = Math.round(taxable * 0.17 * 100) / 100;
      remainingTaxable -= taxable;
    }

    // Tramo 4 (de 35 a 45 UIT = 10 UIT)
    if (remainingTaxable > 0) {
      const bracket4Capacity = uit45 - uit35;
      const taxable = Math.min(remainingTaxable, bracket4Capacity);
      brackets[3].taxableAmount = taxable;
      brackets[3].taxAmount = Math.round(taxable * 0.20 * 100) / 100;
      remainingTaxable -= taxable;
    }

    // Tramo 5 (más de 45 UIT)
    if (remainingTaxable > 0) {
      const taxable = remainingTaxable;
      brackets[4].taxableAmount = taxable;
      brackets[4].taxAmount = Math.round(taxable * 0.30 * 100) / 100;
      remainingTaxable = 0;
    }

    const totalCalculatedTax = brackets.reduce((sum, b) => sum + b.taxAmount, 0);
    const totalWithholdings = fourthCategoryWithholdings + fifthCategoryWithholdings;
    const estimatedTaxDue = Math.round((totalCalculatedTax - totalWithholdings) * 100) / 100;

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
      fourthCategoryDeduction20: Math.round(fourthCategoryDeduction20 * 100) / 100,
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
      fourthCategoryWithholdings: Math.round(fourthCategoryWithholdings * 100) / 100,
      fifthCategoryWithholdings: Math.round(fifthCategoryWithholdings * 100) / 100,
      totalWithholdings: Math.round(totalWithholdings * 100) / 100,
      estimatedTaxDue,
      status,
    };
  }
}
