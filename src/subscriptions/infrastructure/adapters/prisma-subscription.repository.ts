import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  RecurrenceFrequency,
  Subscription,
} from '../../domain/subscription.entity';
import {
  CreateSubscriptionData,
  RecordPaymentOptions,
  SubscriptionRepositoryPort,
  UpdateSubscriptionData,
} from '../../application/ports/subscription.repository.port';

type SubscriptionRow = {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  name: string;
  amount: number;
  currency: string;
  frequency: RecurrenceFrequency;
  customIntervalDays: number | null;
  nextDueDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSubscriptionData): Promise<Subscription> {
    await this.assertReferencesOwned(
      { accountId: data.accountId, categoryId: data.categoryId },
      data.userId,
    );

    const created = await this.prisma.subscription.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        name: data.name,
        amount: data.amount,
        currency: data.currency || 'USD',
        frequency: data.frequency || 'MONTHLY',
        customIntervalDays: data.customIntervalDays ?? null,
        nextDueDate: data.nextDueDate,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return this.toDomain(created);
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextDueDate: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findById(id: string, userId: string): Promise<Subscription> {
    return this.toDomain(await this.getOwnedRow(id, userId));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateSubscriptionData,
  ): Promise<Subscription> {
    await this.getOwnedRow(id, userId);

    if (data.accountId !== undefined || data.categoryId !== undefined) {
      await this.assertReferencesOwned(
        {
          accountId: data.accountId,
          categoryId: data.categoryId,
        },
        userId,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(data.accountId && { accountId: data.accountId }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.name && { name: data.name }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.frequency && { frequency: data.frequency }),
        ...(data.customIntervalDays !== undefined && {
          customIntervalDays: data.customIntervalDays,
        }),
        ...(data.nextDueDate && { nextDueDate: data.nextDueDate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.toDomain(updated);
  }

  async recordPayment(
    id: string,
    userId: string,
    options?: RecordPaymentOptions,
  ): Promise<{ subscription: Subscription; transactionId: string }> {
    const subRecord = this.toDomain(await this.getOwnedRow(id, userId));

    const txDate = options?.paymentDate || new Date();
    const nextDate = subRecord.calculateNextDueDate();
    const targetAccountId = options?.accountId || subRecord.accountId;
    const finalDebitedAmount =
      options?.debitedAmount !== undefined && options.debitedAmount !== null
        ? options.debitedAmount
        : subRecord.amount;
    const txNote = options?.note || `Pago recurrente: ${subRecord.name}`;

    // The alternative account arrives from the body: it must belong to the
    // token user before any transaction or balance movement is attempted.
    await this.assertReferencesOwned({ accountId: targetAccountId }, userId);

    // Atomic transaction: create expense transaction, decrement account balance, advance due date
    const result = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId: subRecord.userId,
          accountId: targetAccountId,
          categoryId: subRecord.categoryId,
          amount: finalDebitedAmount,
          destinationAmount: options?.destinationAmount,
          exchangeRate: options?.exchangeRate,
          type: 'EXPENSE',
          date: txDate,
          note: txNote,
        },
      });

      await tx.account.update({
        where: { id: targetAccountId },
        data: {
          balance: { decrement: finalDebitedAmount },
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
      subscription: this.toDomain(result.subscription),
    };
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwnedRow(id, userId);
    await this.prisma.subscription.delete({ where: { id } });
  }

  /**
   * Reads by { id, userId } so foreign and missing subscriptions both look
   * absent: the caller gets 404 and no mutation is attempted.
   */
  private async getOwnedRow(
    id: string,
    userId: string,
  ): Promise<SubscriptionRow> {
    const record = await this.prisma.subscription.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw new NotFoundException('Subscription not found');
    }
    return record;
  }

  /**
   * Validates referenced accounts and categories against the token owner
   * before any write, so a foreign reference can never move a balance or
   * save a row.
   */
  private async assertReferencesOwned(
    references: { accountId?: string; categoryId?: string | null },
    userId: string,
  ): Promise<void> {
    if (references.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: references.accountId, userId },
      });
      if (!account) {
        throw new BadRequestException(
          'Referenced account does not belong to the user',
        );
      }
    }

    if (references.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: references.categoryId, userId },
      });
      if (!category) {
        throw new BadRequestException(
          'Referenced category does not belong to the user',
        );
      }
    }
  }

  private toDomain(record: SubscriptionRow): Subscription {
    return new Subscription(record);
  }
}
