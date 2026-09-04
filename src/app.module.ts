import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppService } from './app.service';
import { McpModule } from './mcp/mcp.module';
import { TaxModule } from './tax/tax.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { AppController } from './app.controller';
import { AboutModule } from './about/about.module';
import { AdminModule } from './admin/admin.module';
import { GoalsModule } from './goals/goals.module';
import { LinksModule } from './links/links.module';
import { LoansModule } from './loans/loans.module';
import { UsersModule } from './users/users.module';
import { NotionModule } from './notion/notion.module';
import { BudgetsModule } from './budgets/budgets.module';
import { DiscordModule } from './discord/discord.module';
import { AccountsModule } from './accounts/accounts.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AdminModule,
    AccountsModule,
    CategoriesModule,
    BudgetsModule,
    SubscriptionsModule,
    TransactionsModule,
    GoalsModule,
    LoansModule,
    TaxModule,
    ExchangeRatesModule,
    NotionModule,
    BlogModule,
    PortfolioModule,
    AboutModule,
    LinksModule,
    McpModule,
    DiscordModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
