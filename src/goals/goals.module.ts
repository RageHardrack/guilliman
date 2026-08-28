import { Module } from '@nestjs/common';
import { SavingsGoalsController } from './infrastructure/controllers/savings-goals.controller';
import { PrismaSavingsGoalRepository } from './infrastructure/adapters/prisma-savings-goal.repository';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SavingsGoalsController],
  providers: [
    {
      provide: 'SAVINGS_GOAL_REPOSITORY_PORT',
      useClass: PrismaSavingsGoalRepository,
    },
  ],
  exports: ['SAVINGS_GOAL_REPOSITORY_PORT'],
})
export class GoalsModule {}
