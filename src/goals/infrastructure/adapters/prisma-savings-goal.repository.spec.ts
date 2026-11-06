import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { SavingsGoal } from '../../domain/savings-goal.entity';
import { PrismaSavingsGoalRepository } from './prisma-savings-goal.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

/**
 * Row shape the adapter reads from Prisma for `savings_goals`.
 */
const ownedRow = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Fondo de Emergencia',
  targetAmount: 5000,
  currentAmount: 1500,
  currency: 'USD',
  targetDate: new Date('2026-12-31T00:00:00.000Z'),
  color: '#10B981',
  icon: 'i-heroicons-shield-check',
  isCompleted: false,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  priority: 'HIGH',
};

const ownedAccount = { id: 'acc-1', userId: 'user-1', balance: 800 };

const validCreate = {
  userId: 'user-1',
  name: 'Fondo de Emergencia',
  targetAmount: 5000,
  currentAmount: 1500,
  currency: 'USD',
  targetDate: new Date('2026-12-31T00:00:00.000Z'),
  color: '#10B981',
  icon: 'i-heroicons-shield-check',
  priority: 'HIGH',
};

interface GoalDelegateDouble {
  findFirst: Mock<
    (args: {
      where: { id: string; userId: string };
    }) => Promise<typeof ownedRow | null>
  >;
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface AccountDelegateDouble {
  findFirst: Mock<
    (args: {
      where: { id: string; userId: string };
    }) => Promise<typeof ownedAccount | null>
  >;
  update: ReturnType<typeof vi.fn>;
}

interface TransactionDelegateDouble {
  create: ReturnType<typeof vi.fn>;
}

interface PrismaDouble {
  $transaction: Mock<
    (fn: (tx: TransactionClientDouble) => Promise<unknown>) => Promise<unknown>
  >;
  savingsGoal: GoalDelegateDouble;
  account: AccountDelegateDouble;
  transaction: TransactionDelegateDouble;
}

/**
 * The delegates a goal write runs against; the same objects are handed to the
 * transaction callback so write assertions cover both paths.
 */
interface TransactionClientDouble {
  savingsGoal: GoalDelegateDouble;
  account: AccountDelegateDouble;
  transaction: TransactionDelegateDouble;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

describe('PrismaSavingsGoalRepository', () => {
  let repository: PrismaSavingsGoalRepository;
  let prisma: PrismaDouble;

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(),
      savingsGoal: {
        findFirst: vi.fn().mockResolvedValue(ownedRow),
        findUnique: vi.fn().mockResolvedValue(ownedRow),
        findMany: vi.fn().mockResolvedValue([ownedRow]),
        create: vi.fn().mockResolvedValue(ownedRow),
        update: vi.fn().mockResolvedValue(ownedRow),
        delete: vi.fn().mockResolvedValue(ownedRow),
      },
      account: {
        findFirst: vi.fn().mockResolvedValue(ownedAccount),
        update: vi.fn().mockResolvedValue(ownedAccount),
      },
      transaction: {
        create: vi.fn().mockResolvedValue({ id: 'txn-1' }),
      },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

    repository = new PrismaSavingsGoalRepository(asPrisma(prisma));
  });

  describe('S3 — a foreign or missing goal id looks absent', () => {
    it('findById reads by { id, userId } and yields 404 without touching the row', async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('goal-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.savingsGoal.findFirst).toHaveBeenCalledWith({
        where: { id: 'goal-foreign', userId: 'user-1' },
      });
      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
      expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
    });

    it('findById returns the owned goal as a domain entity', async () => {
      const goal = await repository.findById('goal-1', 'user-1');

      expect(goal).toBeInstanceOf(SavingsGoal);
      expect(goal.id).toBe('goal-1');
      expect(goal.userId).toBe('user-1');
      expect(goal.priority).toBe('HIGH');
    });

    it('update on a foreign goal yields 404 and writes nothing', async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('goal-foreign', 'user-1', { name: 'Otro nombre' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
    });

    it('delete on a foreign goal yields 404 and writes nothing', async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(null);

      await expect(repository.delete('goal-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
    });

    it('deposit on a foreign goal yields 404 and moves no balance', async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(null);

      await expect(
        repository.deposit('goal-foreign', 'user-1', 200, 'acc-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('withdraw on a foreign goal yields 404 and moves no balance', async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(null);

      await expect(
        repository.withdraw('goal-foreign', 'user-1', 200, 'acc-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('S4 — a foreign accountId is rejected before any write', () => {
    it('deposit with an account of another user yields 400, keeps balances and creates no transaction', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.deposit('goal-1', 'user-1', 200, 'acc-foreign'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
    });

    it('withdraw with an account of another user yields 400, keeps balances and creates no transaction', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.withdraw('goal-1', 'user-1', 200, 'acc-foreign'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
    });
  });

  describe('deposit and withdraw keep their current effects', () => {
    it('deposit decrements the owned account and records an expense for the owner', async () => {
      prisma.savingsGoal.update.mockResolvedValue({
        ...ownedRow,
        currentAmount: 1700,
      });

      const goal = await repository.deposit('goal-1', 'user-1', 200, 'acc-1');

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-1' },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { decrement: 200 } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          accountId: 'acc-1',
          amount: 200,
          type: 'EXPENSE',
          date: expect.any(Date),
          note: 'Abono a meta: Fondo de Emergencia',
        },
      });
      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 1700, isCompleted: false },
      });
      expect(goal.currentAmount).toBe(1700);
    });

    it('deposit without an account only moves the goal amount', async () => {
      prisma.savingsGoal.update.mockResolvedValue({
        ...ownedRow,
        currentAmount: 1700,
      });

      await repository.deposit('goal-1', 'user-1', 200);

      expect(prisma.account.findFirst).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 1700, isCompleted: false },
      });
    });

    it('deposit that reaches the target marks the goal completed', async () => {
      prisma.savingsGoal.update.mockResolvedValue({
        ...ownedRow,
        currentAmount: 5000,
        isCompleted: true,
      });

      const goal = await repository.deposit('goal-1', 'user-1', 3500);

      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 5000, isCompleted: true },
      });
      expect(goal.isCompleted).toBe(true);
    });

    it('withdraw increments the owned account and records an income for the owner', async () => {
      prisma.savingsGoal.update.mockResolvedValue({
        ...ownedRow,
        currentAmount: 1300,
      });

      await repository.withdraw('goal-1', 'user-1', 200, 'acc-1');

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-1' },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 200 } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          accountId: 'acc-1',
          amount: 200,
          type: 'INCOME',
          date: expect.any(Date),
          note: 'Retiro de meta: Fondo de Emergencia',
        },
      });
      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 1300, isCompleted: false },
      });
    });

    it('withdraw never drives the saved amount below zero', async () => {
      prisma.savingsGoal.update.mockResolvedValue({
        ...ownedRow,
        currentAmount: 0,
      });

      await repository.withdraw('goal-1', 'user-1', 9000, 'acc-1');

      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 0, isCompleted: false },
      });
    });

    it('withdraw without an account only moves the goal amount', async () => {
      prisma.savingsGoal.update.mockResolvedValue({
        ...ownedRow,
        currentAmount: 1300,
      });

      await repository.withdraw('goal-1', 'user-1', 200);

      expect(prisma.account.findFirst).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('create and listing stay scoped to the token user', () => {
    it('create persists the payload with the computed completion flag', async () => {
      const goal = await repository.create(validCreate);

      expect(prisma.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Fondo de Emergencia',
          targetAmount: 5000,
          currentAmount: 1500,
          currency: 'USD',
          targetDate: new Date('2026-12-31T00:00:00.000Z'),
          color: '#10B981',
          icon: 'i-heroicons-shield-check',
          priority: 'HIGH',
          isCompleted: false,
        },
      });
      expect(goal).toBeInstanceOf(SavingsGoal);
    });

    it('create treats a saved amount equal to the target as completed', async () => {
      await repository.create({
        ...validCreate,
        targetAmount: 1000,
        currentAmount: 1000,
      });

      const data = prisma.savingsGoal.create.mock.calls[0][0].data;

      expect(data.isCompleted).toBe(true);
    });

    it('create applies the documented defaults', async () => {
      await repository.create({
        userId: 'user-1',
        name: 'Viaje',
        targetAmount: 3000,
      });

      const data = prisma.savingsGoal.create.mock.calls[0][0].data;

      expect([
        data.currentAmount,
        data.currency,
        data.targetDate,
        data.priority,
        data.isCompleted,
      ]).toEqual([0, 'USD', null, 'MEDIUM', false]);
    });

    it('findAllByUserId reads only the user goals, newest first', async () => {
      const goals = await repository.findAllByUserId('user-1');

      expect(prisma.savingsGoal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(goals).toHaveLength(1);
      expect(goals[0]).toBeInstanceOf(SavingsGoal);
    });
  });

  describe('update keeps merging omitted fields with the stored row', () => {
    it('recomputes completion from the merged amounts', async () => {
      await repository.update('goal-1', 'user-1', { currentAmount: 5000 });

      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 5000, isCompleted: true },
      });
    });

    it('honours an explicit isCompleted flag', async () => {
      await repository.update('goal-1', 'user-1', { isCompleted: true });

      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { isCompleted: true },
      });
    });
  });

  describe('delete removes the owned goal', () => {
    it('deletes by id once ownership is proven', async () => {
      await repository.delete('goal-1', 'user-1');

      expect(prisma.savingsGoal.delete).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
      });
    });
  });
});
