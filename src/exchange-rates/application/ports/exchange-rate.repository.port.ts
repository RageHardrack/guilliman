import { ExchangeRate } from '../../domain/exchange-rate.entity';

export const EXCHANGE_RATE_REPOSITORY = 'EXCHANGE_RATE_REPOSITORY';

export interface ExchangeRateRepositoryPort {
  findAll(): Promise<ExchangeRate[]>;
  findByCurrency(currency: string): Promise<ExchangeRate | null>;
  upsertRate(exchangeRate: ExchangeRate): Promise<ExchangeRate>;
}
