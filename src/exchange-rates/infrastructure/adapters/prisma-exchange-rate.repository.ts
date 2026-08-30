import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ExchangeRate } from '../../domain/exchange-rate.entity';
import { ExchangeRateRepositoryPort } from '../../application/ports/exchange-rate.repository.port';

@Injectable()
export class PrismaExchangeRateRepository implements ExchangeRateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ExchangeRate[]> {
    const records = await this.prisma.exchangeRate.findMany();
    return records.map(
      (r) =>
        new ExchangeRate({
          id: r.id,
          currency: r.currency,
          rate: r.rate,
          source: r.source as any,
          updatedAt: r.updatedAt,
          createdAt: r.createdAt,
        }),
    );
  }

  async findByCurrency(currency: string): Promise<ExchangeRate | null> {
    const record = await this.prisma.exchangeRate.findUnique({
      where: { currency: currency.toUpperCase() },
    });
    if (!record) return null;
    return new ExchangeRate({
      id: record.id,
      currency: record.currency,
      rate: record.rate,
      source: record.source as any,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    });
  }

  async upsertRate(exchangeRate: ExchangeRate): Promise<ExchangeRate> {
    const record = await this.prisma.exchangeRate.upsert({
      where: { currency: exchangeRate.currency },
      update: {
        rate: exchangeRate.rate,
        source: exchangeRate.source,
      },
      create: {
        currency: exchangeRate.currency,
        rate: exchangeRate.rate,
        source: exchangeRate.source,
      },
    });

    return new ExchangeRate({
      id: record.id,
      currency: record.currency,
      rate: record.rate,
      source: record.source as any,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    });
  }
}
