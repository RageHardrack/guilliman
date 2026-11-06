import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { Category } from '../../domain/category.entity';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CategoriesController } from './categories.controller';
import type { CategoryRepositoryPort } from '../../application/ports/category.repository.port';

const category = new Category({
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

const createDto = {
  userId: 'body-user',
  name: 'Comida y Restaurantes',
  type: 'EXPENSE' as const,
  icon: undefined,
  color: undefined,
  parentId: undefined,
  taxCategory: undefined,
  taxDeductionType: undefined,
  budgetGroup: undefined,
};

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let repository: CategoryRepositoryPort;

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(category),
      findById: vi.fn().mockResolvedValue(category),
      findByUserId: vi.fn().mockResolvedValue([category]),
      update: vi.fn().mockResolvedValue(category),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    controller = new CategoriesController(repository);
  });

  describe('S1 — the whole controller requires JWT', () => {
    it('carries JwtAuthGuard metadata at the class level', () => {
      const guards: unknown = Reflect.getMetadata(
        GUARDS_METADATA,
        CategoriesController,
      );

      expect(Array.isArray(guards) && guards).toContain(JwtAuthGuard);
    });
  });

  describe('S2 — the owner always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create({ userId: 'token-user' }, createDto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'token-user',
        name: 'Comida y Restaurantes',
        type: 'EXPENSE',
        icon: undefined,
        color: undefined,
        parentId: undefined,
        taxCategory: undefined,
        taxDeductionType: undefined,
        budgetGroup: undefined,
      });
      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('lists only the token user categories, ignoring the userId query', async () => {
      const result = await controller.findByUserId({ userId: 'token-user' });

      expect(repository.findByUserId).toHaveBeenCalledWith('token-user');
      expect(result).toEqual([category.toJSON()]);
    });

    it('scopes GET, PUT and DELETE to the token userId', async () => {
      await controller.findById('cat-1', { userId: 'token-user' });
      await controller.update(
        'cat-1',
        { userId: 'token-user' },
        { name: 'Comida rapida' },
      );
      await controller.delete('cat-1', { userId: 'token-user' });

      expect(repository.findById).toHaveBeenCalledWith('cat-1', 'token-user');
      expect(repository.update).toHaveBeenCalledWith('cat-1', 'token-user', {
        name: 'Comida rapida',
      });
      expect(repository.delete).toHaveBeenCalledWith('cat-1', 'token-user');
    });
  });

  describe('S3 — foreign or missing category is indistinguishable from absent', () => {
    it('surfaces the port 404 on GET, PUT and DELETE', async () => {
      const notFound = new NotFoundException('Category not found');
      repository.findById = vi.fn().mockRejectedValue(notFound);
      repository.update = vi.fn().mockRejectedValue(notFound);
      repository.delete = vi.fn().mockRejectedValue(notFound);

      await expect(
        controller.findById('cat-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(
          'cat-foreign',
          { userId: 'token-user' },
          {
            name: 'Comida rapida',
          },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('cat-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('S4 — foreign parentId surfaces the port 400', () => {
    it('create with a foreign parentId rejects with 400', async () => {
      repository.create = vi
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Referenced parent category does not belong to the user',
          ),
        );

      await expect(
        controller.create(
          { userId: 'token-user' },
          { ...createDto, parentId: 'cat-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('update with a foreign parentId rejects with 400', async () => {
      repository.update = vi
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Referenced parent category does not belong to the user',
          ),
        );

      await expect(
        controller.update(
          'cat-1',
          { userId: 'token-user' },
          {
            parentId: 'cat-foreign',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('response shapes stay unchanged', () => {
    it('create returns the category JSON', async () => {
      const result = await controller.create({ userId: 'user-1' }, createDto);

      expect(result).toEqual({
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

    it('DELETE answers 200 with the success flag', async () => {
      const result = await controller.delete('cat-1', { userId: 'user-1' });

      expect(result).toEqual({ success: true });
    });
  });
});
