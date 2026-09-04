import { Injectable, Logger } from '@nestjs/common';

import { ExchangeRateSource } from '../../domain/exchange-rate.entity';
import {
  FetchedRateResult,
  OfficialRateProviderPort,
} from '../../application/ports/official-rate-provider.port';

@Injectable()
export class BcvRateProvider implements OfficialRateProviderPort {
  readonly currency = 'VES';
  readonly source: ExchangeRateSource = 'BCV';
  private readonly logger = new Logger(BcvRateProvider.name);

  async fetchCurrentRate(): Promise<FetchedRateResult> {
    // 1. Primary Endpoint: DolarAPI Venezuela (Oficial BCV)
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          promedio?: number;
          venta?: number;
          compra?: number;
        };
        const rate = data.promedio || data.venta || data.compra;
        if (rate && rate > 0) {
          this.logger.log(
            `BCV Rate fetched successfully from DolarAPI: ${rate}`,
          );
          return {
            currency: this.currency,
            rate,
            source: this.source,
          };
        }
      }
    } catch (err) {
      this.logger.warn(
        `Primary BCV endpoint failed: ${(err as Error).message}. Attempting fallback...`,
      );
    }

    // 2. Secondary Fallback Endpoint: pydolarve.org BCV
    try {
      const res = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          monitors?: { usd?: { price?: number } };
        };
        const rate = data.monitors?.usd?.price;
        if (rate && rate > 0) {
          this.logger.log(`BCV Fallback Rate fetched: ${rate}`);
          return {
            currency: this.currency,
            rate,
            source: this.source,
          };
        }
      }
    } catch (err) {
      this.logger.error(
        `Secondary BCV fallback failed: ${(err as Error).message}`,
      );
    }

    throw new Error(
      'All BCV exchange rate providers failed to return a valid rate.',
    );
  }
}
