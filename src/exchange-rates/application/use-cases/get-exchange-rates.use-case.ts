import { Inject, Injectable } from '@nestjs/common';

import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepositoryPort,
} from '../ports/exchange-rate.repository.port';

export interface ExchangeRatesResponse {
  baseCurrency: 'USD';
  rates: {
    USD: number;
    PEN: number;
    VES: number;
    [key: string]: number;
  };
  sources: {
    [key: string]: string;
  };
  lastUpdated: string;
}

export const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  PEN: 3.75,
  VES: 60.0,
};

@Injectable()
export class GetExchangeRatesUseCase {
  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY)
    private readonly repository: ExchangeRateRepositoryPort,
  ) {}

  async execute(): Promise<ExchangeRatesResponse> {
    const records = await this.repository.findAll();

    const rates: Record<string, number> = {
      USD: 1,
      PEN: DEFAULT_FALLBACK_RATES.PEN,
      VES: DEFAULT_FALLBACK_RATES.VES,
    };

    const sources: Record<string, string> = {
      USD: 'FIXED',
      PEN: 'DEFAULT',
      VES: 'DEFAULT',
    };

    let latestUpdated = new Date(0);

    for (const record of records) {
      rates[record.currency] = record.rate;
      sources[record.currency] = record.source;
      if (record.updatedAt && record.updatedAt > latestUpdated) {
        latestUpdated = record.updatedAt;
      }
    }

    return {
      baseCurrency: 'USD',
      rates: rates as { USD: number; PEN: number; VES: number },
      sources,
      lastUpdated:
        latestUpdated.getTime() > 0
          ? latestUpdated.toISOString()
          : new Date().toISOString(),
    };
  }
}
