import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Budget } from '../../domain/budget.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  BudgetRepositoryPort,
  CreateBudgetData,
  UpdateBudgetData,
} from '../../application/ports/budget.repository.port';

type BudgetRow = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  period: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaBudgetRepository implements BudgetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBudgetData): Promise<Budget> {
    // The upsert keys on userId_categoryId, so the category must belong to
    // the token user before anything is written: attaching a foreign
    // category would overwrite that user's budget for the category.
    await this.assertCategoryOwned(data.categoryId, data.userId);

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

    return this.toDomain(created);
  }

  async findByUserId(userId: string): Promise<Budget[]> {
    const records = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findById(id: string, userId: string): Promise<Budget> {
    return this.toDomain(await this.getOwnedRow(id, userId));
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

    return this.toDomain(record);
  }

  async update(
    id: string,
    userId: string,
    data: UpdateBudgetData,
  ): Promise<Budget> {
    await this.getOwnedRow(id, userId);

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.period !== undefined && { period: data.period }),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwnedRow(id, userId);
    await this.prisma.budget.delete({ where: { id } });
  }

  /**
   * Reads by { id, userId } so foreign and missing budgets both look
   * absent: the caller gets 404 and no mutation is attempted.
   */
  private async getOwnedRow(id: string, userId: string): Promise<BudgetRow> {
    const row = await this.prisma.budget.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Budget not found');
    }
    return row;
  }

  private async assertCategoryOwned(
    categoryId: string,
    userId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new BadRequestException(
        'Referenced category does not belong to the user',
      );
    }
  }

  private toDomain(row: BudgetRow): Budget {
    return new Budget({
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      amount: row.amount,
      currency: row.currency,
      period: row.period,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
