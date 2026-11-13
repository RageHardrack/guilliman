import { describe, expect, it } from 'vitest';

import { Transaction } from './transaction.entity';

describe('Transaction Domain Entity', () => {
  it('should instantiate a Transaction entity correctly', () => {
    const now = new Date();
    const transaction = new Transaction({
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'acc-1',
      destinationAccountId: 'acc-2',
      categoryId: 'cat-1',
      amount: 150.0,
      type: 'TRANSFER',
      date: now,
      note: 'Transferencia a ahorros',
      createdAt: now,
      updatedAt: now,
    });

    expect(transaction.id).toBe('tx-1');
    expect(transaction.accountId).toBe('acc-1');
    expect(transaction.destinationAccountId).toBe('acc-2');
    expect(transaction.amount).toBe(150.0);
    expect(transaction.type).toBe('TRANSFER');
    expect(transaction.note).toBe('Transferencia a ahorros');
  });

  it('should instantiate a multi-currency Transaction entity correctly', () => {
    const now = new Date();
    const transaction = new Transaction({
      id: 'tx-2',
      userId: 'user-1',
      accountId: 'acc-usd',
      destinationAccountId: 'acc-pen',
      categoryId: null,
      amount: 50.0,
      destinationAmount: 187.5,
      exchangeRate: 3.75,
      type: 'TRANSFER',
      date: now,
      note: 'Cambio USD a PEN',
      createdAt: now,
      updatedAt: now,
    });

    expect(transaction.amount).toBe(50.0);
    expect(transaction.destinationAmount).toBe(187.5);
    expect(transaction.exchangeRate).toBe(3.75);
    expect(transaction.toJSON().destinationAmount).toBe(187.5);
  });

  describe('tax fields', () => {
    const now = new Date('2026-11-13T12:00:00.000Z');
    const base = {
      id: 'tx-3',
      userId: 'user-1',
      accountId: 'acc-1',
      amount: 3500,
      type: 'INCOME' as const,
      date: now,
      createdAt: now,
      updatedAt: now,
    };

    it('defaults to no tax category, document, withholding or deduction', () => {
      const transaction = new Transaction(base);

      expect(transaction.taxCategory).toBe('NONE');
      expect(transaction.taxDocumentType).toBe('NONE');
      expect(transaction.taxWithholdingAmount).toBe(0);
      expect(transaction.taxDeductionType).toBe('NONE');
    });

    it('treats a null withholding amount as zero', () => {
      const transaction = new Transaction({
        ...base,
        taxWithholdingAmount: null,
      });

      expect(transaction.taxWithholdingAmount).toBe(0);
    });

    it('returns the tax fields it was given', () => {
      const transaction = new Transaction({
        ...base,
        taxCategory: 'FOURTH_CATEGORY_INCOME',
        taxDocumentType: 'RXH',
        taxDocumentNumber: 'E001-42',
        taxWithholdingAmount: 280,
        taxDeductionType: 'PROFESSIONAL_SERVICE',
      });

      expect(transaction.taxCategory).toBe('FOURTH_CATEGORY_INCOME');
      expect(transaction.taxDocumentType).toBe('RXH');
      expect(transaction.taxDocumentNumber).toBe('E001-42');
      expect(transaction.taxWithholdingAmount).toBe(280);
      expect(transaction.taxDeductionType).toBe('PROFESSIONAL_SERVICE');
    });
  });
});
