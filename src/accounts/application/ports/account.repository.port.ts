import { Account, AccountProps } from '../../domain/account.entity';

export interface CreateAccountData {
  userId: string;
  name: string;
  type: AccountProps['type'];
  balance?: number;
  currency?: string;
}

/**
 * Every method except create is scoped by userId: an account that does not
 * exist or belongs to another user must be indistinguishable (404, no
 * mutation). `create` takes the owner inside the data payload, always
 * sourced from the authenticated user by the controller.
 */
export abstract class AccountRepositoryPort {
  abstract create(data: CreateAccountData): Promise<Account>;
  abstract findById(id: string, userId: string): Promise<Account>;
  abstract findByUserId(userId: string): Promise<Account[]>;
  abstract updateBalance(id: string, delta: number): Promise<Account>;
  abstract update(
    id: string,
    userId: string,
    data: Partial<Omit<CreateAccountData, 'userId'>>,
  ): Promise<Account>;
  abstract delete(id: string, userId: string): Promise<boolean>;
  abstract reconcile(
    id: string,
    userId: string,
    realBalance: number,
    note?: string,
  ): Promise<{ account: Account; discrepancy: number }>;
}
