import { Module } from '@nestjs/common';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { TransactionTemplatesController } from './infrastructure/controllers/transaction-templates.controller';
import { PrismaTransactionTemplateRepository } from './infrastructure/adapters/prisma-transaction-templates.repository';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionTemplatesController],
  providers: [
    {
      provide: 'TRANSACTION_TEMPLATE_REPOSITORY_PORT',
      useClass: PrismaTransactionTemplateRepository,
    },
  ],
  exports: ['TRANSACTION_TEMPLATE_REPOSITORY_PORT'],
})
export class TransactionTemplatesModule {}
