import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { Budget } from '../../domain/budget.entity';
import { BudgetsController } from './budgets.controller';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type { BudgetRepositoryPort } from '../../application/ports/budget.repository.port';

const budget = new Budget({
  id: 'budget-1',
  userId: 'user-1',
  categoryId: 'cat-1',
  amount: 450,
  currency: 'PEN',
  period: 'MONTHLY',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
});

const createDto = {
  userId: 'body-user',
  categoryId: 'cat-1',
  amount: 450,
  currency: 'PEN',
  period: 'MONTHLY',
};

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let repository: BudgetRepositoryPort;

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(budget),
      findByUserId: vi.fn().mockResolvedValue([budget]),
      findById: vi.fn().mockResolvedValue(budget),
      findByUserAndCategory: vi.fn().mockResolvedValue(budget),
      update: vi.fn().mockResolvedValue(budget),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    controller = new BudgetsController(repository);
  });

  describe('S1 — the whole controller requires JWT', () => {
    it('carries JwtAuthGuard metadata at the class level', () => {
      const guards: unknown = Reflect.getMetadata(
        GUARDS_METADATA,
        BudgetsController,
      );

      expect(Array.isArray(guards) && guards).toContain(JwtAuthGuard);
    });
  });

  describe('S2 — the owner always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create({ userId: 'token-user' }, createDto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'token-user',
        categoryId: 'cat-1',
        amount: 450,
        currency: 'PEN',
        period: 'MONTHLY',
      });
      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('lists only the token user budgets, ignoring the userId query', async () => {
      const result = await controller.findByUserId({ userId: 'token-user' });

      expect(repository.findByUserId).toHaveBeenCalledWith('token-user');
      expect(result).toEqual([budget.toJSON()]);
    });

    it('scopes GET, PUT and DELETE to the token userId', async () => {
      await controller.findById('budget-1', { userId: 'token-user' });
      await controller.update(
        'budget-1',
        { userId: 'token-user' },
        {
          amount: 500,
        },
      );
      await controller.delete('budget-1', { userId: 'token-user' });

      expect(repository.findById).toHaveBeenCalledWith(
        'budget-1',
        'token-user',
      );
      expect(repository.update).toHaveBeenCalledWith('budget-1', 'token-user', {
        amount: 500,
      });
      expect(repository.delete).toHaveBeenCalledWith('budget-1', 'token-user');
    });
  });

  describe('S3 — foreign or missing budget is indistinguishable from absent', () => {
    it('surfaces the port 404 on GET, PUT and DELETE', async () => {
      const notFound = new NotFoundException('Budget not found');
      repository.findById = vi.fn().mockRejectedValue(notFound);
      repository.update = vi.fn().mockRejectedValue(notFound);
      repository.delete = vi.fn().mockRejectedValue(notFound);

      await expect(
        controller.findById('budget-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(
          'budget-foreign',
          { userId: 'token-user' },
          {
            amount: 500,
          },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('budget-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('S4 — foreign categoryId surfaces the port 400', () => {
    it('create with a foreign categoryId rejects with 400', async () => {
      repository.create = vi
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Referenced category does not belong to the user',
          ),
        );

      await expect(
        controller.create(
          { userId: 'token-user' },
          { ...createDto, categoryId: 'cat-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('response shapes stay unchanged', () => {
    it('create returns the budget JSON', async () => {
      const result = await controller.create({ userId: 'user-1' }, createDto);

      expect(result).toEqual({
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

    it('DELETE answers 200 with the success flag', async () => {
      const result = await controller.delete('budget-1', { userId: 'user-1' });

      expect(result).toEqual({ success: true });
    });
  });
});
