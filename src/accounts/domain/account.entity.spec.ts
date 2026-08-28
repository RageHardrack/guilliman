import { describe, expect, it } from 'vitest';

import { Account } from './account.entity';

describe('Account Domain Entity', () => {
  it('should instantiate an Account correctly and expose props', () => {
    const now = new Date();
    const account = new Account({
      id: 'acc-1',
      userId: 'user-1',
      name: 'Banco Principal',
      type: 'CHECKING',
      balance: 1500.5,
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
    });

    expect(account.id).toBe('acc-1');
    expect(account.userId).toBe('user-1');
    expect(account.name).toBe('Banco Principal');
    expect(account.type).toBe('CHECKING');
    expect(account.balance).toBe(1500.5);
    expect(account.currency).toBe('USD');
    expect(account.createdAt).toBe(now);
    expect(account.updatedAt).toBe(now);
  });

  it('should serialize to JSON properly', () => {
    const now = new Date();
    const props = {
      id: 'acc-2',
      userId: 'user-1',
      name: 'Efectivo',
      type: 'CASH' as const,
      balance: 200,
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
    };
    const account = new Account(props);

    expect(account.toJSON()).toEqual(props);
  });
});
