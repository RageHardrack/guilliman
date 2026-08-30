import { describe, expect, it, vi } from 'vitest';
import { SyncOfficialRatesUseCase } from './sync-official-rates.use-case';
import { ExchangeRateRepositoryPort } from '../ports/exchange-rate.repository.port';
import { OfficialRateProviderPort } from '../ports/official-rate-provider.port';
import { ExchangeRate } from '../../domain/exchange-rate.entity';

describe('SyncOfficialRatesUseCase', () => {
  it('should fetch and upsert rates from all providers', async () => {
    const mockRepo: ExchangeRateRepositoryPort = {
      findAll: vi.fn(),
      findByCurrency: vi.fn(),
      upsertRate: vi.fn().mockImplementation(async (entity: ExchangeRate) => entity),
    };

    const sunatProvider: OfficialRateProviderPort = {
      currency: 'PEN',
      source: 'SUNAT',
      fetchCurrentRate: vi.fn().mockResolvedValue({
        currency: 'PEN',
        rate: 3.356,
        source: 'SUNAT',
      }),
    };

    const bcvProvider: OfficialRateProviderPort = {
      currency: 'VES',
      source: 'BCV',
      fetchCurrentRate: vi.fn().mockResolvedValue({
        currency: 'VES',
        rate: 791.66,
        source: 'BCV',
      }),
    };

    const useCase = new SyncOfficialRatesUseCase(mockRepo, [sunatProvider, bcvProvider]);
    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.synced).toHaveLength(2);
    expect(result.synced).toEqual([
      { currency: 'PEN', rate: 3.356, source: 'SUNAT' },
      { currency: 'VES', rate: 791.66, source: 'BCV' },
    ]);
    expect(mockRepo.upsertRate).toHaveBeenCalledTimes(2);
  });

  it('should handle partial failures gracefully without stopping the sync process', async () => {
    const mockRepo: ExchangeRateRepositoryPort = {
      findAll: vi.fn(),
      findByCurrency: vi.fn(),
      upsertRate: vi.fn().mockImplementation(async (entity: ExchangeRate) => entity),
    };

    const sunatProvider: OfficialRateProviderPort = {
      currency: 'PEN',
      source: 'SUNAT',
      fetchCurrentRate: vi.fn().mockRejectedValue(new Error('Network timeout')),
    };

    const bcvProvider: OfficialRateProviderPort = {
      currency: 'VES',
      source: 'BCV',
      fetchCurrentRate: vi.fn().mockResolvedValue({
        currency: 'VES',
        rate: 791.66,
        source: 'BCV',
      }),
    };

    const useCase = new SyncOfficialRatesUseCase(mockRepo, [sunatProvider, bcvProvider]);
    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.synced).toHaveLength(1);
    expect(result.synced[0].currency).toBe('VES');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      currency: 'PEN',
      error: 'Network timeout',
    });
  });
});
