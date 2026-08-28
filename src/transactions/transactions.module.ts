import { Module } from '@nestjs/common';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { TransactionRepositoryPort } from './application/ports/transaction.repository.port';
import { TransactionsController } from './infrastructure/controllers/transactions.controller';
import { PrismaTransactionRepository } from './infrastructure/adapters/prisma-transaction.repository';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    {
      provide: TransactionRepositoryPort,
      useClass: PrismaTransactionRepository,
    },
  ],
  exports: [TransactionRepositoryPort],
})
export class TransactionsModule {}
