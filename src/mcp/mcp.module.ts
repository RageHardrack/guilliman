import { Module } from '@nestjs/common';

import { TaxModule } from '../tax/tax.module';
import { FiscalTools } from './tools/fiscal.tools';
import { LoansModule } from '../loans/loans.module';
import { McpAuthService } from './mcp-auth.service';
import { FinanceTools } from './tools/finance.tools';
import { McpServerService } from './mcp-server.service';
import { BudgetsModule } from '../budgets/budgets.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { McpSseController } from './controllers/mcp-sse.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    TaxModule,
    AccountsModule,
    TransactionsModule,
    LoansModule,
    BudgetsModule,
    CategoriesModule,
  ],
  controllers: [McpSseController],
  providers: [McpAuthService, FiscalTools, FinanceTools, McpServerService],
  exports: [McpServerService, McpAuthService],
})
export class McpModule {}
