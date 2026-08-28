import { Injectable } from '@nestjs/common';

import { Transaction as PrismaTransaction } from '@prisma/client';

import { Transaction } from '../../domain/transaction.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateTransactionData,
  TransactionRepositoryPort,
} from '../../application/ports/transaction.repository.port';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransactionData): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          destinationAccountId: data.destinationAccountId,
          categoryId: data.categoryId,
          amount: data.amount,
          type: data.type as any,
          date: data.date ?? new Date(),
          note: data.note,
          taxCategory: (data.taxCategory as any) || 'NONE',
          taxDocumentType: (data.taxDocumentType as any) || 'NONE',
          taxDocumentNumber: data.taxDocumentNumber,
          taxWithholdingAmount: data.taxWithholdingAmount ?? 0,
          taxDeductionType: (data.taxDeductionType as any) || 'NONE',
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
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { decrement: data.amount } },
        });
        await tx.account.update({
          where: { id: data.destinationAccountId },
          data: { balance: { increment: data.amount } },
        });
      }

      return this.mapToDomain(created);
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    const raw = await this.prisma.transaction.findUnique({ where: { id } });
    return raw ? this.mapToDomain(raw) : null;
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
    data: Partial<Omit<CreateTransactionData, 'userId'>>,
  ): Promise<Transaction> {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Transaction with id ${id} not found`);
    }

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
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        });
        await tx.account.update({
          where: { id: existing.destinationAccountId },
          data: { balance: { decrement: existing.amount } },
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
          ...(data.type !== undefined && { type: data.type as any }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.note !== undefined && { note: data.note }),
          ...(data.taxCategory !== undefined && {
            taxCategory: data.taxCategory as any,
          }),
          ...(data.taxDocumentType !== undefined && {
            taxDocumentType: data.taxDocumentType as any,
          }),
          ...(data.taxDocumentNumber !== undefined && {
            taxDocumentNumber: data.taxDocumentNumber,
          }),
          ...(data.taxWithholdingAmount !== undefined && {
            taxWithholdingAmount: data.taxWithholdingAmount,
          }),
          ...(data.taxDeductionType !== undefined && {
            taxDeductionType: data.taxDeductionType as any,
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
        await tx.account.update({
          where: { id: updated.accountId },
          data: { balance: { decrement: updated.amount } },
        });
        await tx.account.update({
          where: { id: updated.destinationAccountId },
          data: { balance: { increment: updated.amount } },
        });
      }

      return this.mapToDomain(updated);
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      const existing = await this.prisma.transaction.findUnique({
        where: { id },
      });
      if (!existing) return false;

      await this.prisma.$transaction(async (tx) => {
        // Revert balance changes
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
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: existing.amount } },
          });
          await tx.account.update({
            where: { id: existing.destinationAccountId },
            data: { balance: { decrement: existing.amount } },
          });
        }

        await tx.transaction.delete({ where: { id } });
      });

      return true;
    } catch {
      return false;
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
