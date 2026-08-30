import { describe, expect, it, vi } from 'vitest';
import { GetExchangeRatesUseCase } from './get-exchange-rates.use-case';
import { ExchangeRate } from '../../domain/exchange-rate.entity';
import { ExchangeRateRepositoryPort } from '../ports/exchange-rate.repository.port';

describe('GetExchangeRatesUseCase', () => {
  it('should return exchange rates with default values if repository is empty', async () => {
    const mockRepo: ExchangeRateRepositoryPort = {
      findAll: vi.fn().mockResolvedValue([]),
      findByCurrency: vi.fn(),
      upsertRate: vi.fn(),
    };

    const useCase = new GetExchangeRatesUseCase(mockRepo);
    const result = await useCase.execute();

    expect(result.baseCurrency).toBe('USD');
    expect(result.rates.USD).toBe(1);
    expect(result.rates.PEN).toBe(3.75);
    expect(result.rates.VES).toBe(60.0);
    expect(result.sources.USD).toBe('FIXED');
  });

  it('should return exchange rates merged with database records and sources', async () => {
    const mockRepo: ExchangeRateRepositoryPort = {
      findAll: vi.fn().mockResolvedValue([
        new ExchangeRate({
          currency: 'PEN',
          rate: 3.356,
          source: 'SUNAT',
          updatedAt: new Date('2026-08-29T20:00:00Z'),
        }),
        new ExchangeRate({
          currency: 'VES',
          rate: 791.66,
          source: 'BCV',
          updatedAt: new Date('2026-08-29T20:00:00Z'),
        }),
      ]),
      findByCurrency: vi.fn(),
      upsertRate: vi.fn(),
    };

    const useCase = new GetExchangeRatesUseCase(mockRepo);
    const result = await useCase.execute();

    expect(result.rates.PEN).toBe(3.356);
    expect(result.rates.VES).toBe(791.66);
    expect(result.sources.PEN).toBe('SUNAT');
    expect(result.sources.VES).toBe('BCV');
    expect(result.lastUpdated).toBe('2026-08-29T20:00:00.000Z');
  });
});
