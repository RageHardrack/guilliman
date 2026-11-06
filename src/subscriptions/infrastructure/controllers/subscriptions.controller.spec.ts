import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { Subscription } from '../../domain/subscription.entity';
import { SubscriptionsController } from './subscriptions.controller';
import type { SubscriptionRepositoryPort } from '../../application/ports/subscription.repository.port';

const subscription = new Subscription({
  id: 'sub-1',
  userId: 'user-1',
  accountId: 'acc-interbank',
  categoryId: 'cat-1',
  name: 'Netflix',
  amount: 12,
  currency: 'USD',
  frequency: 'MONTHLY',
  nextDueDate: new Date('2026-11-15T00:00:00.000Z'),
});

const createBody = {
  accountId: 'acc-interbank',
  categoryId: 'cat-1',
  name: 'Netflix',
  amount: 12,
  currency: 'USD',
  frequency: 'MONTHLY' as const,
  customIntervalDays: undefined,
  nextDueDate: '2026-11-15T00:00:00.000Z',
};

const updateBody = {
  name: 'Netflix 4K',
  amount: 15.99,
};

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let repository: SubscriptionRepositoryPort;

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(subscription),
      findByUserId: vi.fn().mockResolvedValue([subscription]),
      findById: vi.fn().mockResolvedValue(subscription),
      update: vi.fn().mockResolvedValue(subscription),
      recordPayment: vi.fn().mockResolvedValue({
        transactionId: 'tx-created-1',
        subscription,
      }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    controller = new SubscriptionsController(repository);
  });

  describe('S1 — JwtAuthGuard protects the whole controller', () => {
    it('declares JwtAuthGuard at class level', () => {
      const guards: unknown = Reflect.getMetadata(
        GUARDS_METADATA,
        SubscriptionsController,
      );

      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('S2 — owner always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create(
        { userId: 'token-user' },
        {
          ...createBody,
          userId: 'body-user',
        },
      );

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'token-user',
        ...createBody,
        nextDueDate: new Date('2026-11-15T00:00:00.000Z'),
      });
      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('lists for the token userId and ignores any userId in the query', async () => {
      await controller.findByUserId({ userId: 'token-user' }, 'query-user');

      expect(repository.findByUserId).toHaveBeenCalledWith('token-user');
    });

    it('scopes every id-addressed operation to the token userId', async () => {
      await controller.findById('sub-1', { userId: 'token-user' });
      await controller.update('sub-1', { userId: 'token-user' }, updateBody);
      await controller.pay('sub-1', { userId: 'token-user' });
      await controller.delete('sub-1', { userId: 'token-user' });

      expect(repository.findById).toHaveBeenCalledWith('sub-1', 'token-user');
      expect(repository.update).toHaveBeenCalledWith(
        'sub-1',
        'token-user',
        updateBody,
      );
      expect(repository.recordPayment).toHaveBeenCalledWith(
        'sub-1',
        'token-user',
        {
          paymentDate: undefined,
          debitedAmount: undefined,
          exchangeRate: undefined,
          destinationAmount: undefined,
          accountId: undefined,
          note: undefined,
        },
      );
      expect(repository.delete).toHaveBeenCalledWith('sub-1', 'token-user');
    });
  });

  describe('S3 — foreign or missing subscription surfaces the port 404', () => {
    beforeEach(() => {
      const notFound = new NotFoundException('Subscription not found');
      repository.findById = vi.fn().mockRejectedValue(notFound);
      repository.update = vi.fn().mockRejectedValue(notFound);
      repository.recordPayment = vi.fn().mockRejectedValue(notFound);
      repository.delete = vi.fn().mockRejectedValue(notFound);
    });

    it('surfaces 404 on GET, PUT, PAY and DELETE', async () => {
      await expect(
        controller.findById('sub-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update('sub-foreign', { userId: 'token-user' }, updateBody),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.pay('sub-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('sub-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('S4 — foreign account or category references surface the port 400', () => {
    it('surfaces 400 from create and update without touching the port again', async () => {
      const badRequest = new BadRequestException(
        'Referenced account does not belong to the user',
      );
      repository.create = vi.fn().mockRejectedValue(badRequest);
      repository.update = vi.fn().mockRejectedValue(badRequest);

      await expect(
        controller.create(
          { userId: 'token-user' },
          { ...createBody, accountId: 'acc-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.update(
          'sub-1',
          { userId: 'token-user' },
          { ...updateBody, categoryId: 'cat-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('surfaces 400 when pay uses a foreign alternative account', async () => {
      repository.recordPayment = vi
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Referenced account does not belong to the user',
          ),
        );

      await expect(
        controller.pay(
          'sub-1',
          { userId: 'token-user' },
          {
            accountId: 'acc-foreign',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('response shapes are preserved', () => {
    it('create returns the subscription JSON shape', async () => {
      const result = await controller.create({ userId: 'user-1' }, createBody);

      expect(result).toEqual({
        id: 'sub-1',
        userId: 'user-1',
        accountId: 'acc-interbank',
        categoryId: 'cat-1',
        name: 'Netflix',
        amount: 12,
        currency: 'USD',
        frequency: 'MONTHLY',
        customIntervalDays: undefined,
        nextDueDate: '2026-11-15T00:00:00.000Z',
        isActive: true,
        createdAt: undefined,
        updatedAt: undefined,
      });
    });

    it('pay returns transactionId plus the updated subscription', async () => {
      const result = await controller.pay(
        'sub-1',
        { userId: 'user-1' },
        {
          paymentDate: '2026-09-17T12:00:00.000Z',
          debitedAmount: 39,
          exchangeRate: 3.25,
          destinationAmount: 12,
          accountId: 'acc-pen-wallet',
          note: 'Pago recurrente: Netflix ($12 USD @ 3.25)',
        },
      );

      expect(repository.recordPayment).toHaveBeenCalledWith('sub-1', 'user-1', {
        paymentDate: new Date('2026-09-17T12:00:00.000Z'),
        debitedAmount: 39,
        exchangeRate: 3.25,
        destinationAmount: 12,
        accountId: 'acc-pen-wallet',
        note: 'Pago recurrente: Netflix ($12 USD @ 3.25)',
      });
      expect(result).toEqual({
        transactionId: 'tx-created-1',
        subscription: subscription.toJSON(),
      });
    });

    it('DELETE answers 200 with the success flag, like transaction-templates', async () => {
      const result = await controller.delete('sub-1', { userId: 'user-1' });

      expect(result).toEqual({ success: true });
    });
  });
});
