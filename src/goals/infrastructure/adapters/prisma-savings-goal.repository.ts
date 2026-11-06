import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { SavingsGoal } from '../../domain/savings-goal.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateSavingsGoalData,
  SavingsGoalRepositoryPort,
  UpdateSavingsGoalData,
} from '../../application/ports/savings-goal.repository.port';

/**
 * Row shape the adapter reads and writes for `savings_goals`.
 */
type SavingsGoalRow = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: Date | null;
  color: string | null;
  icon: string | null;
  priority: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The part of the client the ownership reads need, so the same guards run
 * both on the plain client and inside a transaction.
 */
type GoalClient = Pick<
  Prisma.TransactionClient,
  'savingsGoal' | 'account' | 'transaction'
>;

@Injectable()
export class PrismaSavingsGoalRepository implements SavingsGoalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: SavingsGoalRow): SavingsGoal {
    return new SavingsGoal(
      row.id,
      row.userId,
      row.name,
      row.targetAmount,
      row.currentAmount,
      row.currency,
      row.targetDate ? new Date(row.targetDate) : null,
      row.color,
      row.icon,
      row.isCompleted,
      new Date(row.createdAt),
      new Date(row.updatedAt),
      row.priority || 'MEDIUM',
    );
  }

  /**
   * Reads by { id, userId } so a foreign goal and a missing goal are
   * indistinguishable: the caller gets 404 and no mutation is attempted.
   */
  private async getOwnedGoal(
    client: GoalClient,
    id: string,
    userId: string,
  ): Promise<SavingsGoalRow> {
    const row = await client.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException(`Meta de ahorro con ID ${id} no encontrada.`);
    }

    return row;
  }

  /**
   * An account the user does not own is rejected before any balance moves or
   * any tracking transaction is created.
   */
  private async assertAccountOwned(
    client: GoalClient,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const account = await client.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new BadRequestException(
        'La cuenta indicada no pertenece al usuario.',
      );
    }
  }

  async create(data: CreateSavingsGoalData): Promise<SavingsGoal> {
    const isCompleted = (data.currentAmount || 0) >= data.targetAmount;
    const model = await this.prisma.savingsGoal.create({
      data: {
        userId: data.userId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || 0.0,
        currency: data.currency || 'USD',
        targetDate: data.targetDate || null,
        color: data.color || null,
        icon: data.icon || null,
        priority: data.priority || 'MEDIUM',
        isCompleted,
      },
    });

    return this.toDomain(model);
  }

  async findAllByUserId(userId: string): Promise<SavingsGoal[]> {
    const models = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return models.map((m) => this.toDomain(m));
  }

  async findById(id: string, userId: string): Promise<SavingsGoal> {
    return this.toDomain(await this.getOwnedGoal(this.prisma, id, userId));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateSavingsGoalData,
  ): Promise<SavingsGoal> {
    const existing = await this.getOwnedGoal(this.prisma, id, userId);

    const nextCurrent =
      data.currentAmount !== undefined
        ? data.currentAmount
        : existing.currentAmount;
    const nextTarget =
      data.targetAmount !== undefined
        ? data.targetAmount
        : existing.targetAmount;
    const isCompleted =
      data.isCompleted !== undefined
        ? data.isCompleted
        : nextCurrent >= nextTarget;

    const model = await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...data,
        isCompleted,
      },
    });

    return this.toDomain(model);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwnedGoal(this.prisma, id, userId);

    await this.prisma.savingsGoal.delete({
      where: { id },
    });
  }

  async deposit(
    id: string,
    userId: string,
    amount: number,
    accountId?: string,
  ): Promise<SavingsGoal> {
    return this.prisma.$transaction(async (tx) => {
      const goal = await this.getOwnedGoal(tx, id, userId);

      if (accountId) {
        await this.assertAccountOwned(tx, accountId, userId);

        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } },
        });

        // Create an expense or transfer tracking record
        await tx.transaction.create({
          data: {
            userId,
            accountId,
            amount,
            type: 'EXPENSE',
            date: new Date(),
            note: `Abono a meta: ${goal.name}`,
          },
        });
      }

      const updatedCurrent = goal.currentAmount + amount;
      const isCompleted = updatedCurrent >= goal.targetAmount;

      const updated = await tx.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: updatedCurrent,
          isCompleted,
        },
      });

      return this.toDomain(updated);
    });
  }

  async withdraw(
    id: string,
    userId: string,
    amount: number,
    accountId?: string,
  ): Promise<SavingsGoal> {
    return this.prisma.$transaction(async (tx) => {
      const goal = await this.getOwnedGoal(tx, id, userId);

      const updatedCurrent = Math.max(0, goal.currentAmount - amount);
      const isCompleted = updatedCurrent >= goal.targetAmount;

      if (accountId) {
        await this.assertAccountOwned(tx, accountId, userId);

        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        });

        // Create an income record from withdrawal
        await tx.transaction.create({
          data: {
            userId,
            accountId,
            amount,
            type: 'INCOME',
            date: new Date(),
            note: `Retiro de meta: ${goal.name}`,
          },
        });
      }

      const updated = await tx.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: updatedCurrent,
          isCompleted,
        },
      });

      return this.toDomain(updated);
    });
  }
}
