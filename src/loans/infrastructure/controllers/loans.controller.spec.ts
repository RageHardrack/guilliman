import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

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
    const result = await controller.create(
      { userId: 'user-123' },
      {
        userId: 'user-123',
        personName: 'Carlos Gomez',
        type: 'LENT',
        amount: 500,
        currency: 'USD',
      },
    );

    expect(result).toEqual(mockLoan);
    expect(mockRepo.create).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ personName: 'Carlos Gomez', amount: 500 }),
    );
  });

  it('debe listar préstamos por usuario', async () => {
    const result = await controller.findByUserId(
      { userId: 'user-123' },
      'user-123',
    );
    expect(result).toHaveLength(1);
    expect(result[0].personName).toBe('Carlos Gomez');
  });

  it('debe agregar un abono a un préstamo', async () => {
    const result = await controller.addPayment(
      'loan-123',
      { userId: 'user-123' },
      { amount: 250 },
    );
    expect(result.loan.remainingAmount).toBe(250);
    expect(result.payment.amount).toBe(250);
    expect(mockRepo.addPayment).toHaveBeenCalledWith('loan-123', 'user-123', {
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

  describe('S2 — the owner always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create(
        { userId: 'token-user' },
        {
          userId: 'body-user',
          personName: 'Carlos Gomez',
          type: 'LENT',
          amount: 500,
        },
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        'token-user',
        expect.objectContaining({ personName: 'Carlos Gomez' }),
      );
      const calls = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toBe('token-user');
    });
  });

  describe('S5 — route :userId must match the token user', () => {
    it('answers 403 and never touches the repository when :userId differs', async () => {
      await expect(
        controller.findByUserId({ userId: 'token-user' }, 'other-user'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('lists only the token user loans when :userId matches', async () => {
      await controller.findByUserId({ userId: 'token-user' }, 'token-user');

      expect(mockRepo.findByUserId).toHaveBeenCalledWith('token-user');
    });
  });

  describe('S3 — every :id route is scoped to the token user', () => {
    it('passes the token userId to findById, update, delete and addPayment', async () => {
      await controller.findById('loan-123', { userId: 'token-user' });
      await controller.update(
        'loan-123',
        { userId: 'token-user' },
        {
          notes: 'ok',
        },
      );
      await controller.delete('loan-123', { userId: 'token-user' });
      await controller.addPayment(
        'loan-123',
        { userId: 'token-user' },
        { amount: 100 },
      );
      await controller.deletePayment('pay-1', { userId: 'token-user' });

      expect(mockRepo.findById).toHaveBeenCalledWith('loan-123', 'token-user');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'loan-123',
        'token-user',
        expect.objectContaining({ notes: 'ok' }),
      );
      expect(mockRepo.delete).toHaveBeenCalledWith('loan-123', 'token-user');
      expect(mockRepo.addPayment).toHaveBeenCalledWith(
        'loan-123',
        'token-user',
        expect.objectContaining({ amount: 100 }),
      );
      expect(mockRepo.deletePayment).toHaveBeenCalledWith(
        'pay-1',
        'token-user',
      );
    });

    it('surfaces the port 404 for a foreign or missing loan on GET, PATCH, DELETE and payments', async () => {
      mockRepo.findById = vi
        .fn()
        .mockRejectedValue(new NotFoundException('Loan not found'));
      mockRepo.update = vi
        .fn()
        .mockRejectedValue(new NotFoundException('Loan not found'));
      mockRepo.delete = vi
        .fn()
        .mockRejectedValue(new NotFoundException('Loan not found'));
      mockRepo.addPayment = vi
        .fn()
        .mockRejectedValue(new NotFoundException('Loan not found'));
      mockRepo.deletePayment = vi
        .fn()
        .mockRejectedValue(new NotFoundException('Loan not found'));

      await expect(
        controller.findById('loan-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(
          'loan-foreign',
          { userId: 'token-user' },
          { notes: 'x' },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('loan-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.addPayment(
          'loan-foreign',
          { userId: 'token-user' },
          { amount: 10 },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.deletePayment('pay-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('S4 — foreign account references surface as 400', () => {
    it('surfaces the port 400 for a foreign initialAccountId on create', async () => {
      mockRepo.create = vi
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Referenced account does not belong to the user',
          ),
        );

      await expect(
        controller.create(
          { userId: 'token-user' },
          {
            userId: 'token-user',
            personName: 'Carlos',
            type: 'LENT',
            amount: 100,
            initialAccountId: 'acc-foreign',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('surfaces the port 400 for a foreign accountId on payments', async () => {
      mockRepo.addPayment = vi
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Referenced account does not belong to the user',
          ),
        );

      await expect(
        controller.addPayment(
          'loan-123',
          { userId: 'token-user' },
          { amount: 50, accountId: 'acc-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
