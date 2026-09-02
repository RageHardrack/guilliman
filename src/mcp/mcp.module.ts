import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { TaxModule } from '../tax/tax.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { LoansModule } from '../loans/loans.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { CategoriesModule } from '../categories/categories.module';
import { McpAuthService } from './mcp-auth.service';
import { FiscalTools } from './tools/fiscal.tools';
import { FinanceTools } from './tools/finance.tools';
import { McpServerService } from './mcp-server.service';
import { McpSseController } from './controllers/mcp-sse.controller';

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
