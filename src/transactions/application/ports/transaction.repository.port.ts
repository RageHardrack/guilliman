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

export abstract class TransactionRepositoryPort {
  abstract create(data: CreateTransactionData): Promise<Transaction>;
  abstract findById(id: string): Promise<Transaction | null>;
  abstract findByUserId(userId: string): Promise<Transaction[]>;
  abstract update(
    id: string,
    data: Partial<Omit<CreateTransactionData, 'userId'>>,
  ): Promise<Transaction>;
  abstract delete(id: string): Promise<boolean>;
}
