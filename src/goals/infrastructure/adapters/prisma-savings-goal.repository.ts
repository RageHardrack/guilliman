import { Injectable, NotFoundException } from '@nestjs/common';

import { SavingsGoal } from '../../domain/savings-goal.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateSavingsGoalData,
  SavingsGoalRepositoryPort,
  UpdateSavingsGoalData,
} from '../../application/ports/savings-goal.repository.port';

@Injectable()
export class PrismaSavingsGoalRepository implements SavingsGoalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: any): SavingsGoal {
    return new SavingsGoal(
      model.id,
      model.userId,
      model.name,
      model.targetAmount,
      model.currentAmount,
      model.currency,
      model.targetDate ? new Date(model.targetDate) : null,
      model.color,
      model.icon,
      model.isCompleted,
      new Date(model.createdAt),
      new Date(model.updatedAt),
    );
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

  async findById(id: string): Promise<SavingsGoal | null> {
    const model = await this.prisma.savingsGoal.findUnique({
      where: { id },
    });

    return model ? this.toDomain(model) : null;
  }

  async update(id: string, data: UpdateSavingsGoalData): Promise<SavingsGoal> {
    const existing = await this.prisma.savingsGoal.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Meta de ahorro con ID ${id} no encontrada.`);
    }

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

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.savingsGoal.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Meta de ahorro con ID ${id} no encontrada.`);
    }

    await this.prisma.savingsGoal.delete({
      where: { id },
    });
  }

  async deposit(
    id: string,
    amount: number,
    accountId?: string,
  ): Promise<SavingsGoal> {
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({ where: { id } });
      if (!goal) {
        throw new NotFoundException(
          `Meta de ahorro con ID ${id} no encontrada.`,
        );
      }

      if (accountId) {
        const account = await tx.account.findUnique({
          where: { id: accountId },
        });
        if (account) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } },
          });

          // Create an expense or transfer tracking record
          await tx.transaction.create({
            data: {
              userId: goal.userId,
              accountId,
              amount,
              type: 'EXPENSE',
              date: new Date(),
              note: `Abono a meta: ${goal.name}`,
            },
          });
        }
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
    amount: number,
    accountId?: string,
  ): Promise<SavingsGoal> {
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({ where: { id } });
      if (!goal) {
        throw new NotFoundException(
          `Meta de ahorro con ID ${id} no encontrada.`,
        );
      }

      const updatedCurrent = Math.max(0, goal.currentAmount - amount);
      const isCompleted = updatedCurrent >= goal.targetAmount;

      if (accountId) {
        const account = await tx.account.findUnique({
          where: { id: accountId },
        });
        if (account) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment: amount } },
          });

          // Create an income record from withdrawal
          await tx.transaction.create({
            data: {
              userId: goal.userId,
              accountId,
              amount,
              type: 'INCOME',
              date: new Date(),
              note: `Retiro de meta: ${goal.name}`,
            },
          });
        }
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
