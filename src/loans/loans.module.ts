import { Module } from '@nestjs/common';

import { LoanRepositoryPort } from './application/ports/loan.repository.port';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { LoansController } from './infrastructure/controllers/loans.controller';
import { PrismaLoanRepository } from './infrastructure/adapters/prisma-loan.repository';

@Module({
  imports: [PrismaModule],
  controllers: [LoansController],
  providers: [
    {
      provide: LoanRepositoryPort,
      useClass: PrismaLoanRepository,
    },
  ],
  exports: [LoanRepositoryPort],
})
export class LoansModule {}
