import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { Transaction } from '../../domain/transaction.entity';
import { PrismaTransactionRepository } from './prisma-transaction.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

const row = {
  id: 'tx-1',
  userId: 'user-1',
  accountId: 'acc-1',
  destinationAccountId: null,
  categoryId: null,
  amount: 50,
  destinationAmount: null,
  exchangeRate: null,
  type: 'EXPENSE',
  date: new Date('2026-11-01T00:00:00.000Z'),
  note: 'Supermercado',
  taxCategory: 'NONE',
  taxDocumentType: 'NONE',
  taxDocumentNumber: null,
  taxWithholdingAmount: 0,
  taxDeductionType: 'NONE',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

const validCreate = {
  userId: 'user-1',
  accountId: 'acc-1',
  amount: 50,
  type: 'EXPENSE' as const,
  note: 'Supermercado',
};

interface DelegateDouble {
  create: ReturnType<typeof vi.fn>;
  findFirst: Mock<
    (args: { where: { id: string; userId?: string } }) => Promise<unknown>
  >;
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const delegate = (): DelegateDouble => ({
  create: vi.fn().mockResolvedValue(row),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn().mockResolvedValue([row]),
  update: vi.fn().mockResolvedValue(row),
  delete: vi.fn().mockResolvedValue(row),
});

interface PrismaDouble {
  transaction: DelegateDouble;
  account: DelegateDouble;
  category: DelegateDouble;
  $transaction: ReturnType<typeof vi.fn>;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

describe('PrismaTransactionRepository', () => {
  let repository: PrismaTransactionRepository;
  let prisma: PrismaDouble;

  beforeEach(() => {
    prisma = {
      transaction: delegate(),
      account: delegate(),
      category: delegate(),
      $transaction: vi.fn(
        async (cb: (tx: Omit<PrismaDouble, '$transaction'>) => unknown) =>
          cb(prisma),
      ),
    };
    // Ownership lookups succeed by default: every referenced account and
    // category belongs to the token user, and the transaction row exists.
    prisma.transaction.findFirst.mockResolvedValue(row);
    prisma.account.findFirst.mockResolvedValue({
      id: 'acc-1',
      userId: 'user-1',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 'cat-1',
      userId: 'user-1',
    });
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc-1',
      balance: 100,
    });
    repository = new PrismaTransactionRepository(asPrisma(prisma));
  });

  describe('S4 — foreign references block create before any write', () => {
    it('create with a foreign accountId yields 400, writes no transaction and moves no balance', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(repository.create(validCreate)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-1' },
      });
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('create with a foreign destinationAccountId yields 400 and writes nothing', async () => {
      prisma.account.findFirst.mockImplementation(
        async (args: { where: { id: string } }) =>
          args.where.id === 'acc-dest' ? null : { id: 'acc-1' },
      );

      await expect(
        repository.create({
          ...validCreate,
          type: 'TRANSFER' as const,
          destinationAccountId: 'acc-dest',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('create with a foreign categoryId yields 400 and writes nothing', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        repository.create({ ...validCreate, categoryId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-foreign', userId: 'user-1' },
      });
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('create for an owned INCOME still writes the transaction and increments the balance', async () => {
      const created = await repository.create({
        ...validCreate,
        type: 'INCOME' as const,
      });

      expect(created).toBeInstanceOf(Transaction);
      expect(prisma.transaction.create).toHaveBeenCalled();
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 50 } },
      });
    });
  });

  describe('S3 — foreign or missing transaction ids look identical (404)', () => {
    it('findById queries { id, userId } and throws NotFoundException when absent', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(repository.findById('tx-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-foreign', userId: 'user-1' },
      });
    });

    it('update on a foreign id yields 404 with no transaction write and no balance change', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('tx-foreign', 'user-1', { amount: 75 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.transaction.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('delete on a foreign id yields 404 with no transaction write and no balance change', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(repository.delete('tx-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.transaction.delete).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('S4 — foreign references block update before any write', () => {
    it('update switching to a foreign accountId yields 400 with no transaction write and no balance change', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('tx-1', 'user-1', { accountId: 'acc-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('update switching to a foreign categoryId yields 400 with no writes', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('tx-1', 'user-1', { categoryId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('update on an owned transaction with owned refs reverts the old effect and applies the new one', async () => {
      prisma.transaction.update.mockResolvedValue({ ...row, amount: 75 });
      await repository.update('tx-1', 'user-1', { amount: 75 });

      expect(prisma.transaction.update).toHaveBeenCalled();
      // EXPENSE 50 reverted (increment) then EXPENSE 75 applied (decrement).
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 50 } },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { decrement: 75 } },
      });
    });
  });

  describe('findByUserId (S2 scoping preserved)', () => {
    it('lists only rows matching the given userId', async () => {
      const list = await repository.findByUserId('user-1');

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { date: 'desc' },
      });
      expect(list[0]).toBeInstanceOf(Transaction);
    });
  });

  describe('delete on an owned transaction (PRESERVE)', () => {
    it('reverts the expense balance and deletes the row', async () => {
      const deleted = await repository.delete('tx-1', 'user-1');

      expect(deleted).toBe(true);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 50 } },
      });
      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
    });
  });
});
