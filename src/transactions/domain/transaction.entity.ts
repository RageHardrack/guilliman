export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TaxCategory =
  | 'NONE'
  | 'FOURTH_CATEGORY_INCOME'
  | 'FIFTH_CATEGORY_INCOME'
  | 'DEDUCTIBLE_EXPENSE_3UIT';
export type TaxDocumentType =
  'NONE' | 'RXH' | 'FACTURA' | 'BOLETA' | 'PAYROLL_SLIP' | 'OTHER';
export type TaxDeductionType =
  | 'NONE'
  | 'RESTAURANT_BAR'
  | 'HOTEL'
  | 'RENTAL'
  | 'PROFESSIONAL_SERVICE'
  | 'DOMESTIC_WORKER';

export interface TransactionProps {
  id: string;
  userId: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  amount: number;
  destinationAmount?: number | null;
  exchangeRate?: number | null;
  type: TransactionType;
  date: Date;
  note?: string | null;
  taxCategory?: TaxCategory;
  taxDocumentType?: TaxDocumentType;
  taxDocumentNumber?: string | null;
  taxWithholdingAmount?: number | null;
  taxDeductionType?: TaxDeductionType;
  createdAt: Date;
  updatedAt: Date;
}

export class Transaction {
  constructor(private readonly props: TransactionProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get destinationAccountId(): string | null | undefined {
    return this.props.destinationAccountId;
  }
  get categoryId(): string | null | undefined {
    return this.props.categoryId;
  }
  get amount(): number {
    return this.props.amount;
  }
  get destinationAmount(): number | null | undefined {
    return this.props.destinationAmount;
  }
  get exchangeRate(): number | null | undefined {
    return this.props.exchangeRate;
  }
  get type(): TransactionType {
    return this.props.type;
  }
  get date(): Date {
    return this.props.date;
  }
  get note(): string | null | undefined {
    return this.props.note;
  }
  get taxCategory(): TaxCategory {
    return this.props.taxCategory || 'NONE';
  }
  get taxDocumentType(): TaxDocumentType {
    return this.props.taxDocumentType || 'NONE';
  }
  get taxDocumentNumber(): string | null | undefined {
    return this.props.taxDocumentNumber;
  }
  get taxWithholdingAmount(): number {
    return this.props.taxWithholdingAmount || 0;
  }
  get taxDeductionType(): TaxDeductionType {
    return this.props.taxDeductionType || 'NONE';
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): TransactionProps {
    return { ...this.props };
  }
}
