import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { Budget } from '../../domain/budget.entity';
import { PrismaBudgetRepository } from './prisma-budget.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

type BudgetRow = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  period: string;
  createdAt: Date;
  updatedAt: Date;
};

type OwnedRowArgs = {
  where: { id: string; userId: string };
};

type CategoryOwnerArgs = {
  where: { id: string; userId: string };
};

const row: BudgetRow = {
  id: 'budget-1',
  userId: 'user-1',
  categoryId: 'cat-1',
  amount: 450,
  currency: 'PEN',
  period: 'MONTHLY',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

interface BudgetDelegateDouble {
  upsert: Mock<
    (args: {
      where: { userId_categoryId: { userId: string; categoryId: string } };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }) => Promise<BudgetRow>
  >;
  findFirst: Mock<(args: OwnedRowArgs) => Promise<BudgetRow | null>>;
  findMany: Mock<
    (args: {
      where: { userId: string };
      orderBy: { createdAt: string };
    }) => Promise<BudgetRow[]>
  >;
  findUnique: Mock<
    (args: {
      where:
        | { userId_categoryId: { userId: string; categoryId: string } }
        | { id: string };
    }) => Promise<BudgetRow | null>
  >;
  update: Mock<
    (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<BudgetRow>
  >;
  delete: Mock<(args: { where: { id: string } }) => Promise<BudgetRow>>;
}

interface CategoryDelegateDouble {
  findFirst: Mock<
    (args: CategoryOwnerArgs) => Promise<{ id: string; userId: string } | null>
  >;
}

interface PrismaDouble {
  budget: BudgetDelegateDouble;
  category: CategoryDelegateDouble;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

const validCreate = {
  userId: 'user-1',
  categoryId: 'cat-1',
  amount: 450,
  currency: 'PEN',
  period: 'MONTHLY',
};

describe('PrismaBudgetRepository', () => {
  let repository: PrismaBudgetRepository;
  let prisma: PrismaDouble;

  beforeEach(() => {
    prisma = {
      budget: {
        upsert: vi.fn().mockResolvedValue(row),
        findFirst: vi.fn(async (args: OwnedRowArgs) =>
          args.where.id === 'budget-1' && args.where.userId === 'user-1'
            ? row
            : null,
        ),
        findMany: vi.fn().mockResolvedValue([row]),
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn().mockResolvedValue(row),
        delete: vi.fn().mockResolvedValue(row),
      },
      category: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cat-1', userId: 'user-1' }),
      },
    };
    repository = new PrismaBudgetRepository(asPrisma(prisma));
  });

  describe('S4 — categoryId ownership before any write', () => {
    it('create with a foreign categoryId yields 400 and saves nothing', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        repository.create({ ...validCreate, categoryId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-foreign', userId: 'user-1' },
      });
      expect(prisma.budget.upsert).not.toHaveBeenCalled();
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it('create with an owned categoryId upserts keyed by the token user', async () => {
      await repository.create(validCreate);

      expect(prisma.budget.upsert).toHaveBeenCalledWith({
        where: {
          userId_categoryId: { userId: 'user-1', categoryId: 'cat-1' },
        },
        update: { amount: 450, currency: 'PEN', period: 'MONTHLY' },
        create: {
          userId: 'user-1',
          categoryId: 'cat-1',
          amount: 450,
          currency: 'PEN',
          period: 'MONTHLY',
        },
      });
    });

    it('create without currency and period keeps the previous defaults', async () => {
      await repository.create({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 100,
      });

      expect(prisma.budget.upsert).toHaveBeenCalledWith({
        where: {
          userId_categoryId: { userId: 'user-1', categoryId: 'cat-1' },
        },
        update: { amount: 100, currency: 'USD', period: 'MONTHLY' },
        create: {
          userId: 'user-1',
          categoryId: 'cat-1',
          amount: 100,
          currency: 'USD',
          period: 'MONTHLY',
        },
      });
    });
  });

  describe('S3 — ownership on reads and mutations', () => {
    it('findById filters by { id, userId } and maps the owned row', async () => {
      const result = await repository.findById('budget-1', 'user-1');

      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: 'budget-1', userId: 'user-1' },
      });
      expect(result).toBeInstanceOf(Budget);
      expect(result.toJSON()).toEqual({
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 450,
        currency: 'PEN',
        period: 'MONTHLY',
        createdAt: new Date('2026-11-01T00:00:00.000Z'),
        updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      });
    });

    it('findById on a foreign or missing budget yields 404', async () => {
      await expect(
        repository.findById('budget-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('update on a foreign budget yields 404 and never writes', async () => {
      await expect(
        repository.update('budget-foreign', 'user-1', { amount: 500 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it('delete on a foreign budget yields 404 and never deletes', async () => {
      await expect(
        repository.delete('budget-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budget.delete).not.toHaveBeenCalled();
    });

    it('update and delete on an owned budget mutate by id', async () => {
      await repository.update('budget-1', 'user-1', { amount: 500 });
      await repository.delete('budget-1', 'user-1');

      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
        data: { amount: 500 },
      });
      expect(prisma.budget.delete).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      });
    });
  });

  describe('PRESERVE — untouched list and pair lookups keep their shape', () => {
    it('findByUserId still queries by userId with createdAt ordering', async () => {
      const result = await repository.findByUserId('user-1');

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Budget);
    });

    it('findByUserAndCategory still queries the unique pair', async () => {
      const result = await repository.findByUserAndCategory('user-1', 'cat-1');

      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { userId_categoryId: { userId: 'user-1', categoryId: 'cat-1' } },
      });
      expect(result).toBeInstanceOf(Budget);
    });
  });
});
