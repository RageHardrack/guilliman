import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { LoanRepositoryPort } from './application/ports/loan.repository.port';
import { PrismaLoanRepository } from './infrastructure/adapters/prisma-loan.repository';
import { LoansController } from './infrastructure/controllers/loans.controller';

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
