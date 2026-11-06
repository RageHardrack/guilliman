import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { Category } from '../../domain/category.entity';
import { PrismaCategoryRepository } from './prisma-category.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

type CategoryRow = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
  parentId: string | null;
  taxCategory: string;
  taxDeductionType: string;
  budgetGroup: string;
  createdAt: Date;
  updatedAt: Date;
};

type FindFirstArgs = {
  where: { id: string; userId: string };
};

const row: CategoryRow = {
  id: 'cat-1',
  userId: 'user-1',
  name: 'Comida y Restaurantes',
  icon: 'i-heroicons-shopping-cart',
  color: '#10B981',
  type: 'EXPENSE',
  parentId: null,
  taxCategory: 'NONE',
  taxDeductionType: 'NONE',
  budgetGroup: 'NEEDS',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

const parentRow: CategoryRow = { ...row, id: 'cat-parent', name: 'Comida' };

/** Only these two categories belong to user-1. */
const ownedByUser1: CategoryRow[] = [row, parentRow];

interface CategoryDelegateDouble {
  create: Mock<
    (args: { data: Record<string, unknown> }) => Promise<CategoryRow>
  >;
  findFirst: Mock<(args: FindFirstArgs) => Promise<CategoryRow | null>>;
  findMany: Mock<
    (args: {
      where: { userId: string };
      orderBy: { name: string };
    }) => Promise<CategoryRow[]>
  >;
  update: Mock<
    (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<CategoryRow>
  >;
  delete: Mock<(args: { where: { id: string } }) => Promise<CategoryRow>>;
}

interface PrismaDouble {
  category: CategoryDelegateDouble;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

const validCreate = {
  userId: 'user-1',
  name: 'Comida y Restaurantes',
  type: 'EXPENSE' as const,
};

describe('PrismaCategoryRepository', () => {
  let repository: PrismaCategoryRepository;
  let prisma: PrismaDouble;

  beforeEach(() => {
    prisma = {
      category: {
        create: vi.fn().mockResolvedValue(row),
        findFirst: vi.fn(
          async (args: FindFirstArgs) =>
            ownedByUser1.find(
              (c) => c.id === args.where.id && c.userId === args.where.userId,
            ) ?? null,
        ),
        findMany: vi.fn().mockResolvedValue([row]),
        update: vi.fn().mockResolvedValue(row),
        delete: vi.fn().mockResolvedValue(row),
      },
    };
    repository = new PrismaCategoryRepository(asPrisma(prisma));
  });

  describe('S3 — ownership on reads and mutations', () => {
    it('findById filters by { id, userId } and maps the owned row to the domain entity', async () => {
      const result = await repository.findById('cat-1', 'user-1');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: 'user-1' },
      });
      expect(result).toBeInstanceOf(Category);
      expect(result.toJSON()).toEqual({
        id: 'cat-1',
        userId: 'user-1',
        name: 'Comida y Restaurantes',
        icon: 'i-heroicons-shopping-cart',
        color: '#10B981',
        type: 'EXPENSE',
        parentId: null,
        taxCategory: 'NONE',
        taxDeductionType: 'NONE',
        budgetGroup: 'NEEDS',
        createdAt: new Date('2026-11-01T00:00:00.000Z'),
        updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      });
    });

    it('findById on a foreign or missing category yields 404 without mutation', async () => {
      await expect(
        repository.findById('cat-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-foreign', userId: 'user-1' },
      });
      expect(prisma.category.update).not.toHaveBeenCalled();
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('update on a foreign category yields 404 and never writes', async () => {
      await expect(
        repository.update('cat-foreign', 'user-1', { name: 'Otro nombre' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('delete on a foreign category yields 404 and never deletes', async () => {
      await expect(repository.delete('cat-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('delete on an owned category removes it by id', async () => {
      await repository.delete('cat-1', 'user-1');

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });
  });

  describe('S4 — parentId ownership', () => {
    it('create with a foreign parentId yields 400 and saves nothing', async () => {
      await expect(
        repository.create({ ...validCreate, parentId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-foreign', userId: 'user-1' },
      });
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('create with an owned parentId saves the subcategory', async () => {
      await repository.create({ ...validCreate, parentId: 'cat-parent' });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Comida y Restaurantes',
          type: 'EXPENSE',
          icon: undefined,
          color: undefined,
          parentId: 'cat-parent',
          taxCategory: 'NONE',
          taxDeductionType: 'NONE',
          budgetGroup: 'UNASSIGNED',
        },
      });
    });

    it('update with a foreign parentId yields 400 on an owned category and never writes', async () => {
      await expect(
        repository.update('cat-1', 'user-1', { parentId: 'cat-foreign' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('update with an owned parentId writes the new parent', async () => {
      await repository.update('cat-1', 'user-1', { parentId: 'cat-parent' });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { parentId: 'cat-parent' },
      });
    });
  });

  describe('PRESERVE — untouched list behavior keeps its shape', () => {
    it('findByUserId still queries by userId with name ordering', async () => {
      const result = await repository.findByUserId('user-1');

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Category);
    });

    it('create without parentId skips the parent check and defaults tax fields', async () => {
      await repository.create(validCreate);

      expect(prisma.category.findFirst).not.toHaveBeenCalled();
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Comida y Restaurantes',
          type: 'EXPENSE',
          icon: undefined,
          color: undefined,
          parentId: undefined,
          taxCategory: 'NONE',
          taxDeductionType: 'NONE',
          budgetGroup: 'UNASSIGNED',
        },
      });
    });
  });
});
