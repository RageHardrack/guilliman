import { TransactionTemplate } from '../../domain/transaction-template.entity';

/**
 * Raw creation payload as accepted by the API. `type` and `defaultAmount`
 * arrive unvalidated (the app has no ValidationPipe); the domain entity is
 * the single place that validates them.
 */
export interface CreateTransactionTemplateData {
  userId: string;
  name: string;
  type: unknown;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  defaultAmount?: unknown;
  note?: string | null;
}

/**
 * Full replacement body for PUT (same shape as create, minus ownership).
 */
export type UpdateTransactionTemplateData = Omit<
  CreateTransactionTemplateData,
  'userId'
>;

/**
 * Every method is scoped by userId: a template that does not exist or
 * belongs to another user must be indistinguishable (404, no mutation).
 */
export abstract class TransactionTemplateRepositoryPort {
  abstract create(
    data: CreateTransactionTemplateData,
  ): Promise<TransactionTemplate>;

  abstract findAllByUserId(userId: string): Promise<TransactionTemplate[]>;

  abstract findById(id: string, userId: string): Promise<TransactionTemplate>;

  abstract update(
    id: string,
    userId: string,
    data: UpdateTransactionTemplateData,
  ): Promise<TransactionTemplate>;

  abstract delete(id: string, userId: string): Promise<void>;

  abstract markUsed(id: string, userId: string): Promise<TransactionTemplate>;
}
