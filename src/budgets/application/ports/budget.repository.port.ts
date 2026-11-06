import { Budget } from '../../domain/budget.entity';

export interface CreateBudgetData {
  userId: string;
  categoryId: string;
  amount: number;
  currency?: string;
  period?: string;
}

/**
 * Full replacement body for PUT. `categoryId` and `userId` are not
 * updatable: ownership never changes and the category link is fixed at
 * creation time.
 */
export type UpdateBudgetData = Partial<{
  amount: number;
  currency: string;
  period: string;
}>;

/**
 * Every method is scoped by userId: a budget that does not exist or
 * belongs to another user must be indistinguishable (404, no mutation).
 * A categoryId that is not owned by the user is rejected with 400 before
 * the upsert.
 */
export abstract class BudgetRepositoryPort {
  abstract create(budget: CreateBudgetData): Promise<Budget>;

  abstract findByUserId(userId: string): Promise<Budget[]>;

  abstract findById(id: string, userId: string): Promise<Budget>;

  abstract findByUserAndCategory(
    userId: string,
    categoryId: string,
  ): Promise<Budget | null>;

  abstract update(
    id: string,
    userId: string,
    budget: UpdateBudgetData,
  ): Promise<Budget>;

  abstract delete(id: string, userId: string): Promise<void>;
}
