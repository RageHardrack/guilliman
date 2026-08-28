import { describe, expect, it, beforeEach, vi } from 'vitest';

import { SavingsGoal } from '../../domain/savings-goal.entity';
import { SavingsGoalsController } from './savings-goals.controller';
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
  );

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

  it('should create a new savings goal', async () => {
    const result = await controller.create(
      { userId: 'user-1' },
      {
        name: 'Fondo de Emergencia',
        targetAmount: 5000,
        currency: 'USD',
      },
    );

    expect(result).toBe(mockGoal);
    expect(repository.create).toHaveBeenCalled();
  });

  it('should return all savings goals for the user', async () => {
    const result = await controller.findAll({ userId: 'user-1' });
    expect(result).toEqual([mockGoal]);
    expect(repository.findAllByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should deposit funds into savings goal', async () => {
    const result = await controller.deposit('goal-1', {
      amount: 200,
      accountId: 'acc-1',
    });

    expect(result).toBe(mockGoal);
    expect(repository.deposit).toHaveBeenCalledWith('goal-1', 200, 'acc-1');
  });

  it('should withdraw funds from savings goal', async () => {
    const result = await controller.withdraw('goal-1', {
      amount: 100,
      accountId: 'acc-1',
    });

    expect(result).toBe(mockGoal);
    expect(repository.withdraw).toHaveBeenCalledWith('goal-1', 100, 'acc-1');
  });
});
