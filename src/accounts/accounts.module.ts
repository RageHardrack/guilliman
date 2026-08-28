import { Module } from '@nestjs/common';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { AccountRepositoryPort } from './application/ports/account.repository.port';
import { AccountsController } from './infrastructure/controllers/accounts.controller';
import { PrismaAccountRepository } from './infrastructure/adapters/prisma-account.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [
    {
      provide: AccountRepositoryPort,
      useClass: PrismaAccountRepository,
    },
  ],
  exports: [AccountRepositoryPort],
})
export class AccountsModule {}
