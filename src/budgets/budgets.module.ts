import { Module } from '@nestjs/common';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { BudgetRepositoryPort } from './application/ports/budget.repository.port';
import { BudgetsController } from './infrastructure/controllers/budgets.controller';
import { PrismaBudgetRepository } from './infrastructure/adapters/prisma-budget.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetsController],
  providers: [
    {
      provide: BudgetRepositoryPort,
      useClass: PrismaBudgetRepository,
    },
  ],
  exports: [BudgetRepositoryPort],
})
export class BudgetsModule {}
