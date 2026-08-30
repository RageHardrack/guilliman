import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncOfficialRatesUseCase } from '../../application/use-cases/sync-official-rates.use-case';
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepositoryPort,
} from '../../application/ports/exchange-rate.repository.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class ExchangeRatesCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExchangeRatesCronService.name);

  constructor(
    private readonly syncRatesUseCase: SyncOfficialRatesUseCase,
    @Inject(EXCHANGE_RATE_REPOSITORY)
    private readonly repository: ExchangeRateRepositoryPort,
  ) {}

  async onApplicationBootstrap() {
    // Check if database has rates, if not, perform initial bootstrap sync
    try {
      const existing = await this.repository.findAll();
      if (existing.length === 0) {
        this.logger.log('No exchange rates found in database. Running initial bootstrap sync...');
        await this.syncRatesUseCase.execute();
      }
    } catch (err) {
      this.logger.warn(`Initial bootstrap sync failed: ${(err as Error).message}`);
    }
  }

  // Runs every day at 8:00 PM (20:00) Caracas time (America/Caracas UTC-4)
  @Cron('0 20 * * *', {
    name: 'sync-official-exchange-rates-caracas-8pm',
    timeZone: 'America/Caracas',
  })
  async handleDailyCaracas8pmSync() {
    this.logger.log('Cron triggered: Syncing official exchange rates at 8:00 PM Caracas time');
    await this.syncRatesUseCase.execute();
  }
}
