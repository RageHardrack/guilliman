import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { Subscription } from '../../domain/subscription.entity';
import { PrismaSubscriptionRepository } from './prisma-subscription.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

const row = {
  id: 'sub-1',
  userId: 'user-1',
  accountId: 'acc-interbank',
  categoryId: 'cat-1',
  name: 'Netflix',
  amount: 12,
  currency: 'USD',
  frequency: 'MONTHLY',
  customIntervalDays: null,
  nextDueDate: new Date('2026-11-15T00:00:00.000Z'),
  isActive: true,
  createdAt: new Date('2026-10-15T00:00:00.000Z'),
  updatedAt: new Date('2026-10-15T00:00:00.000Z'),
};

const validCreate = {
  userId: 'user-1',
  accountId: 'acc-interbank',
  categoryId: 'cat-1',
  name: 'Netflix',
  amount: 12,
  currency: 'USD',
  frequency: 'MONTHLY' as const,
  nextDueDate: new Date('2026-11-15T00:00:00.000Z'),
};

interface SubscriptionDelegateDouble {
  create: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface OwnedRow {
  id: string;
  userId: string;
}

interface OwnerCheckDelegateDouble {
  findFirst: Mock<
    (args: {
      where: { id: string; userId: string };
    }) => Promise<OwnedRow | null>
  >;
}

interface TransactionDelegateDouble {
  create: ReturnType<typeof vi.fn>;
}

interface InteractiveTxDouble {
  transaction: TransactionDelegateDouble;
  account: { update: ReturnType<typeof vi.fn> };
  subscription: { update: ReturnType<typeof vi.fn> };
}

interface PrismaDouble {
  subscription: SubscriptionDelegateDouble;
  account: OwnerCheckDelegateDouble;
  category: OwnerCheckDelegateDouble;
  $transaction: Mock<
    (fn: (tx: InteractiveTxDouble) => Promise<unknown>) => Promise<unknown>
  >;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

describe('PrismaSubscriptionRepository', () => {
  let repository: PrismaSubscriptionRepository;
  let prisma: PrismaDouble;
  let interactiveTx: InteractiveTxDouble;

  beforeEach(() => {
    interactiveTx = {
      transaction: { create: vi.fn().mockResolvedValue({ id: 'tx-1' }) },
      account: { update: vi.fn().mockResolvedValue(row) },
      subscription: {
        update: vi.fn().mockResolvedValue({
          ...row,
          nextDueDate: new Date('2026-12-15T00:00:00.000Z'),
        }),
      },
    };

    prisma = {
      subscription: {
        create: vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(row),
        findMany: vi.fn().mockResolvedValue([row]),
        update: vi.fn().mockResolvedValue(row),
        delete: vi.fn().mockResolvedValue(row),
      },
      account: {
        findFirst: vi.fn().mockResolvedValue({ id: 'acc-1', userId: 'user-1' }),
      },
      category: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cat-1', userId: 'user-1' }),
      },
      $transaction: vi.fn(async (fn) => fn(interactiveTx)),
    };

    repository = new PrismaSubscriptionRepository(asPrisma(prisma));
  });

  describe('S1/S3 — ownership of the subscription itself', () => {
    it('findById filters by { id, userId } so a foreign subscription yields 404 instead of null', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('sub-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { id: 'sub-foreign', userId: 'user-1' },
      });
    });

    it('findById returns the domain entity for an owned subscription', async () => {
      const result = await repository.findById('sub-1', 'user-1');

      expect(result).toBeInstanceOf(Subscription);
      expect(result.toJSON().userId).toBe('user-1');
    });

    it('update and delete on a foreign subscription yield 404 and never mutate', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('sub-foreign', 'user-1', { name: 'Cambio' }),
      ).rejects.toThrow(NotFoundException);
      await expect(repository.delete('sub-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.subscription.delete).not.toHaveBeenCalled();
    });

    it('recordPayment on a foreign subscription yields 404 and opens no transaction', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(
        repository.recordPayment('sub-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(interactiveTx.account.update).not.toHaveBeenCalled();
    });
  });

  describe('S4 — foreign account and category references are rejected before any write', () => {
    it('create with a foreign accountId yields 400 and saves nothing', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.create({
          ...validCreate,
          accountId: 'acc-foreign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it('create with a foreign categoryId yields 400 and saves nothing', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        repository.create({ ...validCreate, categoryId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-foreign', userId: 'user-1' },
      });
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it('update with a foreign accountId yields 400 and writes nothing', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('sub-1', 'user-1', { accountId: 'acc-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('update with a foreign categoryId yields 400 and writes nothing', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('sub-1', 'user-1', { categoryId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('recordPayment with a foreign alternative accountId yields 400, no transaction and no balance change', async () => {
      prisma.account.findFirst.mockImplementation(async (args) =>
        args.where.id === 'acc-foreign'
          ? null
          : { id: 'acc-1', userId: 'user-1' },
      );

      await expect(
        repository.recordPayment('sub-1', 'user-1', {
          accountId: 'acc-foreign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(interactiveTx.transaction.create).not.toHaveBeenCalled();
      expect(interactiveTx.account.update).not.toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('create/update on owned references still persist', () => {
    it('create persists the payload with the token owner', async () => {
      const result = await repository.create(validCreate);

      expect(result).toBeInstanceOf(Subscription);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          accountId: 'acc-interbank',
          categoryId: 'cat-1',
          name: 'Netflix',
          amount: 12,
          currency: 'USD',
          frequency: 'MONTHLY',
          customIntervalDays: null,
          nextDueDate: new Date('2026-11-15T00:00:00.000Z'),
          isActive: true,
        },
      });
    });

    it('update on an owned subscription persists', async () => {
      const result = await repository.update('sub-1', 'user-1', {
        name: 'Netflix 4K',
      });

      expect(result).toBeInstanceOf(Subscription);
      expect(prisma.subscription.update).toHaveBeenCalled();
    });
  });

  describe('recordPayment happy path', () => {
    it('debits the default account when no alternative accountId is given', async () => {
      const result = await repository.recordPayment('sub-1', 'user-1');

      expect(result.transactionId).toBe('tx-1');
      expect(interactiveTx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          accountId: 'acc-interbank',
          amount: 12,
          type: 'EXPENSE',
        }),
      });
      expect(interactiveTx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-interbank' },
        data: { balance: { decrement: 12 } },
      });
      expect(result.subscription.toJSON().nextDueDate).toBe(
        '2026-12-15T00:00:00.000Z',
      );
    });

    it('records the payment for an owned alternative accountId', async () => {
      await repository.recordPayment('sub-1', 'user-1', {
        accountId: 'acc-sip',
        debitedAmount: 39,
      });

      expect(interactiveTx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId: 'acc-sip',
          amount: 39,
        }),
      });
      expect(interactiveTx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-sip' },
        data: { balance: { decrement: 39 } },
      });
    });
  });

  describe('listing keeps its shape', () => {
    it('finds by userId ordered by nextDueDate asc', async () => {
      const result = await repository.findByUserId('user-1');

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { nextDueDate: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Subscription);
    });
  });
});
