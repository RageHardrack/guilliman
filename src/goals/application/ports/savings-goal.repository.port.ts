import { SavingsGoal } from '../../domain/savings-goal.entity';

export interface CreateSavingsGoalData {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  currency?: string;
  targetDate?: Date | null;
  color?: string | null;
  icon?: string | null;
  priority?: string;
}

/**
 * Full replacement body for PUT (every field optional; omitted fields keep
 * their stored value).
 */
export interface UpdateSavingsGoalData {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
  targetDate?: Date | null;
  color?: string | null;
  icon?: string | null;
  priority?: string;
  isCompleted?: boolean;
}

/**
 * Every method is scoped by userId: a goal that does not exist or belongs to
 * another user must be indistinguishable (404, no mutation), and a deposit or
 * withdrawal referencing an account the user does not own must be rejected
 * (400) before any balance moves.
 */
export interface SavingsGoalRepositoryPort {
  create(data: CreateSavingsGoalData): Promise<SavingsGoal>;
  findAllByUserId(userId: string): Promise<SavingsGoal[]>;
  findById(id: string, userId: string): Promise<SavingsGoal>;
  update(
    id: string,
    userId: string,
    data: UpdateSavingsGoalData,
  ): Promise<SavingsGoal>;
  delete(id: string, userId: string): Promise<void>;
  deposit(
    id: string,
    userId: string,
    amount: number,
    accountId?: string,
  ): Promise<SavingsGoal>;
  withdraw(
    id: string,
    userId: string,
    amount: number,
    accountId?: string,
  ): Promise<SavingsGoal>;
}
