import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  TransactionTemplate,
  TransactionTemplateDomainError,
} from '../../domain/transaction-template.entity';
import {
  CreateTransactionTemplateData,
  TransactionTemplateRepositoryPort,
  UpdateTransactionTemplateData,
} from '../../application/ports/transaction-template.repository.port';

type TemplateRow = {
  id: string;
  userId: string;
  name: string;
  type: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  defaultAmount: number | null;
  note: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaTransactionTemplateRepository implements TransactionTemplateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateTransactionTemplateData,
  ): Promise<TransactionTemplate> {
    const draft = this.buildDraft(data.userId, data);

    await this.assertReferencesOwned(draft, data.userId);

    const created = await this.prisma.transactionTemplate.create({
      data: {
        userId: data.userId,
        name: draft.name,
        type: draft.type,
        accountId: draft.accountId,
        destinationAccountId: draft.destinationAccountId,
        categoryId: draft.categoryId,
        defaultAmount: draft.defaultAmount,
        note: draft.note,
      },
    });

    return this.toDomain(created);
  }

  async findAllByUserId(userId: string): Promise<TransactionTemplate[]> {
    const rows = await this.prisma.transactionTemplate.findMany({
      where: { userId },
      orderBy: [
        { lastUsedAt: { sort: 'desc', nulls: 'last' } },
        { name: 'asc' },
      ],
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string, userId: string): Promise<TransactionTemplate> {
    return this.toDomain(await this.getOwnedRow(id, userId));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateTransactionTemplateData,
  ): Promise<TransactionTemplate> {
    await this.getOwnedRow(id, userId);
    const draft = this.buildDraft(userId, data);

    await this.assertReferencesOwned(draft, userId);

    const updated = await this.prisma.transactionTemplate.update({
      where: { id },
      data: {
        name: draft.name,
        type: draft.type,
        accountId: draft.accountId,
        destinationAccountId: draft.destinationAccountId,
        categoryId: draft.categoryId,
        defaultAmount: draft.defaultAmount,
        note: draft.note,
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwnedRow(id, userId);
    await this.prisma.transactionTemplate.delete({ where: { id } });
  }

  async markUsed(id: string, userId: string): Promise<TransactionTemplate> {
    await this.getOwnedRow(id, userId);
    const updated = await this.prisma.transactionTemplate.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });

    return this.toDomain(updated);
  }

  /**
   * Reads by { id, userId } so foreign and missing templates both look
   * absent: the caller gets 404 and no mutation is attempted.
   */
  private async getOwnedRow(id: string, userId: string): Promise<TemplateRow> {
    const row = await this.prisma.transactionTemplate.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Transaction template not found');
    }
    return row;
  }

  /**
   * Validates through the domain entity before touching the database, so a
   * rejected payload can never leave a write behind.
   */
  private buildDraft(
    userId: string,
    data: Omit<CreateTransactionTemplateData, 'userId'>,
  ): TransactionTemplate {
    try {
      return new TransactionTemplate({ userId, ...data });
    } catch (error) {
      if (error instanceof TransactionTemplateDomainError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async assertReferencesOwned(
    draft: TransactionTemplate,
    userId: string,
  ): Promise<void> {
    const referenceIds = [
      { id: draft.accountId, kind: 'account' },
      { id: draft.destinationAccountId, kind: 'destination account' },
    ];

    for (const reference of referenceIds) {
      if (reference.id === null) {
        continue;
      }
      const found = await this.prisma.account.findFirst({
        where: { id: reference.id, userId },
      });
      if (!found) {
        throw new BadRequestException(
          `Referenced ${reference.kind} does not belong to the user`,
        );
      }
    }

    if (draft.categoryId !== null) {
      const category = await this.prisma.category.findFirst({
        where: { id: draft.categoryId, userId },
      });
      if (!category) {
        throw new BadRequestException(
          'Referenced category does not belong to the user',
        );
      }
    }
  }

  private toDomain(row: TemplateRow): TransactionTemplate {
    return new TransactionTemplate({
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type,
      accountId: row.accountId,
      destinationAccountId: row.destinationAccountId,
      categoryId: row.categoryId,
      defaultAmount: row.defaultAmount,
      note: row.note,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
