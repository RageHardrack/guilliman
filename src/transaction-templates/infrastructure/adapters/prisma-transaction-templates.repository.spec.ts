import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { TransactionTemplate } from '../../domain/transaction-template.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PrismaTransactionTemplateRepository } from './prisma-transaction-templates.repository';

const row = {
  id: 'tpl-1',
  userId: 'user-1',
  name: 'Transporte publico',
  type: 'EXPENSE',
  accountId: 'acc-interbank',
  destinationAccountId: null,
  categoryId: null,
  defaultAmount: 3,
  note: null,
  lastUsedAt: null,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

const validCreate = {
  userId: 'user-1',
  name: 'Transporte publico',
  type: 'EXPENSE' as const,
  accountId: 'acc-interbank',
  destinationAccountId: undefined,
  categoryId: undefined,
  defaultAmount: 3,
  note: undefined,
};

interface TemplateDelegateDouble {
  create: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface OwnerRow {
  id: string;
  userId: string;
}

interface OwnerCheckDelegateDouble {
  findFirst: Mock<
    (args: {
      where: { id: string; userId: string };
    }) => Promise<OwnerRow | null>
  >;
}

interface PrismaDouble {
  transactionTemplate: TemplateDelegateDouble;
  account: OwnerCheckDelegateDouble;
  category: OwnerCheckDelegateDouble;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

describe('PrismaTransactionTemplateRepository', () => {
  let repository: PrismaTransactionTemplateRepository;
  let prisma: PrismaDouble;

  beforeEach(() => {
    prisma = {
      transactionTemplate: {
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
    };
    repository = new PrismaTransactionTemplateRepository(asPrisma(prisma));
  });

  /**
   * Account ownership lookup returns null only for the given foreign id.
   */
  const foreignAccount = (foreignId: string): void => {
    prisma.account.findFirst.mockImplementation(
      async (args: { where: { id: string; userId: string } }) =>
        args.where.id === foreignId ? null : { id: 'acc-1', userId: 'user-1' },
    );
  };

  describe('S1 — ownership', () => {
    it('findById filters by { id, userId } so a foreign template yields 404 without mutation', async () => {
      prisma.transactionTemplate.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('tpl-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.transactionTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'tpl-foreign', userId: 'user-1' },
      });
      expect(prisma.transactionTemplate.update).not.toHaveBeenCalled();
      expect(prisma.transactionTemplate.delete).not.toHaveBeenCalled();
    });

    it('update, delete and markUsed on a foreign template yield 404 and never mutate', async () => {
      prisma.transactionTemplate.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('tpl-foreign', 'user-1', validCreate),
      ).rejects.toThrow(NotFoundException);
      await expect(repository.delete('tpl-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        repository.markUsed('tpl-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.transactionTemplate.update).not.toHaveBeenCalled();
      expect(prisma.transactionTemplate.delete).not.toHaveBeenCalled();
    });

    it('create with a foreign accountId yields 400 and saves nothing', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(repository.create(validCreate)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-interbank', userId: 'user-1' },
      });
      expect(prisma.transactionTemplate.create).not.toHaveBeenCalled();
    });

    it('create with a foreign destination account yields 400 and saves nothing', async () => {
      foreignAccount('acc-sip');

      await expect(
        repository.create({
          ...validCreate,
          type: 'TRANSFER' as const,
          accountId: 'acc-bbva',
          destinationAccountId: 'acc-sip',
          defaultAmount: 200,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transactionTemplate.create).not.toHaveBeenCalled();
    });

    it('create with a foreign categoryId yields 400 and saves nothing', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        repository.create({ ...validCreate, categoryId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-foreign', userId: 'user-1' },
      });
      expect(prisma.transactionTemplate.create).not.toHaveBeenCalled();
    });

    it('update with a foreign destination account yields 400 and saves nothing', async () => {
      foreignAccount('acc-sip');

      await expect(
        repository.update('tpl-1', 'user-1', {
          ...validCreate,
          type: 'TRANSFER' as const,
          accountId: 'acc-bbva',
          destinationAccountId: 'acc-sip',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transactionTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe('S2-S4 — domain rules surface as 400 before any write', () => {
    it('invalid type (S2) yields 400 and saves nothing', async () => {
      await expect(
        repository.create({ ...validCreate, type: 'RECURRING' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transactionTemplate.create).not.toHaveBeenCalled();
    });

    it('transfer without destination and expense with destination (S3) yield 400 and save nothing', async () => {
      await expect(
        repository.create({
          ...validCreate,
          type: 'TRANSFER' as const,
          destinationAccountId: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.create({ ...validCreate, destinationAccountId: 'acc-sip' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transactionTemplate.create).not.toHaveBeenCalled();
    });

    it('defaultAmount <= 0 (S4) yields 400 and saves nothing', async () => {
      await expect(
        repository.create({ ...validCreate, defaultAmount: 0 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transactionTemplate.create).not.toHaveBeenCalled();
    });
  });

  describe('S5 — accepted examples persist the expected shape', () => {
    it('creates the expense and the transfer examples', async () => {
      const transport = await repository.create(validCreate);
      expect(transport).toBeInstanceOf(TransactionTemplate);
      expect(prisma.transactionTemplate.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Transporte publico',
          type: 'EXPENSE',
          accountId: 'acc-interbank',
          destinationAccountId: null,
          categoryId: null,
          defaultAmount: 3,
          note: null,
        },
      });

      prisma.transactionTemplate.create.mockResolvedValue({
        ...row,
        id: 'tpl-2',
        name: 'Mover a SIP',
        type: 'TRANSFER',
        accountId: 'acc-bbva',
        destinationAccountId: 'acc-sip',
        defaultAmount: 200,
      });
      const move = await repository.create({
        ...validCreate,
        name: 'Mover a SIP',
        type: 'TRANSFER' as const,
        accountId: 'acc-bbva',
        destinationAccountId: 'acc-sip',
        defaultAmount: 200,
      });

      expect([
        move.type,
        move.accountId,
        move.destinationAccountId,
        move.defaultAmount,
      ]).toEqual(['TRANSFER', 'acc-bbva', 'acc-sip', 200]);
    });
  });

  describe('S7 — listing order', () => {
    it('orders by lastUsedAt desc with nulls last, then name asc', async () => {
      await repository.findAllByUserId('user-1');

      expect(prisma.transactionTemplate.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [
          { lastUsedAt: { sort: 'desc', nulls: 'last' } },
          { name: 'asc' },
        ],
      });
    });

    it('returns only the user templates mapped to domain entities', async () => {
      const result = await repository.findAllByUserId('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TransactionTemplate);
      expect(result[0].toJSON()).toEqual({
        id: 'tpl-1',
        userId: 'user-1',
        name: 'Transporte publico',
        type: 'EXPENSE',
        accountId: 'acc-interbank',
        destinationAccountId: null,
        categoryId: null,
        defaultAmount: 3,
        note: null,
        lastUsedAt: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      });
    });
  });

  describe('POST /:id/use', () => {
    it('sets lastUsedAt to now and returns the updated template', async () => {
      const usedAt = new Date('2026-11-05T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(usedAt);
      prisma.transactionTemplate.update.mockResolvedValue({
        ...row,
        lastUsedAt: usedAt,
      });

      const result = await repository.markUsed('tpl-1', 'user-1');

      expect(prisma.transactionTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: { lastUsedAt: usedAt },
      });
      expect(result.toJSON().lastUsedAt).toBe('2026-11-05T12:00:00.000Z');
      vi.useRealTimers();
    });
  });
});
