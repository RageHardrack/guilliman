import { NotFoundException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';

import { Account } from '../../domain/account.entity';
import { PrismaAccountRepository } from './prisma-account.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

const row = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'BCP Principal',
  type: 'CHECKING',
  balance: 1000,
  currency: 'PEN',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

interface TxDouble {
  account: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  transaction: {
    create: ReturnType<typeof vi.fn>;
  };
}

interface AccountDelegateDouble {
  create: Mock<
    (args: { data: Record<string, unknown> }) => Promise<typeof row>
  >;
  findFirst: Mock<
    (args: {
      where: { id?: string; userId?: string };
    }) => Promise<typeof row | null>
  >;
  findMany: Mock<
    (args: {
      where: { userId: string };
      orderBy: { createdAt: string };
    }) => Promise<(typeof row)[]>
  >;
  update: Mock<
    (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<typeof row>
  >;
  delete: Mock<(args: { where: { id: string } }) => Promise<typeof row>>;
}

interface PrismaDouble {
  account: AccountDelegateDouble;
  $transaction: ReturnType<typeof vi.fn>;
}

const asPrisma = (double: PrismaDouble): PrismaService =>
  double as unknown as PrismaService;

describe('PrismaAccountRepository', () => {
  let repository: PrismaAccountRepository;
  let prisma: PrismaDouble;
  let tx: TxDouble;

  beforeEach(() => {
    tx = {
      account: { findFirst: vi.fn(), update: vi.fn() },
      transaction: { create: vi.fn() },
    };
    prisma = {
      account: {
        create: vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(row),
        findMany: vi.fn().mockResolvedValue([row]),
        update: vi.fn().mockResolvedValue(row),
        delete: vi.fn().mockResolvedValue(row),
      },
      $transaction: vi.fn(
        async (callback: (client: TxDouble) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    repository = new PrismaAccountRepository(asPrisma(prisma));
  });

  describe('S1-S2 — create keeps the userId from the caller', () => {
    it('persists the account for the given userId', async () => {
      const account = await repository.create({
        userId: 'user-1',
        name: 'BCP Principal',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PEN',
      });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'BCP Principal',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PEN',
        },
      });
      expect(account).toBeInstanceOf(Account);
      expect(account.userId).toBe('user-1');
    });
  });

  describe('S3 — a foreign or missing account is indistinguishable', () => {
    it('findById reads by { id, userId } and 404s without a row', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('acc-foreign', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
    });

    it('findById returns the owned account mapped to the domain entity', async () => {
      const account = await repository.findById('acc-1', 'user-1');

      expect(account.toJSON()).toEqual(row);
    });

    it('update on a foreign id 404s and never writes', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('acc-foreign', 'user-1', { name: 'Renamed' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.account.delete).not.toHaveBeenCalled();
    });

    it('update on an owned id writes only the provided fields', async () => {
      prisma.account.update.mockImplementation(
        async (args: { data: { name: string } }) => ({
          ...row,
          ...args.data,
        }),
      );

      const account = await repository.update('acc-1', 'user-1', {
        name: 'Renamed',
      });

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-1' },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { name: 'Renamed' },
      });
      expect(account.name).toBe('Renamed');
    });

    it('delete on a foreign id 404s and never deletes', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(repository.delete('acc-foreign', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.account.delete).not.toHaveBeenCalled();
    });

    it('delete on an owned id returns true', async () => {
      const result = await repository.delete('acc-1', 'user-1');

      expect(prisma.account.delete).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
      });
      expect(result).toBe(true);
    });

    it('reconcile on a foreign id 404s, creating no transaction and moving no balance', async () => {
      tx.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.reconcile('acc-foreign', 'user-1', 1050),
      ).rejects.toThrow(NotFoundException);
      expect(tx.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-foreign', userId: 'user-1' },
      });
      expect(tx.transaction.create).not.toHaveBeenCalled();
      expect(tx.account.update).not.toHaveBeenCalled();
    });

    it('reconcile on a missing id 404s, creating no transaction', async () => {
      tx.account.findFirst.mockResolvedValue(null);

      await expect(
        repository.reconcile('acc-unknown', 'user-1', 1050),
      ).rejects.toThrow(NotFoundException);
      expect(tx.transaction.create).not.toHaveBeenCalled();
      expect(tx.account.update).not.toHaveBeenCalled();
    });
  });

  describe('reconcile behaviour preserved for the owner', () => {
    it('creates an INCOME adjustment and sets the balance on a positive discrepancy', async () => {
      tx.account.findFirst.mockResolvedValue(row);
      tx.account.update.mockResolvedValue({ ...row, balance: 1050 });

      const result = await repository.reconcile(
        'acc-1',
        'user-1',
        1050,
        'note',
      );

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          accountId: 'acc-1',
          amount: 50,
          type: 'INCOME',
          date: expect.any(Date),
          note: 'note',
        },
      });
      expect(tx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: 1050 },
      });
      expect(result.discrepancy).toBe(50);
      expect(result.account.balance).toBe(1050);
    });

    it('leaves the account untouched when the discrepancy is zero', async () => {
      tx.account.findFirst.mockResolvedValue(row);

      const result = await repository.reconcile('acc-1', 'user-1', 1000);

      expect(tx.transaction.create).not.toHaveBeenCalled();
      expect(tx.account.update).not.toHaveBeenCalled();
      expect(result.discrepancy).toBe(0);
      expect(result.account.balance).toBe(1000);
    });
  });

  describe('other port behaviour preserved', () => {
    it('findByUserId still scopes the listing by userId', async () => {
      const accounts = await repository.findByUserId('user-1');

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('acc-1');
    });

    it('updateBalance still increments the balance by id', async () => {
      prisma.account.update.mockResolvedValue({ ...row, balance: 1100 });

      const account = await repository.updateBalance('acc-1', 100);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 100 } },
      });
      expect(account.balance).toBe(1100);
    });
  });
});
