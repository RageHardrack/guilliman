import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import {
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { TransactionTemplate } from '../../domain/transaction-template.entity';
import { TransactionTemplatesController } from './transaction-templates.controller';
import type { TransactionTemplateRepositoryPort } from '../../application/ports/transaction-template.repository.port';

const template = new TransactionTemplate({
  id: 'tpl-1',
  userId: 'user-1',
  name: 'Transporte publico',
  type: 'EXPENSE',
  accountId: 'acc-interbank',
  destinationAccountId: null,
  categoryId: null,
  defaultAmount: 3,
  note: null,
  lastUsedAt: null,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
});

const createDto = {
  name: 'Transporte publico',
  type: 'EXPENSE' as const,
  accountId: 'acc-interbank',
  destinationAccountId: undefined,
  categoryId: undefined,
  defaultAmount: 3,
  note: undefined,
};

describe('TransactionTemplatesController', () => {
  let controller: TransactionTemplatesController;
  let repository: TransactionTemplateRepositoryPort;

  beforeEach(() => {
    repository = {
      create: vi.fn().mockResolvedValue(template),
      findAllByUserId: vi.fn().mockResolvedValue([template]),
      findById: vi.fn().mockResolvedValue(template),
      update: vi.fn().mockResolvedValue(template),
      delete: vi.fn().mockResolvedValue(undefined),
      markUsed: vi.fn().mockResolvedValue(template),
    };

    controller = new TransactionTemplatesController(repository);
  });

  describe('S1 — userId always comes from the token', () => {
    it('creates with the token userId and ignores any userId in the body', async () => {
      await controller.create({ userId: 'token-user' }, {
        ...createDto,
        userId: 'body-user',
      } as unknown as typeof createDto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'token-user',
        name: 'Transporte publico',
        type: 'EXPENSE',
        accountId: 'acc-interbank',
        destinationAccountId: undefined,
        categoryId: undefined,
        defaultAmount: 3,
        note: undefined,
      });
      const payload = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(JSON.stringify(payload)).not.toContain('body-user');
    });

    it('scopes every operation to the token userId', async () => {
      await controller.findAll({ userId: 'token-user' });
      await controller.findOne('tpl-1', { userId: 'token-user' });
      await controller.update('tpl-1', { userId: 'token-user' }, createDto);
      await controller.remove('tpl-1', { userId: 'token-user' });
      await controller.use('tpl-1', { userId: 'token-user' });

      expect(repository.findAllByUserId).toHaveBeenCalledWith('token-user');
      expect(repository.findById).toHaveBeenCalledWith('tpl-1', 'token-user');
      expect(repository.update).toHaveBeenCalledWith('tpl-1', 'token-user', {
        ...createDto,
      });
      expect(repository.delete).toHaveBeenCalledWith('tpl-1', 'token-user');
      expect(repository.markUsed).toHaveBeenCalledWith('tpl-1', 'token-user');
    });

    it('surfaces the port 404 for a foreign or missing template on GET, PUT, DELETE and USE', async () => {
      const notFound = new NotFoundException('Transaction template not found');
      repository.findById = vi.fn().mockRejectedValue(notFound);
      repository.update = vi.fn().mockRejectedValue(notFound);
      repository.delete = vi.fn().mockRejectedValue(notFound);
      repository.markUsed = vi.fn().mockRejectedValue(notFound);

      await expect(
        controller.findOne('tpl-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update('tpl-foreign', { userId: 'token-user' }, createDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.remove('tpl-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.use('tpl-foreign', { userId: 'token-user' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('surfaces the port 400 when a referenced account or category is not owned, without saving', async () => {
      const badRequest = new BadRequestException(
        'Referenced account or category does not belong to the user',
      );
      repository.create = vi.fn().mockRejectedValue(badRequest);
      repository.update = vi.fn().mockRejectedValue(badRequest);

      await expect(
        controller.create(
          { userId: 'token-user' },
          { ...createDto, accountId: 'acc-foreign' },
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.update(
          'tpl-1',
          { userId: 'token-user' },
          {
            ...createDto,
            categoryId: 'cat-foreign',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the S9 JSON shape from create', async () => {
      const result = await controller.create({ userId: 'user-1' }, createDto);

      expect(result).toEqual({
        id: 'tpl-1',
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
    });
  });

  it('DELETE answers with the goals DELETE contract (200, success flag)', async () => {
    const result = await controller.remove('tpl-1', { userId: 'user-1' });
    expect(result).toEqual({ success: true });
  });

  it('POST /:id/use answers 200 as the API contract documents, not the POST default 201', () => {
    const httpCode: unknown = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      TransactionTemplatesController.prototype.use,
    );

    expect(httpCode).toBe(HttpStatus.OK);
  });

  it('POST /:id/use returns the template with lastUsedAt set to now', async () => {
    const used = new TransactionTemplate({
      id: 'tpl-1',
      userId: 'user-1',
      name: 'Transporte publico',
      type: 'EXPENSE',
      accountId: 'acc-interbank',
      destinationAccountId: null,
      categoryId: null,
      defaultAmount: 3,
      note: null,
      lastUsedAt: new Date('2026-11-05T12:00:00.000Z'),
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      updatedAt: new Date('2026-11-05T12:00:00.000Z'),
    });
    repository.markUsed = vi.fn().mockResolvedValue(used);

    const result = await controller.use('tpl-1', { userId: 'user-1' });

    expect(result.lastUsedAt).toBe('2026-11-05T12:00:00.000Z');
  });
});
