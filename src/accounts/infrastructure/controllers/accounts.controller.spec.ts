import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { Account } from '../../domain/account.entity';
import { AccountsController } from './accounts.controller';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type { AccountRepositoryPort } from '../../application/ports/account.repository.port';

const mockAccount = new Account({
  id: 'acc-1',
  userId: 'user-1',
  name: 'BCP Principal',
  type: 'CHECKING',
  balance: 1000,
  currency: 'PEN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const reconciledAccount = new Account({
  ...mockAccount.toJSON(),
  balance: 1050,
});

const createBody = {
  userId: 'body-user',
  name: 'Cuenta Principal',
  type: 'CHECKING' as const,
  balance: 1500.5,
  currency: 'USD',
};

describe('AccountsController', () => {
  let controller: AccountsController;
  let repository: AccountRepositoryPort;

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(mockAccount),
      findById: vi.fn().mockResolvedValue(mockAccount),
      findByUserId: vi.fn().mockResolvedValue([mockAccount]),
      updateBalance: vi.fn().mockResolvedValue(mockAccount),
      update: vi.fn().mockResolvedValue(mockAccount),
      delete: vi.fn().mockResolvedValue(true),
      reconcile: vi.fn().mockResolvedValue({
        account: reconciledAccount,
        discrepancy: 50,
      }),
    };

    controller = new AccountsController(repository);
  });

  describe('S1 — JwtAuthGuard is required on every route', () => {
    it('applies JwtAuthGuard at controller class level', () => {
      const guards: unknown = Reflect.getMetadata(
        GUARDS_METADATA,
        AccountsController,
      );

      expect(Array.isArray(guards) && guards.includes(JwtAuthGuard)).toBe(true);
    });
  });

  describe('S2 — the owner always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create({ userId: 'token-user' }, createBody);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'token-user',
        name: 'Cuenta Principal',
        type: 'CHECKING',
        balance: 1500.5,
        currency: 'USD',
      });
      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('lists the token user accounts, never a userId from the query', async () => {
      await controller.findByUserId({ userId: 'token-user' });

      expect(repository.findByUserId).toHaveBeenCalledWith('token-user');
    });

    it('scopes read, update, delete and reconcile to the token userId', async () => {
      await controller.findById('acc-1', { userId: 'token-user' });
      await controller.update(
        'acc-1',
        { userId: 'token-user' },
        {
          name: 'Renamed',
        },
      );
      await controller.delete('acc-1', { userId: 'token-user' });
      await controller.reconcile(
        'acc-1',
        { userId: 'token-user' },
        { realBalance: 1050 },
      );

      expect(repository.findById).toHaveBeenCalledWith('acc-1', 'token-user');
      expect(repository.update).toHaveBeenCalledWith('acc-1', 'token-user', {
        name: 'Renamed',
      });
      expect(repository.delete).toHaveBeenCalledWith('acc-1', 'token-user');
      expect(repository.reconcile).toHaveBeenCalledWith(
        'acc-1',
        'token-user',
        1050,
        undefined,
      );
    });
  });

  describe('S3 — a foreign account is indistinguishable from a missing one', () => {
    const notFound = () => new NotFoundException('Account not found');

    it('surfaces the port 404 for a foreign or missing id on GET, PUT, DELETE and reconcile', async () => {
      repository.findById = vi.fn().mockRejectedValue(notFound());
      repository.update = vi.fn().mockRejectedValue(notFound());
      repository.delete = vi.fn().mockRejectedValue(notFound());
      repository.reconcile = vi.fn().mockRejectedValue(notFound());

      await expect(
        controller.findById('acc-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(
          'acc-foreign',
          { userId: 'token-user' },
          {
            name: 'Renamed',
          },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.delete('acc-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.reconcile(
          'acc-foreign',
          { userId: 'token-user' },
          {
            realBalance: 1050,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not reach any repository mutation after a foreign GET', async () => {
      repository.findById = vi.fn().mockRejectedValue(notFound());

      await expect(
        controller.findById('acc-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
      expect(repository.reconcile).not.toHaveBeenCalled();
    });
  });

  describe('response contract preserved', () => {
    it('GET :id returns the account JSON shape', async () => {
      const result = await controller.findById('acc-1', {
        userId: 'user-1',
      });

      expect(result).toEqual({
        id: 'acc-1',
        userId: 'user-1',
        name: 'BCP Principal',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PEN',
        createdAt: mockAccount.createdAt,
        updatedAt: mockAccount.updatedAt,
      });
    });

    it('DELETE answers with the success flag', async () => {
      const result = await controller.delete('acc-1', { userId: 'user-1' });
      expect(result).toEqual({ success: true });
    });

    it('reconciles an owned account with a positive discrepancy', async () => {
      const result = await controller.reconcile(
        'acc-1',
        { userId: 'user-1' },
        { realBalance: 1050, note: 'Ajuste de intereses ganados' },
      );

      expect(result.discrepancy).toBe(50);
      expect(result.account.balance).toBe(1050);
      expect(repository.reconcile).toHaveBeenCalledWith(
        'acc-1',
        'user-1',
        1050,
        'Ajuste de intereses ganados',
      );
    });
  });
});
