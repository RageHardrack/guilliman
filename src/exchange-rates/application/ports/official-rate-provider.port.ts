import { ExchangeRateSource } from '../../domain/exchange-rate.entity';

export interface FetchedRateResult {
  currency: string;
  rate: number;
  source: ExchangeRateSource;
}

export const OFFICIAL_RATE_PROVIDERS = 'OFFICIAL_RATE_PROVIDERS';

export interface OfficialRateProviderPort {
  readonly currency: string;
  readonly source: ExchangeRateSource;
  fetchCurrentRate(): Promise<FetchedRateResult>;
}
