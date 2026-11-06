import { BadRequestException, NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { Loan } from '../../domain/loan.entity';
import { PrismaLoanRepository } from './prisma-loan.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

const paymentRow = {
  id: 'pay-1',
  loanId: 'loan-1',
  amount: 100,
  date: new Date('2026-11-01T00:00:00.000Z'),
  accountId: null,
  notes: null,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
};

const loanRow = {
  id: 'loan-1',
  userId: 'user-1',
  personName: 'Carlos Gomez',
  type: 'LENT',
  amount: 500,
  remainingAmount: 500,
  currency: 'USD',
  dueDate: new Date('2026-12-31T00:00:00.000Z'),
  status: 'PENDING',
  notes: null,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  payments: [paymentRow],
};

const ownedAccount = { id: 'acc-1', userId: 'user-1', balance: 800 };

const validCreate = {
  userId: 'user-1',
  personName: 'Carlos Gomez',
  type: 'LENT' as const,
  amount: 500,
  currency: 'USD',
};

interface LoanDelegateDouble {
  findFirst: Mock<
    (args: {
      where: { id: string; userId: string };
      include?: unknown;
    }) => Promise<typeof loanRow | null>
  >;
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface LoanPaymentDelegateDouble {
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface AccountDelegateDouble {
  findFirst: Mock<
    (args: {
      where: { id: string; userId: string };
    }) => Promise<typeof ownedAccount | null>
  >;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

interface TransactionDelegateDouble {
  create: ReturnType<typeof vi.fn>;
}

interface TransactionClientDouble {
  loan: LoanDelegateDouble;
  loanPayment: LoanPaymentDelegateDouble;
  account: AccountDelegateDouble;
  transaction: TransactionDelegateDouble;
}

interface PrismaDouble extends TransactionClientDouble {
  $transaction: Mock<
    (fn: (tx: TransactionClientDouble) => Promise<unknown>) => Promise<unknown>
  >;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

describe('PrismaLoanRepository', () => {
  let repository: PrismaLoanRepository;
  let prisma: PrismaDouble;

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(),
      loan: {
        findFirst: vi.fn().mockResolvedValue(loanRow),
        findUnique: vi.fn().mockResolvedValue(loanRow),
        findMany: vi.fn().mockResolvedValue([loanRow]),
        create: vi.fn().mockResolvedValue({ ...loanRow, payments: [] }),
        update: vi.fn().mockResolvedValue(loanRow),
        delete: vi.fn().mockResolvedValue(loanRow),
      },
      loanPayment: {
        findUnique: vi.fn().mockResolvedValue(paymentRow),
        create: vi.fn().mockResolvedValue(paymentRow),
        delete: vi.fn().mockResolvedValue(paymentRow),
      },
      account: {
        findFirst: vi.fn().mockResolvedValue(ownedAccount),
        findUnique: vi.fn().mockResolvedValue(ownedAccount),
        update: vi.fn().mockResolvedValue(ownedAccount),
      },
      transaction: {
        create: vi.fn().mockResolvedValue({ id: 'txn-1' }),
      },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

    repository = new PrismaLoanRepository(asPrisma(prisma));
  });

  describe('S2 — the owner of a new loan comes from the caller, not the body', () => {
    it('persists the loan with the given userId even if the dto carries another one', async () => {
      await repository.create('user-1', {
        ...validCreate,
        userId: 'attacker-user',
      });

      expect(prisma.loan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  describe('S3 — a foreign or missing loan looks absent', () => {
    it('findById reads by { id, userId } and yields 404 without any mutation', async () => {
      prisma.loan.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('loan-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.loan.findFirst).toHaveBeenCalledWith({
        where: { id: 'loan-foreign', userId: 'user-1' },
        include: expect.any(Object),
      });
      expect(prisma.loan.update).not.toHaveBeenCalled();
      expect(prisma.loan.delete).not.toHaveBeenCalled();
    });

    it('findById returns the owned loan as a domain entity', async () => {
      const loan = await repository.findById('loan-1', 'user-1');

      expect(loan).toBeInstanceOf(Loan);
      expect(loan.userId).toBe('user-1');
    });

    it('update on a foreign loan yields 404 and never writes', async () => {
      prisma.loan.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('loan-foreign', 'user-1', { notes: 'hijack' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.loan.update).not.toHaveBeenCalled();
    });

    it('delete on a foreign loan yields 404 and never writes', async () => {
      prisma.loan.findFirst.mockResolvedValue(null);

      await expect(repository.delete('loan-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.loan.delete).not.toHaveBeenCalled();
    });

    it('addPayment on a foreign loan yields 404 with no payment, no balance change and no transaction', async () => {
      prisma.loan.findFirst.mockResolvedValue(null);

      await expect(
        repository.addPayment('loan-foreign', 'user-1', {
          amount: 100,
          accountId: 'acc-1',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.loanPayment.create).not.toHaveBeenCalled();
      expect(prisma.loan.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('deletePayment of a payment whose loan is foreign yields 404 and leaves remainingAmount untouched', async () => {
      prisma.loan.findFirst.mockResolvedValue(null);

      await expect(repository.deletePayment('pay-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.loanPayment.delete).not.toHaveBeenCalled();
      expect(prisma.loan.update).not.toHaveBeenCalled();
    });
  });

  describe('S4 — foreign account references are 400 before any write', () => {
    it('create with a foreign initialAccountId yields 400 and writes nothing', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.create('user-1', {
          ...validCreate,
          initialAccountId: 'acc-foreign',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
      expect(prisma.loan.create).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('addPayment with a foreign accountId yields 400 and moves no balance', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.addPayment('loan-1', 'user-1', {
          amount: 100,
          accountId: 'acc-foreign',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
      expect(prisma.loanPayment.create).not.toHaveBeenCalled();
      expect(prisma.loan.update).not.toHaveBeenCalled();
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('PRESERVE — accepted behavior of the previous implementation', () => {
    it('create with an owned initialAccountId still moves the balance and books an EXPENSE for LENT', async () => {
      await repository.create('user-1', {
        ...validCreate,
        initialAccountId: 'acc-1',
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: ownedAccount.balance - validCreate.amount },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          accountId: 'acc-1',
          amount: validCreate.amount,
          type: 'EXPENSE',
        }),
      });
    });

    it('addPayment on an owned loan still creates the payment and books an INCOME for LENT', async () => {
      await repository.addPayment('loan-1', 'user-1', {
        amount: 100,
        accountId: 'acc-1',
      });

      expect(prisma.loanPayment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loanId: 'loan-1',
          amount: 100,
          accountId: 'acc-1',
        }),
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: ownedAccount.balance + 100 },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          accountId: 'acc-1',
          amount: 100,
          type: 'INCOME',
        }),
      });
    });

    it('deletePayment on an owned loan still deletes and recomputes remainingAmount', async () => {
      await repository.deletePayment('pay-1', 'user-1');

      expect(prisma.loanPayment.delete).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
      });
      expect(prisma.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'loan-1' },
          // 500 amount, 500 remaining, payment of 100 goes back: capped at 500.
          data: expect.objectContaining({ remainingAmount: 500 }),
        }),
      );
    });

    it('create without initialAccountId writes only the loan', async () => {
      await repository.create('user-1', validCreate);

      expect(prisma.loan.create).toHaveBeenCalledTimes(1);
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });
});
