import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionsController } from './subscriptions.controller';
import { Subscription } from '../../domain/subscription.entity';
import { SubscriptionRepositoryPort } from '../../application/ports/subscription.repository.port';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let mockRepo: SubscriptionRepositoryPort;

  const mockSub = new Subscription({
    id: 'sub-123',
    userId: 'user-123',
    accountId: 'acc-usd',
    name: 'Netflix',
    amount: 12,
    currency: 'USD',
    frequency: 'MONTHLY',
    nextDueDate: new Date('2026-09-15'),
  });

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(mockSub),
      findById: vi.fn().mockResolvedValue(mockSub),
      findByUserId: vi.fn().mockResolvedValue([mockSub]),
      update: vi.fn().mockResolvedValue(mockSub),
      delete: vi.fn().mockResolvedValue(true),
      recordPayment: vi.fn().mockImplementation(async (id, options) => {
        return {
          transactionId: 'tx-created-1',
          subscription: mockSub,
        };
      }),
    };

    controller = new SubscriptionsController(mockRepo);
  });

  it('debe registrar pago estándar sin DTO adicional', async () => {
    const result = await controller.pay('sub-123');

    expect(mockRepo.recordPayment).toHaveBeenCalledWith('sub-123', {
      paymentDate: undefined,
      debitedAmount: undefined,
      exchangeRate: undefined,
      destinationAmount: undefined,
      accountId: undefined,
      note: undefined,
    });
    expect(result.transactionId).toBe('tx-created-1');
  });

  it('debe registrar pago multimoneda con monto debitado y tasa de cambio', async () => {
    const result = await controller.pay('sub-123', {
      paymentDate: '2026-09-17T12:00:00.000Z',
      debitedAmount: 39,
      exchangeRate: 3.25,
      destinationAmount: 12,
      accountId: 'acc-pen-wallet',
      note: 'Pago recurrente: Netflix ($12 USD @ 3.25)',
    });

    expect(mockRepo.recordPayment).toHaveBeenCalledWith('sub-123', {
      paymentDate: new Date('2026-09-17T12:00:00.000Z'),
      debitedAmount: 39,
      exchangeRate: 3.25,
      destinationAmount: 12,
      accountId: 'acc-pen-wallet',
      note: 'Pago recurrente: Netflix ($12 USD @ 3.25)',
    });
    expect(result.transactionId).toBe('tx-created-1');
  });
});
