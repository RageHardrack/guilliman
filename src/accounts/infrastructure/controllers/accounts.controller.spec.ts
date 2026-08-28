import { describe, expect, it, beforeEach, vi } from 'vitest';

import { Account } from '../../domain/account.entity';
import { AccountsController } from './accounts.controller';
import type { AccountRepositoryPort } from '../../application/ports/account.repository.port';

describe('AccountsController - Reconcile and Balance Adjustments', () => {
  let controller: AccountsController;
  let repository: AccountRepositoryPort;

  const mockAccount = new Account({
    id: 'acc-1',
    userId: 'user-1',
    name: 'BCP Principal',
    type: 'CHECKING',
    balance: 1000,
    currency: 'PEN',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(mockAccount),
      findById: vi.fn().mockResolvedValue(mockAccount),
      findByUserId: vi.fn().mockResolvedValue([mockAccount]),
      updateBalance: vi.fn().mockResolvedValue(mockAccount),
      update: vi.fn().mockResolvedValue(mockAccount),
      delete: vi.fn().mockResolvedValue(true),
      reconcile: vi.fn().mockResolvedValue({
        account: new Account({ ...mockAccount, balance: 1050 }),
        discrepancy: 50,
      }),
    };

    controller = new AccountsController(repository);
  });

  it('should reconcile account with positive discrepancy', async () => {
    const result = await controller.reconcile('acc-1', {
      realBalance: 1050,
      note: 'Ajuste de intereses ganados',
    });

    expect(result.discrepancy).toBe(50);
    expect(result.account.balance).toBe(1050);
    expect(repository.reconcile).toHaveBeenCalledWith(
      'acc-1',
      1050,
      'Ajuste de intereses ganados',
    );
  });
});
