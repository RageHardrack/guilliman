import { Injectable, Logger } from '@nestjs/common';

import { ExchangeRateSource } from '../../domain/exchange-rate.entity';
import {
  FetchedRateResult,
  OfficialRateProviderPort,
} from '../../application/ports/official-rate-provider.port';

@Injectable()
export class SunatRateProvider implements OfficialRateProviderPort {
  readonly currency = 'PEN';
  readonly source: ExchangeRateSource = 'SUNAT';
  private readonly logger = new Logger(SunatRateProvider.name);

  async fetchCurrentRate(): Promise<FetchedRateResult> {
    // 1. Primary Endpoint: apis.net.pe SUNAT
    try {
      const res = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = (await res.json()) as { venta?: number; compra?: number };
        const rate = data.venta || data.compra;
        if (rate && rate > 0) {
          this.logger.log(`SUNAT Rate fetched successfully: ${rate}`);
          return {
            currency: this.currency,
            rate,
            source: this.source,
          };
        }
      }
    } catch (err) {
      this.logger.warn(
        `Primary SUNAT endpoint failed: ${(err as Error).message}. Attempting fallback...`,
      );
    }

    // 2. Secondary Fallback Endpoint: open.er-api.com
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = (await res.json()) as { rates?: { PEN?: number } };
        const rate = data.rates?.PEN;
        if (rate && rate > 0) {
          this.logger.log(`SUNAT Fallback Rate (PEN) fetched: ${rate}`);
          return {
            currency: this.currency,
            rate,
            source: this.source,
          };
        }
      }
    } catch (err) {
      this.logger.error(
        `Secondary SUNAT fallback failed: ${(err as Error).message}`,
      );
    }

    throw new Error(
      'All SUNAT exchange rate providers failed to return a valid rate.',
    );
  }
}
