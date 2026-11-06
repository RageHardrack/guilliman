import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { SavingsGoal } from '../../domain/savings-goal.entity';
import { SavingsGoalsController } from './savings-goals.controller';
import { CreateSavingsGoalDto } from '../dtos/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from '../dtos/update-savings-goal.dto';
import type { SavingsGoalRepositoryPort } from '../../application/ports/savings-goal.repository.port';

describe('SavingsGoalsController', () => {
  let controller: SavingsGoalsController;
  let repository: SavingsGoalRepositoryPort;

  const mockGoal = new SavingsGoal(
    'goal-1',
    'user-1',
    'Fondo de Emergencia',
    5000,
    1500,
    'USD',
    new Date('2026-12-31'),
    '#10B981',
    'i-heroicons-shield-check',
    false,
    new Date(),
    new Date(),
    'HIGH',
  );

  const depositDto = { amount: 200, accountId: 'acc-1' };

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(mockGoal),
      findAllByUserId: vi.fn().mockResolvedValue([mockGoal]),
      findById: vi.fn().mockResolvedValue(mockGoal),
      update: vi.fn().mockResolvedValue(mockGoal),
      delete: vi.fn().mockResolvedValue(undefined),
      deposit: vi.fn().mockResolvedValue(mockGoal),
      withdraw: vi.fn().mockResolvedValue(mockGoal),
    };

    controller = new SavingsGoalsController(repository);
  });

  it('guards every route with the JWT guard declared on the class (S1)', () => {
    const guards: unknown = Reflect.getMetadata(
      GUARDS_METADATA,
      SavingsGoalsController,
    );

    expect(Array.isArray(guards) ? guards : []).toContain(JwtAuthGuard);
  });

  it('should create a new savings goal with priority', async () => {
    const result = await controller.create(
      { userId: 'user-1' },
      {
        name: 'Fondo de Emergencia',
        targetAmount: 5000,
        currency: 'USD',
        priority: 'HIGH',
      },
    );

    expect(result).toBe(mockGoal);
    expect(result.priority).toBe('HIGH');
    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Fondo de Emergencia',
      targetAmount: 5000,
      currentAmount: undefined,
      currency: 'USD',
      targetDate: null,
      color: undefined,
      icon: undefined,
      priority: 'HIGH',
    });
  });

  describe('S2 — the owner always comes from the token', () => {
    it('creates from the token userId and ignores any userId in the body', async () => {
      await controller.create({ userId: 'token-user' }, {
        name: 'Fondo de Emergencia',
        targetAmount: 5000,
        userId: 'body-user',
      } as unknown as CreateSavingsGoalDto);

      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];

      expect(payload.userId).toBe('token-user');
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('should return all savings goals for the user', async () => {
      const result = await controller.findAll({ userId: 'user-1' });
      expect(result).toEqual([mockGoal]);
      expect(repository.findAllByUserId).toHaveBeenCalledWith('user-1');
    });

    it('scopes findOne, update, delete, deposit and withdraw to the token user', async () => {
      await controller.findOne('goal-1', { userId: 'token-user' });
      await controller.update(
        'goal-1',
        { userId: 'token-user' },
        {
          name: 'Nuevo nombre',
          targetDate: '2027-01-31T00:00:00.000Z',
        },
      );
      await controller.delete('goal-1', { userId: 'token-user' });
      await controller.deposit('goal-1', { userId: 'token-user' }, depositDto);
      await controller.withdraw('goal-1', { userId: 'token-user' }, depositDto);

      expect(repository.findById).toHaveBeenCalledWith('goal-1', 'token-user');
      expect(repository.update).toHaveBeenCalledWith('goal-1', 'token-user', {
        name: 'Nuevo nombre',
        targetDate: new Date('2027-01-31T00:00:00.000Z'),
      });
      expect(repository.delete).toHaveBeenCalledWith('goal-1', 'token-user');
      expect(repository.deposit).toHaveBeenCalledWith(
        'goal-1',
        'token-user',
        200,
        'acc-1',
      );
      expect(repository.withdraw).toHaveBeenCalledWith(
        'goal-1',
        'token-user',
        200,
        'acc-1',
      );
    });

    it('ignores a userId in the PUT body so an update cannot repoint ownership', async () => {
      await controller.update('goal-1', { userId: 'token-user' }, {
        name: 'Nuevo nombre',
        userId: 'other-user',
      } as unknown as UpdateSavingsGoalDto);

      const payload = (repository.update as ReturnType<typeof vi.fn>).mock
        .calls[0][2];

      expect(payload.userId).toBeUndefined();
      expect(JSON.stringify(payload)).not.toContain('other-user');
    });

    it('passes an absent accountId through as undefined', async () => {
      await controller.deposit(
        'goal-1',
        { userId: 'token-user' },
        {
          amount: 50,
        },
      );

      expect(repository.deposit).toHaveBeenCalledWith(
        'goal-1',
        'token-user',
        50,
        undefined,
      );
    });
  });

  describe('S3 — a foreign or missing goal id is a 404', () => {
    it('surfaces the port 404 on get, update, delete, deposit and withdraw', async () => {
      const notFound = new NotFoundException();
      repository.findById = vi.fn().mockRejectedValue(notFound);
      repository.update = vi.fn().mockRejectedValue(notFound);
      repository.delete = vi.fn().mockRejectedValue(notFound);
      repository.deposit = vi.fn().mockRejectedValue(notFound);
      repository.withdraw = vi.fn().mockRejectedValue(notFound);

      await expect(
        controller.findOne('goal-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(
          'goal-foreign',
          { userId: 'token-user' },
          {
            name: 'Nuevo nombre',
          },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('goal-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.deposit(
          'goal-foreign',
          { userId: 'token-user' },
          depositDto,
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.withdraw(
          'goal-foreign',
          { userId: 'token-user' },
          depositDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('S4 — a foreign accountId is a 400', () => {
    it('surfaces the port 400 when the account does not belong to the user', async () => {
      const badRequest = new BadRequestException();
      repository.deposit = vi.fn().mockRejectedValue(badRequest);
      repository.withdraw = vi.fn().mockRejectedValue(badRequest);

      await expect(
        controller.deposit(
          'goal-1',
          { userId: 'token-user' },
          { amount: 200, accountId: 'acc-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.withdraw(
          'goal-1',
          { userId: 'token-user' },
          { amount: 200, accountId: 'acc-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('response shapes stay as they are today', () => {
    it('should deposit funds into savings goal', async () => {
      const result = await controller.deposit(
        'goal-1',
        { userId: 'user-1' },
        depositDto,
      );

      expect(result).toBe(mockGoal);
    });

    it('should withdraw funds from savings goal', async () => {
      const result = await controller.withdraw(
        'goal-1',
        { userId: 'user-1' },
        { amount: 100, accountId: 'acc-1' },
      );

      expect(result).toBe(mockGoal);
    });

    it('DELETE answers with the documented contract (success flag)', async () => {
      const result = await controller.delete('goal-1', { userId: 'user-1' });

      expect(result).toEqual({ success: true });
    });
  });
});
