export interface BudgetProps {
  id?: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency?: string;
  period?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Budget {
  readonly id?: string;
  readonly userId: string;
  readonly categoryId: string;
  readonly amount: number;
  readonly currency: string;
  readonly period: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: BudgetProps) {
    if (!props.userId) {
      throw new Error('El userId es requerido para el presupuesto');
    }
    if (!props.categoryId) {
      throw new Error('El categoryId es requerido para el presupuesto');
    }
    if (props.amount === undefined || props.amount <= 0) {
      throw new Error('El monto del presupuesto debe ser mayor a 0');
    }

    this.id = props.id;
    this.userId = props.userId;
    this.categoryId = props.categoryId;
    this.amount = props.amount;
    this.currency = props.currency || 'USD';
    this.period = props.period || 'MONTHLY';
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      categoryId: this.categoryId,
      amount: this.amount,
      currency: this.currency,
      period: this.period,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
