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
}

export interface UpdateSavingsGoalData {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
  targetDate?: Date | null;
  color?: string | null;
  icon?: string | null;
  isCompleted?: boolean;
}

export interface SavingsGoalRepositoryPort {
  create(data: CreateSavingsGoalData): Promise<SavingsGoal>;
  findAllByUserId(userId: string): Promise<SavingsGoal[]>;
  findById(id: string): Promise<SavingsGoal | null>;
  update(id: string, data: UpdateSavingsGoalData): Promise<SavingsGoal>;
  delete(id: string): Promise<void>;
  deposit(id: string, amount: number, accountId?: string): Promise<SavingsGoal>;
  withdraw(id: string, amount: number, accountId?: string): Promise<SavingsGoal>;
}
