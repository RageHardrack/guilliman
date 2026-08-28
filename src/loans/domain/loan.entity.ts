export type LoanType = 'LENT' | 'BORROWED';
export type LoanStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export class LoanPayment {
  constructor(
    public readonly id: string,
    public readonly loanId: string,
    public readonly amount: number,
    public readonly date: Date,
    public readonly accountId: string | null,
    public readonly notes: string | null,
    public readonly createdAt: Date,
  ) {}
}

export class Loan {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly personName: string,
    public readonly type: LoanType,
    public readonly amount: number,
    public readonly remainingAmount: number,
    public readonly currency: string,
    public readonly dueDate: Date | null,
    public readonly status: LoanStatus,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly payments: LoanPayment[] = [],
  ) {}

  get paidAmount(): number {
    return Math.max(
      0,
      Math.round((this.amount - this.remainingAmount) * 100) / 100,
    );
  }

  get progressPercentage(): number {
    if (this.amount <= 0) return 100;
    return Math.min(
      100,
      Math.round((this.paidAmount / this.amount) * 1000) / 10,
    );
  }
}
