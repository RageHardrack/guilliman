import { Injectable } from '@nestjs/common';

import { Account as PrismaAccount } from '@prisma/client';

import { Account, AccountType } from '../../domain/account.entity';
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
        type: data.type as any,
        balance: data.balance ?? 0.0,
        currency: data.currency ?? 'USD',
      },
    });

    return this.mapToDomain(raw);
  }

  async findById(id: string): Promise<Account | null> {
    const raw = await this.prisma.account.findUnique({ where: { id } });
    return raw ? this.mapToDomain(raw) : null;
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
    data: Partial<Omit<CreateAccountData, 'userId'>>,
  ): Promise<Account> {
    const raw = await this.prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type as any }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.currency !== undefined && { currency: data.currency }),
      },
    });
    return this.mapToDomain(raw);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.account.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async reconcile(
    id: string,
    realBalance: number,
    note?: string,
  ): Promise<{ account: Account; discrepancy: number }> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id } });
      if (!account) {
        throw new Error(`Cuenta con ID ${id} no encontrada.`);
      }

      const discrepancy = Math.round((realBalance - account.balance) * 100) / 100;

      if (discrepancy !== 0) {
        // Create an automatic adjustment transaction
        await tx.transaction.create({
          data: {
            userId: account.userId,
            accountId: account.id,
            amount: Math.abs(discrepancy),
            type: discrepancy > 0 ? 'INCOME' : 'EXPENSE',
            date: new Date(),
            note: note || `Ajuste de saldo / Conciliación (${discrepancy > 0 ? '+' : ''}${discrepancy} ${account.currency})`,
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

  private mapToDomain(raw: PrismaAccount): Account {
    return new Account({
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      type: raw.type as AccountType,
      balance: raw.balance,
      currency: raw.currency,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
