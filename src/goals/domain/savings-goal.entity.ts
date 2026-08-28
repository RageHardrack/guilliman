export class SavingsGoal {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly targetAmount: number,
    public readonly currentAmount: number,
    public readonly currency: string,
    public readonly targetDate: Date | null,
    public readonly color: string | null,
    public readonly icon: string | null,
    public readonly isCompleted: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get progressPercentage(): number {
    if (this.targetAmount <= 0) return 100;
    return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 1000) / 10);
  }

  get remainingAmount(): number {
    return Math.max(0, Math.round((this.targetAmount - this.currentAmount) * 100) / 100);
  }
}
