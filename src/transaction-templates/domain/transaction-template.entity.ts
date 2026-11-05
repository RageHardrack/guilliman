export type TransactionTemplateType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

const TRANSACTION_TEMPLATE_TYPES: readonly unknown[] = [
  'EXPENSE',
  'INCOME',
  'TRANSFER',
];

/**
 * Domain-level invariant violation. Infrastructure adapters map it to HTTP 400.
 */
export class TransactionTemplateDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionTemplateDomainError';
  }
}

export interface TransactionTemplateProps {
  id?: string;
  userId: string;
  name: string;
  type: unknown;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  defaultAmount?: unknown;
  note?: string | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A per-user, non-shared, non-schedulable preset for quick transaction
 * registration (S1, S6, S8). Rules S2-S4 and S9 are enforced here; nothing
 * about recurrence, due dates or reminders belongs to this entity.
 */
export class TransactionTemplate {
  readonly id?: string;
  readonly userId: string;
  readonly name: string;
  readonly type: TransactionTemplateType;
  readonly accountId: string;
  readonly destinationAccountId: string | null;
  readonly categoryId: string | null;
  readonly defaultAmount: number | null;
  readonly note: string | null;
  readonly lastUsedAt: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: TransactionTemplateProps) {
    if (!props.userId || props.userId.trim() === '') {
      throw new TransactionTemplateDomainError('Template userId is required');
    }
    if (!props.name || props.name.trim() === '') {
      throw new TransactionTemplateDomainError(
        'Template name is required and cannot be blank',
      );
    }
    if (!props.accountId || props.accountId.trim() === '') {
      throw new TransactionTemplateDomainError(
        'Template accountId is required',
      );
    }
    if (!TRANSACTION_TEMPLATE_TYPES.includes(props.type)) {
      throw new TransactionTemplateDomainError(
        'Template type must be one of EXPENSE, INCOME, TRANSFER',
      );
    }
    if (!props.destinationAccountId && props.type === 'TRANSFER') {
      throw new TransactionTemplateDomainError(
        'TRANSFER templates require a destinationAccountId different from accountId',
      );
    }
    if (
      props.destinationAccountId &&
      props.destinationAccountId === props.accountId
    ) {
      throw new TransactionTemplateDomainError(
        'Template destinationAccountId must be different from accountId',
      );
    }
    if (props.destinationAccountId && props.type !== 'TRANSFER') {
      throw new TransactionTemplateDomainError(
        'Only TRANSFER templates can have a destinationAccountId',
      );
    }
    if (
      props.defaultAmount !== undefined &&
      props.defaultAmount !== null &&
      (typeof props.defaultAmount !== 'number' ||
        !Number.isFinite(props.defaultAmount) ||
        props.defaultAmount <= 0)
    ) {
      throw new TransactionTemplateDomainError(
        'Template defaultAmount must be a number greater than 0',
      );
    }

    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name.trim();
    this.type = props.type as TransactionTemplateType;
    this.accountId = props.accountId;
    this.destinationAccountId = props.destinationAccountId ?? null;
    this.categoryId = props.categoryId ?? null;
    this.defaultAmount =
      props.defaultAmount === undefined
        ? null
        : (props.defaultAmount as number | null);
    this.note = props.note ?? null;
    this.lastUsedAt = props.lastUsedAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      type: this.type,
      accountId: this.accountId,
      destinationAccountId: this.destinationAccountId,
      categoryId: this.categoryId,
      defaultAmount: this.defaultAmount,
      note: this.note,
      lastUsedAt: this.lastUsedAt ? this.lastUsedAt.toISOString() : null,
      createdAt: this.createdAt ? this.createdAt.toISOString() : undefined,
      updatedAt: this.updatedAt ? this.updatedAt.toISOString() : undefined,
    };
  }
}
