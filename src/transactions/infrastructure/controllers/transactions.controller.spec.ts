import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { Transaction } from '../../domain/transaction.entity';
import { TransactionsController } from './transactions.controller';
import type { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';

const transaction = new Transaction({
  id: 'tx-1',
  userId: 'user-1',
  accountId: 'acc-1',
  destinationAccountId: null,
  categoryId: null,
  amount: 50,
  destinationAmount: null,
  exchangeRate: null,
  type: 'EXPENSE',
  date: new Date('2026-11-01T00:00:00.000Z'),
  note: 'Supermercado',
  taxCategory: 'NONE',
  taxDocumentType: 'NONE',
  taxDocumentNumber: null,
  taxWithholdingAmount: 0,
  taxDeductionType: 'NONE',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
});

const createDto = {
  userId: 'body-user',
  accountId: 'acc-1',
  destinationAccountId: undefined,
  categoryId: undefined,
  amount: 50,
  destinationAmount: undefined,
  exchangeRate: undefined,
  type: 'EXPENSE' as const,
  date: undefined,
  note: 'Supermercado',
  taxCategory: 'NONE' as const,
  taxDocumentType: 'NONE' as const,
  taxDocumentNumber: undefined,
  taxWithholdingAmount: undefined,
  taxDeductionType: undefined,
};

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let repository: TransactionRepositoryPort;

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(transaction),
      findById: vi.fn().mockResolvedValue(transaction),
      findByUserId: vi.fn().mockResolvedValue([transaction]),
      update: vi.fn().mockResolvedValue(transaction),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    controller = new TransactionsController(repository);
  });

  describe('S1 — JWT guard is applied at class level', () => {
    it('registers JwtAuthGuard as a class-level guard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        TransactionsController,
      ) as unknown[];

      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('S2 — ownership always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create({ userId: 'token-user' }, createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'token-user' }),
      );
      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('lists only the token user transactions, ignoring the query userId', async () => {
      await controller.findByUserId({ userId: 'token-user' });

      expect(repository.findByUserId).toHaveBeenCalledWith('token-user');
    });

    it('scopes GET /:id, PUT /:id and DELETE /:id to the token userId', async () => {
      await controller.findById('tx-1', { userId: 'token-user' });
      await controller.update(
        'tx-1',
        { userId: 'token-user' },
        {
          amount: 75,
        },
      );
      await controller.delete('tx-1', { userId: 'token-user' });

      expect(repository.findById).toHaveBeenCalledWith('tx-1', 'token-user');
      expect(repository.update).toHaveBeenCalledWith(
        'tx-1',
        'token-user',
        expect.objectContaining({ amount: 75 }),
      );
      expect(repository.delete).toHaveBeenCalledWith('tx-1', 'token-user');
    });
  });

  describe('S3 — a foreign or missing transaction is indistinguishable', () => {
    it('surfaces the port 404 on GET /:id, PUT /:id and DELETE /:id', async () => {
      const notFound = new NotFoundException('Transaction not found');
      repository.findById = vi.fn().mockRejectedValue(notFound);
      repository.update = vi.fn().mockRejectedValue(notFound);
      repository.delete = vi.fn().mockRejectedValue(notFound);

      await expect(
        controller.findById('tx-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(
          'tx-foreign',
          { userId: 'token-user' },
          {
            amount: 75,
          },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('tx-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('S4 — foreign references surface as 400', () => {
    it('surfaces the port 400 when a referenced account or category is not owned, without saving', async () => {
      const badRequest = new BadRequestException(
        'Referenced account does not belong to the user',
      );
      repository.create = vi.fn().mockRejectedValue(badRequest);
      repository.update = vi.fn().mockRejectedValue(badRequest);

      await expect(
        controller.create(
          { userId: 'token-user' },
          {
            ...createDto,
            accountId: 'acc-foreign',
          },
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.update(
          'tx-1',
          { userId: 'token-user' },
          {
            accountId: 'acc-foreign',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('response shapes (unchanged)', () => {
    it('POST returns the transaction JSON', async () => {
      const result = await controller.create({ userId: 'user-1' }, createDto);

      expect(result).toEqual(transaction.toJSON());
    });

    it('GET /:id returns the transaction JSON', async () => {
      const result = await controller.findById('tx-1', { userId: 'user-1' });
      expect(result).toEqual(transaction.toJSON());
    });

    it('DELETE answers with the success flag shape', async () => {
      const result = await controller.delete('tx-1', { userId: 'user-1' });
      expect(result).toEqual({ success: true });
    });
  });
});
