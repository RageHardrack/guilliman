import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { BcvRateProvider } from './infrastructure/providers/bcv-rate.provider';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { SunatRateProvider } from './infrastructure/providers/sunat-rate.provider';
import { ExchangeRatesController } from './presentation/exchange-rates.controller';
import { OFFICIAL_RATE_PROVIDERS } from './application/ports/official-rate-provider.port';
import { EXCHANGE_RATE_REPOSITORY } from './application/ports/exchange-rate.repository.port';
import { ExchangeRatesCronService } from './infrastructure/jobs/exchange-rates-cron.service';
import { GetExchangeRatesUseCase } from './application/use-cases/get-exchange-rates.use-case';
import { SyncOfficialRatesUseCase } from './application/use-cases/sync-official-rates.use-case';
import { PrismaExchangeRateRepository } from './infrastructure/adapters/prisma-exchange-rate.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ExchangeRatesController],
  providers: [
    PrismaService,
    SunatRateProvider,
    BcvRateProvider,
    {
      provide: EXCHANGE_RATE_REPOSITORY,
      useClass: PrismaExchangeRateRepository,
    },
    {
      provide: OFFICIAL_RATE_PROVIDERS,
      useFactory: (sunat: SunatRateProvider, bcv: BcvRateProvider) => [
        sunat,
        bcv,
      ],
      inject: [SunatRateProvider, BcvRateProvider],
    },
    GetExchangeRatesUseCase,
    SyncOfficialRatesUseCase,
    ExchangeRatesCronService,
  ],
  exports: [GetExchangeRatesUseCase, SyncOfficialRatesUseCase],
})
export class ExchangeRatesModule {}
