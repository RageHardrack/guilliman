import { Account, AccountProps } from '../../domain/account.entity';

export interface CreateAccountData {
  userId: string;
  name: string;
  type: AccountProps['type'];
  balance?: number;
  currency?: string;
}

export abstract class AccountRepositoryPort {
  abstract create(data: CreateAccountData): Promise<Account>;
  abstract findById(id: string): Promise<Account | null>;
  abstract findByUserId(userId: string): Promise<Account[]>;
  abstract updateBalance(id: string, delta: number): Promise<Account>;
  abstract update(
    id: string,
    data: Partial<Omit<CreateAccountData, 'userId'>>,
  ): Promise<Account>;
  abstract delete(id: string): Promise<boolean>;
  abstract reconcile(
    id: string,
    realBalance: number,
    note?: string,
  ): Promise<{ account: Account; discrepancy: number }>;
}
