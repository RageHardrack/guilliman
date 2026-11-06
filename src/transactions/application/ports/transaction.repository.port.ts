import {
  TaxCategory,
  TaxDeductionType,
  TaxDocumentType,
  Transaction,
  TransactionType,
} from '../../domain/transaction.entity';

export interface CreateTransactionData {
  userId: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  amount: number;
  destinationAmount?: number;
  exchangeRate?: number;
  type: TransactionType;
  date?: Date;
  note?: string;
  taxCategory?: TaxCategory;
  taxDocumentType?: TaxDocumentType;
  taxDocumentNumber?: string;
  taxWithholdingAmount?: number;
  taxDeductionType?: TaxDeductionType;
}

/**
 * Partial replacement body for PUT (same shape as create, minus ownership).
 */
export type UpdateTransactionData = Partial<
  Omit<CreateTransactionData, 'userId'>
>;

/**
 * Every method is scoped by userId: a transaction that does not exist or
 * belongs to another user must be indistinguishable (404, no mutation), and
 * a referenced account or category that is not owned rejects the write with
 * 400 before any balance moves.
 */
export abstract class TransactionRepositoryPort {
  abstract create(data: CreateTransactionData): Promise<Transaction>;
  abstract findById(id: string, userId: string): Promise<Transaction>;
  abstract findByUserId(userId: string): Promise<Transaction[]>;
  abstract update(
    id: string,
    userId: string,
    data: UpdateTransactionData,
  ): Promise<Transaction>;
  abstract delete(id: string, userId: string): Promise<boolean>;
}
