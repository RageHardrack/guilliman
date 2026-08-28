import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { AppController } from './app.controller';
import { AboutModule } from './about/about.module';
import { LinksModule } from './links/links.module';
import { UsersModule } from './users/users.module';
import { NotionModule } from './notion/notion.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AccountsModule } from './accounts/accounts.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { GoalsModule } from './goals/goals.module';
import { LoansModule } from './loans/loans.module';
import { TaxModule } from './tax/tax.module';
import { AdminModule } from './admin/admin.module';
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
    NotionModule,
    BlogModule,
    PortfolioModule,
    AboutModule,
    LinksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
