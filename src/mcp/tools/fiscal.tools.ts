import { Injectable } from '@nestjs/common';
import { TaxService } from '../../tax/tax.service';
import { User } from '@prisma/client';

@Injectable()
export class FiscalTools {
  constructor(private readonly taxService: TaxService) {}

  async getFiscalSummary(adminUser: User, args: { fiscal_year: number }) {
    const summary = await this.taxService.getFiscalSummary(
      adminUser.id,
      args.fiscal_year,
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  async getMonthlyTaxChecklist(adminUser: User, args: { period: string }) {
    const checklist = await this.taxService.getMonthlyChecklist(
      adminUser.id,
      args.period,
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(checklist, null, 2),
        },
      ],
    };
  }

  async simulateTaxScenario(
    adminUser: User,
    args: {
      fiscal_year: number;
      additional_income_4th: number;
      additional_expenses_3uit: number;
    },
  ) {
    const simulation = await this.taxService.simulateTaxScenario(adminUser.id, {
      fiscalYear: args.fiscal_year,
      additionalIncome4th: args.additional_income_4th,
      additionalExpenses3Uit: args.additional_expenses_3uit,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(simulation, null, 2),
        },
      ],
    };
  }
}
