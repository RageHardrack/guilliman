import { Inject, Injectable, Logger } from '@nestjs/common';
import { ExchangeRate } from '../../domain/exchange-rate.entity';
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepositoryPort,
} from '../ports/exchange-rate.repository.port';
import {
  OFFICIAL_RATE_PROVIDERS,
  type OfficialRateProviderPort,
} from '../ports/official-rate-provider.port';

export interface SyncRatesResult {
  success: boolean;
  synced: { currency: string; rate: number; source: string }[];
  errors: { currency: string; error: string }[];
  timestamp: string;
}

@Injectable()
export class SyncOfficialRatesUseCase {
  private readonly logger = new Logger(SyncOfficialRatesUseCase.name);

  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY)
    private readonly repository: ExchangeRateRepositoryPort,
    @Inject(OFFICIAL_RATE_PROVIDERS)
    private readonly providers: OfficialRateProviderPort[],
  ) {}

  async execute(): Promise<SyncRatesResult> {
    this.logger.log('Starting daily official exchange rates synchronization...');
    const synced: { currency: string; rate: number; source: string }[] = [];
    const errors: { currency: string; error: string }[] = [];

    for (const provider of this.providers) {
      try {
        const fetched = await provider.fetchCurrentRate();
        const entity = new ExchangeRate({
          currency: fetched.currency,
          rate: fetched.rate,
          source: fetched.source,
        });

        const saved = await this.repository.upsertRate(entity);
        synced.push({
          currency: saved.currency,
          rate: saved.rate,
          source: saved.source,
        });
        this.logger.log(
          `Successfully updated ${saved.currency} rate to ${saved.rate} from ${saved.source}`,
        );
      } catch (err) {
        const message = (err as Error).message || 'Unknown error';
        this.logger.error(
          `Failed to sync rate for ${provider.currency} (${provider.source}): ${message}`,
        );
        errors.push({
          currency: provider.currency,
          error: message,
        });
      }
    }

    return {
      success: errors.length === 0,
      synced,
      errors,
      timestamp: new Date().toISOString(),
    };
  }
}
