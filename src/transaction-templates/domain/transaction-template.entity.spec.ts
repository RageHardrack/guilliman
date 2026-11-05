import { describe, expect, it } from 'vitest';

import {
  TransactionTemplate,
  TransactionTemplateDomainError,
} from './transaction-template.entity';

const baseProps = {
  id: 'tpl-1',
  userId: 'user-1',
  name: 'Transporte publico',
  type: 'EXPENSE' as const,
  accountId: 'acc-interbank',
  categoryId: null,
  destinationAccountId: null,
  defaultAmount: 3,
  note: null,
  lastUsedAt: null,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

describe('TransactionTemplate entity', () => {
  it('accepts a valid expense template and trims the name', () => {
    const template = new TransactionTemplate({
      ...baseProps,
      name: '  Transporte publico  ',
    });

    expect(template.name).toBe('Transporte publico');
    expect(template.type).toBe('EXPENSE');
    expect(template.defaultAmount).toBe(3);
  });

  it('rejects an empty name after trim (S9)', () => {
    expect(
      () => new TransactionTemplate({ ...baseProps, name: '   ' }),
    ).toThrow(TransactionTemplateDomainError);
  });

  it('rejects a type outside EXPENSE, INCOME and TRANSFER (S2)', () => {
    expect(
      () => new TransactionTemplate({ ...baseProps, type: 'RECURRING' }),
    ).toThrow(/type must be one of EXPENSE, INCOME, TRANSFER/);
  });

  it('requires a destination account on TRANSFER (S3)', () => {
    expect(
      () =>
        new TransactionTemplate({
          ...baseProps,
          type: 'TRANSFER',
          destinationAccountId: null,
        }),
    ).toThrow(/TRANSFER templates require a destinationAccountId/);
  });

  it('rejects a TRANSFER whose destination equals the source account (S3)', () => {
    expect(
      () =>
        new TransactionTemplate({
          ...baseProps,
          type: 'TRANSFER',
          destinationAccountId: 'acc-interbank',
        }),
    ).toThrow(/destinationAccountId must be different from accountId/);
  });

  it.each(['EXPENSE', 'INCOME'] as const)(
    'rejects a destination account on %s templates (S3)',
    (type) => {
      expect(
        () =>
          new TransactionTemplate({
            ...baseProps,
            type,
            destinationAccountId: 'acc-sip',
          }),
      ).toThrow(/Only TRANSFER templates can have a destinationAccountId/);
    },
  );

  it.each([-1, 0, Number.NaN, '3', '12.50'])(
    'rejects a defaultAmount that is not a positive number: %p (S4)',
    (defaultAmount) => {
      expect(
        () => new TransactionTemplate({ ...baseProps, defaultAmount }),
      ).toThrow(/defaultAmount must be a number greater than 0/);
    },
  );

  it('accepts a template without defaultAmount (S4)', () => {
    const template = new TransactionTemplate({
      ...baseProps,
      defaultAmount: null,
    });

    expect(template.defaultAmount).toBeNull();
  });

  it('accepts the S5 example templates with the expected stored shape', () => {
    const transport = new TransactionTemplate({
      ...baseProps,
      id: 'tpl-transport',
      name: 'Transporte publico',
      type: 'EXPENSE',
      accountId: 'acc-interbank',
      destinationAccountId: null,
      defaultAmount: 3,
    });
    const move = new TransactionTemplate({
      ...baseProps,
      id: 'tpl-move',
      name: 'Mover a SIP',
      type: 'TRANSFER',
      accountId: 'acc-bbva',
      destinationAccountId: 'acc-sip',
      defaultAmount: 200,
    });

    expect(transport.toJSON()).toEqual({
      id: 'tpl-transport',
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
    expect([
      move.type,
      move.accountId,
      move.destinationAccountId,
      move.defaultAmount,
    ]).toEqual(['TRANSFER', 'acc-bbva', 'acc-sip', 200]);
  });

  it('serializes optionals as null and dates as ISO strings (S9 JSON shape)', () => {
    const json = new TransactionTemplate({
      ...baseProps,
      categoryId: 'cat-1',
      note: 'Metro',
      defaultAmount: null,
      lastUsedAt: new Date('2026-11-04T10:00:00.000Z'),
    }).toJSON();

    expect(Object.keys(json)).toEqual([
      'id',
      'userId',
      'name',
      'type',
      'accountId',
      'destinationAccountId',
      'categoryId',
      'defaultAmount',
      'note',
      'lastUsedAt',
      'createdAt',
      'updatedAt',
    ]);
    expect(json.categoryId).toBe('cat-1');
    expect(json.note).toBe('Metro');
    expect(json.defaultAmount).toBeNull();
    expect(json.lastUsedAt).toBe('2026-11-04T10:00:00.000Z');
    expect(json.createdAt).toBe('2026-11-01T00:00:00.000Z');
  });

  it('requires userId and accountId', () => {
    expect(() => new TransactionTemplate({ ...baseProps, userId: '' })).toThrow(
      TransactionTemplateDomainError,
    );
    expect(
      () => new TransactionTemplate({ ...baseProps, accountId: '' }),
    ).toThrow(TransactionTemplateDomainError);
  });
});
