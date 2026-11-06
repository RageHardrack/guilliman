import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Transaction as PrismaTransaction } from '@prisma/client';

import { Transaction } from '../../domain/transaction.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateTransactionData,
  TransactionRepositoryPort,
  UpdateTransactionData,
} from '../../application/ports/transaction.repository.port';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransactionData): Promise<Transaction> {
    // Ownership of every referenced account and the category is verified
    // before the transaction: a foreign reference must never create a row
    // nor move a balance.
    await this.assertReferencesOwned(data.userId, {
      accountId: data.accountId,
      destinationAccountId: data.destinationAccountId,
      categoryId: data.categoryId,
    });

    return await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          destinationAccountId: data.destinationAccountId,
          categoryId: data.categoryId,
          amount: data.amount,
          destinationAmount:
            data.destinationAmount ??
            (data.type === 'TRANSFER' ? data.amount : null),
          exchangeRate: data.exchangeRate ?? null,
          type: data.type,
          date: data.date ?? new Date(),
          note: data.note,
          taxCategory: data.taxCategory || 'NONE',
          taxDocumentType: data.taxDocumentType || 'NONE',
          taxDocumentNumber: data.taxDocumentNumber,
          taxWithholdingAmount: data.taxWithholdingAmount ?? 0,
          taxDeductionType: data.taxDeductionType || 'NONE',
        },
      });

      // Update account balances based on transaction type
      if (data.type === 'INCOME') {
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: data.amount } },
        });
      } else if (data.type === 'EXPENSE') {
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { decrement: data.amount } },
        });
      } else if (data.type === 'TRANSFER' && data.destinationAccountId) {
        const destAmount = data.destinationAmount ?? data.amount;
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { decrement: data.amount } },
        });
        await tx.account.update({
          where: { id: data.destinationAccountId },
          data: { balance: { increment: destAmount } },
        });
      }

      return this.mapToDomain(created);
    });
  }

  async findById(id: string, userId: string): Promise<Transaction> {
    return this.mapToDomain(await this.getOwnedRow(id, userId));
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    const rawList = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return rawList.map((raw: PrismaTransaction) => this.mapToDomain(raw));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateTransactionData,
  ): Promise<Transaction> {
    const existing = await this.getOwnedRow(id, userId);

    // Verify the new references before reverting or applying any balance:
    // a foreign account or category must leave the row and the balances
    // untouched.
    await this.assertReferencesOwned(userId, {
      accountId: data.accountId,
      destinationAccountId: data.destinationAccountId,
      categoryId: data.categoryId,
    });

    return await this.prisma.$transaction(async (tx) => {
      // 1. Revert previous transaction's balance effect
      if (existing.type === 'INCOME') {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: existing.amount } },
        });
      } else if (existing.type === 'EXPENSE') {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        });
      } else if (
        existing.type === 'TRANSFER' &&
        existing.destinationAccountId
      ) {
        const prevDestAmount = existing.destinationAmount ?? existing.amount;
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        });
        await tx.account.update({
          where: { id: existing.destinationAccountId },
          data: { balance: { decrement: prevDestAmount } },
        });
      }

      // 2. Update the transaction record
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          ...(data.accountId !== undefined && { accountId: data.accountId }),
          ...(data.destinationAccountId !== undefined && {
            destinationAccountId: data.destinationAccountId,
          }),
          ...(data.categoryId !== undefined && {
            categoryId: data.categoryId,
          }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.destinationAmount !== undefined && {
            destinationAmount: data.destinationAmount,
          }),
          ...(data.exchangeRate !== undefined && {
            exchangeRate: data.exchangeRate,
          }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.note !== undefined && { note: data.note }),
          ...(data.taxCategory !== undefined && {
            taxCategory: data.taxCategory,
          }),
          ...(data.taxDocumentType !== undefined && {
            taxDocumentType: data.taxDocumentType,
          }),
          ...(data.taxDocumentNumber !== undefined && {
            taxDocumentNumber: data.taxDocumentNumber,
          }),
          ...(data.taxWithholdingAmount !== undefined && {
            taxWithholdingAmount: data.taxWithholdingAmount,
          }),
          ...(data.taxDeductionType !== undefined && {
            taxDeductionType: data.taxDeductionType,
          }),
        },
      });

      // 3. Apply new transaction's balance effect
      if (updated.type === 'INCOME') {
        await tx.account.update({
          where: { id: updated.accountId },
          data: { balance: { increment: updated.amount } },
        });
      } else if (updated.type === 'EXPENSE') {
        await tx.account.update({
          where: { id: updated.accountId },
          data: { balance: { decrement: updated.amount } },
        });
      } else if (updated.type === 'TRANSFER' && updated.destinationAccountId) {
        const nextDestAmount = updated.destinationAmount ?? updated.amount;
        await tx.account.update({
          where: { id: updated.accountId },
          data: { balance: { decrement: updated.amount } },
        });
        await tx.account.update({
          where: { id: updated.destinationAccountId },
          data: { balance: { increment: nextDestAmount } },
        });
      }

      return this.mapToDomain(updated);
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.getOwnedRow(id, userId);

    await this.prisma.$transaction(async (tx) => {
      // Revert balance changes safely if accounts exist
      if (existing.type === 'INCOME') {
        const acc = await tx.account.findUnique({
          where: { id: existing.accountId },
        });
        if (acc) {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { decrement: existing.amount } },
          });
        }
      } else if (existing.type === 'EXPENSE') {
        const acc = await tx.account.findUnique({
          where: { id: existing.accountId },
        });
        if (acc) {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: existing.amount } },
          });
        }
      } else if (
        existing.type === 'TRANSFER' &&
        existing.destinationAccountId
      ) {
        const prevDestAmount = existing.destinationAmount ?? existing.amount;
        const srcAcc = await tx.account.findUnique({
          where: { id: existing.accountId },
        });
        if (srcAcc) {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: existing.amount } },
          });
        }
        const destAcc = await tx.account.findUnique({
          where: { id: existing.destinationAccountId },
        });
        if (destAcc) {
          await tx.account.update({
            where: { id: existing.destinationAccountId },
            data: { balance: { decrement: prevDestAmount } },
          });
        }
      }

      await tx.transaction.delete({ where: { id } });
    });

    return true;
  }

  /**
   * Reads by { id, userId } so foreign and missing transactions both look
   * absent: the caller gets 404 and no balance is reverted or applied.
   */
  private async getOwnedRow(
    id: string,
    userId: string,
  ): Promise<PrismaTransaction> {
    const row = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Transaction not found');
    }
    return row;
  }

  /**
   * Rejects with 400 any provided reference that is not a row owned by the
   * token user. Runs before every write, so a rejected payload can never
   * create a transaction nor move a balance.
   */
  private async assertReferencesOwned(
    userId: string,
    references: {
      accountId?: string | null;
      destinationAccountId?: string | null;
      categoryId?: string | null;
    },
  ): Promise<void> {
    const accountRefs = [
      { id: references.accountId, kind: 'account' },
      { id: references.destinationAccountId, kind: 'destination account' },
    ];

    for (const reference of accountRefs) {
      if (!reference.id) {
        continue;
      }
      const found = await this.prisma.account.findFirst({
        where: { id: reference.id, userId },
      });
      if (!found) {
        throw new BadRequestException(
          `Referenced ${reference.kind} does not belong to the user`,
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

  private mapToDomain(raw: PrismaTransaction): Transaction {
    return new Transaction({
      id: raw.id,
      userId: raw.userId,
      accountId: raw.accountId,
      destinationAccountId: raw.destinationAccountId,
      categoryId: raw.categoryId,
      amount: raw.amount,
      destinationAmount: raw.destinationAmount,
      exchangeRate: raw.exchangeRate,
      type: raw.type,
      date: raw.date,
      note: raw.note,
      taxCategory: raw.taxCategory,
      taxDocumentType: raw.taxDocumentType,
      taxDocumentNumber: raw.taxDocumentNumber,
      taxWithholdingAmount: raw.taxWithholdingAmount,
      taxDeductionType: raw.taxDeductionType,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
