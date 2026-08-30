import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BcvRateProvider } from './bcv-rate.provider';

describe('BcvRateProvider', () => {
  let provider: BcvRateProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new BcvRateProvider();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should fetch exchange rate successfully from DolarAPI BCV endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        moneda: 'USD',
        fuente: 'oficial',
        promedio: 791.6667,
      }),
    } as any);

    const result = await provider.fetchCurrentRate();

    expect(result.currency).toBe('VES');
    expect(result.rate).toBe(791.6667);
    expect(result.source).toBe('BCV');
  });

  it('should fallback to secondary provider if primary fails', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          monitors: {
            usd: {
              price: 790.5,
            },
          },
        }),
      } as any);

    const result = await provider.fetchCurrentRate();

    expect(result.currency).toBe('VES');
    expect(result.rate).toBe(790.5);
    expect(result.source).toBe('BCV');
  });
});
