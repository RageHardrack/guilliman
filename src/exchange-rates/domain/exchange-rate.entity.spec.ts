import { describe, expect, it } from 'vitest';
import { ExchangeRate } from './exchange-rate.entity';

describe('ExchangeRate Domain Entity', () => {
  it('should instantiate a valid exchange rate entity', () => {
    const rate = new ExchangeRate({
      currency: 'PEN',
      rate: 3.356,
      source: 'SUNAT',
    });

    expect(rate.currency).toBe('PEN');
    expect(rate.rate).toBe(3.356);
    expect(rate.source).toBe('SUNAT');
    expect(rate.toJSON()).toEqual(
      expect.objectContaining({
        currency: 'PEN',
        rate: 3.356,
        source: 'SUNAT',
      }),
    );
  });

  it('should throw error if currency is missing or empty', () => {
    expect(() => new ExchangeRate({ currency: '', rate: 3.35, source: 'SUNAT' })).toThrow(
      'Currency is required.',
    );
  });

  it('should throw error if rate is non-positive or NaN', () => {
    expect(() => new ExchangeRate({ currency: 'VES', rate: 0, source: 'BCV' })).toThrow(
      'Exchange rate must be a positive number.',
    );
    expect(() => new ExchangeRate({ currency: 'VES', rate: -10, source: 'BCV' })).toThrow(
      'Exchange rate must be a positive number.',
    );
    expect(() => new ExchangeRate({ currency: 'VES', rate: NaN, source: 'BCV' })).toThrow(
      'Exchange rate must be a positive number.',
    );
  });
});
