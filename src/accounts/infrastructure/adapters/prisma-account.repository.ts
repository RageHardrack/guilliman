import { Injectable, NotFoundException } from '@nestjs/common';

import { Account as PrismaAccount } from '@prisma/client';

import { Account } from '../../domain/account.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  AccountRepositoryPort,
  CreateAccountData,
} from '../../application/ports/account.repository.port';

@Injectable()
export class PrismaAccountRepository implements AccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAccountData): Promise<Account> {
    const raw = await this.prisma.account.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type satisfies PrismaAccount['type'],
        balance: data.balance ?? 0.0,
        currency: data.currency ?? 'USD',
      },
    });

    return this.mapToDomain(raw);
  }

  async findById(id: string, userId: string): Promise<Account> {
    const raw = await this.prisma.account.findFirst({
      where: { id, userId },
    });
    if (!raw) {
      throw new NotFoundException('Account not found');
    }
    return this.mapToDomain(raw);
  }

  async findByUserId(userId: string): Promise<Account[]> {
    const rawList = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rawList.map((raw: PrismaAccount) => this.mapToDomain(raw));
  }

  async updateBalance(id: string, delta: number): Promise<Account> {
    const raw = await this.prisma.account.update({
      where: { id },
      data: { balance: { increment: delta } },
    });
    return this.mapToDomain(raw);
  }

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<CreateAccountData, 'userId' | 'currency'>>,
  ): Promise<Account> {
    await this.getOwnedRow(id, userId);
    const raw = await this.prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && {
          type: data.type satisfies PrismaAccount['type'],
        }),
        ...(data.balance !== undefined && { balance: data.balance }),
      },
    });
    return this.mapToDomain(raw);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    await this.getOwnedRow(id, userId);
    await this.prisma.account.delete({ where: { id } });
    return true;
  }

  async reconcile(
    id: string,
    userId: string,
    realBalance: number,
    note?: string,
  ): Promise<{ account: Account; discrepancy: number }> {
    return this.prisma.$transaction(async (tx) => {
      // Ownership is checked inside the transaction: a foreign or missing
      // account never reaches the adjustment transaction or the balance set.
      const account = await tx.account.findFirst({ where: { id, userId } });
      if (!account) {
        throw new NotFoundException('Account not found');
      }

      const discrepancy =
        Math.round((realBalance - account.balance) * 100) / 100;

      if (discrepancy !== 0) {
        // Create an automatic adjustment transaction
        await tx.transaction.create({
          data: {
            userId: account.userId,
            accountId: account.id,
            amount: Math.abs(discrepancy),
            type: discrepancy > 0 ? 'INCOME' : 'EXPENSE',
            date: new Date(),
            note:
              note ||
              `Ajuste de saldo / Conciliación (${discrepancy > 0 ? '+' : ''}${discrepancy} ${account.currency})`,
          },
        });

        // Update account balance to the verified real balance
        const updated = await tx.account.update({
          where: { id },
          data: { balance: realBalance },
        });

        return {
          account: this.mapToDomain(updated),
          discrepancy,
        };
      }

      return {
        account: this.mapToDomain(account),
        discrepancy: 0,
      };
    });
  }

  /**
   * Reads by { id, userId } so foreign and missing accounts both look
   * absent: the caller gets 404 and no mutation is attempted.
   */
  private async getOwnedRow(
    id: string,
    userId: string,
  ): Promise<PrismaAccount> {
    const row = await this.prisma.account.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Account not found');
    }
    return row;
  }

  private mapToDomain(raw: PrismaAccount): Account {
    return new Account({
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      type: raw.type,
      balance: raw.balance,
      currency: raw.currency,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
