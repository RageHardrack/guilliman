import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SunatRateProvider } from './sunat-rate.provider';

describe('SunatRateProvider', () => {
  let provider: SunatRateProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new SunatRateProvider();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should fetch exchange rate successfully from primary endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        origen: 'SUNAT',
        compra: 3.348,
        venta: 3.356,
        moneda: 'USD',
        fecha: '2026-08-29',
      }),
    } as any);

    const result = await provider.fetchCurrentRate();

    expect(result.currency).toBe('PEN');
    expect(result.rate).toBe(3.356);
    expect(result.source).toBe('SUNAT');
  });

  it('should fallback to secondary provider if primary fails', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: 'success',
          rates: { PEN: 3.36 },
        }),
      } as any);

    const result = await provider.fetchCurrentRate();

    expect(result.currency).toBe('PEN');
    expect(result.rate).toBe(3.36);
    expect(result.source).toBe('SUNAT');
  });
});
