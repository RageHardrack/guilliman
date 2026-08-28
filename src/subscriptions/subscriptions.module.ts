import { Module } from '@nestjs/common';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { SubscriptionRepositoryPort } from './application/ports/subscription.repository.port';
import { SubscriptionsController } from './infrastructure/controllers/subscriptions.controller';
import { PrismaSubscriptionRepository } from './infrastructure/adapters/prisma-subscription.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [
    {
      provide: SubscriptionRepositoryPort,
      useClass: PrismaSubscriptionRepository,
    },
  ],
  exports: [SubscriptionRepositoryPort],
})
export class SubscriptionsModule {}
