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
import { McpTokenService } from './tokens/application/mcp-token.service';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { MCP_TOKEN_STORE_PORT } from './tokens/application/ports/mcp-token.repository.port';
import { PrismaMcpTokenStore } from './tokens/infrastructure/adapters/prisma-mcp-token.store';
import { McpTokensController } from './tokens/infrastructure/controllers/mcp-tokens.controller';

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
  controllers: [McpSseController, McpTokensController],
  providers: [
    McpAuthService,
    FiscalTools,
    FinanceTools,
    McpServerService,
    McpTokenService,
    {
      provide: MCP_TOKEN_STORE_PORT,
      useClass: PrismaMcpTokenStore,
    },
  ],
  exports: [McpServerService, McpAuthService, McpTokenService],
})
export class McpModule {}
