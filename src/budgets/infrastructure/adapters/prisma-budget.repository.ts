import { Injectable } from '@nestjs/common';

import { Budget } from '../../domain/budget.entity';
import { BudgetRepositoryPort } from '../../application/ports/budget.repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class PrismaBudgetRepository implements BudgetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    categoryId: string;
    amount: number;
    currency?: string;
    period?: string;
  }): Promise<Budget> {
    const created = await this.prisma.budget.upsert({
      where: {
        userId_categoryId: {
          userId: data.userId,
          categoryId: data.categoryId,
        },
      },
      update: {
        amount: data.amount,
        currency: data.currency || 'USD',
        period: data.period || 'MONTHLY',
      },
      create: {
        userId: data.userId,
        categoryId: data.categoryId,
        amount: data.amount,
        currency: data.currency || 'USD',
        period: data.period || 'MONTHLY',
      },
    });

    return new Budget({
      id: created.id,
      userId: created.userId,
      categoryId: created.categoryId,
      amount: created.amount,
      currency: created.currency,
      period: created.period,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<Budget[]> {
    const records = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (r) =>
        new Budget({
          id: r.id,
          userId: r.userId,
          categoryId: r.categoryId,
          amount: r.amount,
          currency: r.currency,
          period: r.period,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }),
    );
  }

  async findById(id: string): Promise<Budget | null> {
    const record = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!record) return null;

    return new Budget({
      id: record.id,
      userId: record.userId,
      categoryId: record.categoryId,
      amount: record.amount,
      currency: record.currency,
      period: record.period,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findByUserAndCategory(
    userId: string,
    categoryId: string,
  ): Promise<Budget | null> {
    const record = await this.prisma.budget.findUnique({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
    });

    if (!record) return null;

    return new Budget({
      id: record.id,
      userId: record.userId,
      categoryId: record.categoryId,
      amount: record.amount,
      currency: record.currency,
      period: record.period,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async update(
    id: string,
    data: Partial<{
      amount: number;
      currency: string;
      period: string;
    }>,
  ): Promise<Budget> {
    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.period !== undefined && { period: data.period }),
      },
    });

    return new Budget({
      id: updated.id,
      userId: updated.userId,
      categoryId: updated.categoryId,
      amount: updated.amount,
      currency: updated.currency,
      period: updated.period,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.budget.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
