import { describe, it, expect, beforeEach, vi } from 'vitest';

import { LoansController } from './loans.controller';
import { Loan, LoanPayment } from '../../domain/loan.entity';
import { LoanRepositoryPort } from '../../application/ports/loan.repository.port';

describe('LoansController', () => {
  let controller: LoansController;
  let mockRepo: LoanRepositoryPort;

  const mockLoan = new Loan(
    'loan-123',
    'user-123',
    'Carlos Gomez',
    'LENT',
    500,
    500,
    'USD',
    new Date('2026-12-31'),
    'PENDING',
    'Para compra de laptop',
    new Date(),
    new Date(),
    [],
  );

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(mockLoan),
      findById: vi.fn().mockResolvedValue(mockLoan),
      findByUserId: vi.fn().mockResolvedValue([mockLoan]),
      update: vi.fn().mockResolvedValue(mockLoan),
      delete: vi.fn().mockResolvedValue(undefined),
      addPayment: vi.fn().mockResolvedValue({
        loan: { ...mockLoan, remainingAmount: 250, status: 'PARTIALLY_PAID' },
        payment: new LoanPayment(
          'pay-1',
          'loan-123',
          250,
          new Date(),
          null,
          null,
          new Date(),
        ),
      }),
      deletePayment: vi.fn().mockResolvedValue(mockLoan),
    };

    controller = new LoansController(mockRepo);
  });

  it('debe crear un préstamo correctamente', async () => {
    const result = await controller.create({
      userId: 'user-123',
      personName: 'Carlos Gomez',
      type: 'LENT',
      amount: 500,
      currency: 'USD',
    });

    expect(result).toEqual(mockLoan);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ personName: 'Carlos Gomez', amount: 500 }),
    );
  });

  it('debe listar préstamos por usuario', async () => {
    const result = await controller.findByUserId('user-123');
    expect(result).toHaveLength(1);
    expect(result[0].personName).toBe('Carlos Gomez');
  });

  it('debe agregar un abono a un préstamo', async () => {
    const result = await controller.addPayment('loan-123', { amount: 250 });
    expect(result.loan.remainingAmount).toBe(250);
    expect(result.payment.amount).toBe(250);
    expect(mockRepo.addPayment).toHaveBeenCalledWith('loan-123', {
      amount: 250,
    });
  });

  it('debe calcular paidAmount y progressPercentage en la entidad', () => {
    const partialLoan = new Loan(
      'loan-1',
      'user-1',
      'Pedro',
      'BORROWED',
      1000,
      400,
      'USD',
      null,
      'PARTIALLY_PAID',
      null,
      new Date(),
      new Date(),
    );

    expect(partialLoan.paidAmount).toBe(600);
    expect(partialLoan.progressPercentage).toBe(60);
  });
});
