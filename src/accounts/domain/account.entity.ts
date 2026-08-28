export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'INVESTMENT'
  | 'WALLET';

export interface AccountProps {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Account {
  constructor(private readonly props: AccountProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): AccountType {
    return this.props.type;
  }
  get balance(): number {
    return this.props.balance;
  }
  get currency(): string {
    return this.props.currency;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): AccountProps {
    return { ...this.props };
  }
}
