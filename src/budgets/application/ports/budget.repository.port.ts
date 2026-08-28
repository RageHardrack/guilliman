import { Budget } from '../../domain/budget.entity';

export abstract class BudgetRepositoryPort {
  abstract create(budget: {
    userId: string;
    categoryId: string;
    amount: number;
    currency?: string;
    period?: string;
  }): Promise<Budget>;

  abstract findByUserId(userId: string): Promise<Budget[]>;

  abstract findById(id: string): Promise<Budget | null>;

  abstract findByUserAndCategory(
    userId: string,
    categoryId: string,
  ): Promise<Budget | null>;

  abstract update(
    id: string,
    budget: Partial<{
      amount: number;
      currency: string;
      period: string;
    }>,
  ): Promise<Budget>;

  abstract delete(id: string): Promise<boolean>;
}
