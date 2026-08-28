import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  RecurrenceFrequency,
  Subscription,
} from '../../domain/subscription.entity';
import { SubscriptionRepositoryPort } from '../../application/ports/subscription.repository.port';

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    accountId: string;
    categoryId?: string | null;
    name: string;
    amount: number;
    currency?: string;
    frequency?: RecurrenceFrequency;
    customIntervalDays?: number | null;
    nextDueDate: Date;
    isActive?: boolean;
  }): Promise<Subscription> {
    const created = await this.prisma.subscription.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        name: data.name,
        amount: data.amount,
        currency: data.currency || 'USD',
        frequency: (data.frequency as any) || 'MONTHLY',
        customIntervalDays: data.customIntervalDays,
        nextDueDate: data.nextDueDate,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return new Subscription({
      id: created.id,
      userId: created.userId,
      accountId: created.accountId,
      categoryId: created.categoryId,
      name: created.name,
      amount: created.amount,
      currency: created.currency,
      frequency: created.frequency,
      customIntervalDays: created.customIntervalDays,
      nextDueDate: created.nextDueDate,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextDueDate: 'asc' },
    });

    return records.map(
      (r) =>
        new Subscription({
          id: r.id,
          userId: r.userId,
          accountId: r.accountId,
          categoryId: r.categoryId,
          name: r.name,
          amount: r.amount,
          currency: r.currency,
          frequency: r.frequency,
          customIntervalDays: r.customIntervalDays,
          nextDueDate: r.nextDueDate,
          isActive: r.isActive,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }),
    );
  }

  async findById(id: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!record) return null;

    return new Subscription({
      id: record.id,
      userId: record.userId,
      accountId: record.accountId,
      categoryId: record.categoryId,
      name: record.name,
      amount: record.amount,
      currency: record.currency,
      frequency: record.frequency,
      customIntervalDays: record.customIntervalDays,
      nextDueDate: record.nextDueDate,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async update(
    id: string,
    data: Partial<{
      accountId: string;
      categoryId?: string | null;
      name: string;
      amount: number;
      currency: string;
      frequency: RecurrenceFrequency;
      customIntervalDays?: number | null;
      nextDueDate: Date;
      isActive: boolean;
    }>,
  ): Promise<Subscription> {
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(data.accountId && { accountId: data.accountId }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.name && { name: data.name }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.frequency && { frequency: data.frequency as any }),
        ...(data.customIntervalDays !== undefined && {
          customIntervalDays: data.customIntervalDays,
        }),
        ...(data.nextDueDate && { nextDueDate: data.nextDueDate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return new Subscription({
      id: updated.id,
      userId: updated.userId,
      accountId: updated.accountId,
      categoryId: updated.categoryId,
      name: updated.name,
      amount: updated.amount,
      currency: updated.currency,
      frequency: updated.frequency,
      customIntervalDays: updated.customIntervalDays,
      nextDueDate: updated.nextDueDate,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }

  async recordPayment(
    id: string,
    paymentDate?: Date,
  ): Promise<{ subscription: Subscription; transactionId: string }> {
    const subRecord = await this.findById(id);
    if (!subRecord) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    const txDate = paymentDate || new Date();
    const nextDate = subRecord.calculateNextDueDate();

    // Atomic transaction: create expense transaction, decrement account balance, advance due date
    const result = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId: subRecord.userId,
          accountId: subRecord.accountId,
          categoryId: subRecord.categoryId,
          amount: subRecord.amount,
          type: 'EXPENSE',
          date: txDate,
          note: `Pago recurrente: ${subRecord.name}`,
        },
      });

      await tx.account.update({
        where: { id: subRecord.accountId },
        data: {
          balance: { decrement: subRecord.amount },
        },
      });

      const updatedSub = await tx.subscription.update({
        where: { id: subRecord.id },
        data: {
          nextDueDate: nextDate,
        },
      });

      return {
        transactionId: createdTx.id,
        subscription: updatedSub,
      };
    });

    return {
      transactionId: result.transactionId,
      subscription: new Subscription({
        id: result.subscription.id,
        userId: result.subscription.userId,
        accountId: result.subscription.accountId,
        categoryId: result.subscription.categoryId,
        name: result.subscription.name,
        amount: result.subscription.amount,
        currency: result.subscription.currency,
        frequency: result.subscription.frequency,
        nextDueDate: result.subscription.nextDueDate,
        isActive: result.subscription.isActive,
        createdAt: result.subscription.createdAt,
        updatedAt: result.subscription.updatedAt,
      }),
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.subscription.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
