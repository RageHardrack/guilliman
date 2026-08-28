export type RecurrenceFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'YEARLY'
  | 'CUSTOM';

export interface SubscriptionProps {
  id?: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  name: string;
  amount: number;
  currency?: string;
  frequency?: RecurrenceFrequency;
  customIntervalDays?: number | null;
  nextDueDate: Date | string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Subscription {
  readonly id?: string;
  readonly userId: string;
  readonly accountId: string;
  readonly categoryId?: string | null;
  readonly name: string;
  readonly amount: number;
  readonly currency: string;
  readonly frequency: RecurrenceFrequency;
  readonly customIntervalDays?: number | null;
  readonly nextDueDate: Date;
  readonly isActive: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: SubscriptionProps) {
    if (!props.userId) {
      throw new Error('El userId es requerido para la suscripción');
    }
    if (!props.accountId) {
      throw new Error('El accountId es requerido para la suscripción');
    }
    if (!props.name || props.name.trim() === '') {
      throw new Error('El nombre de la suscripción es requerido');
    }
    if (props.amount === undefined || props.amount <= 0) {
      throw new Error('El monto de la suscripción debe ser mayor a 0');
    }

    this.id = props.id;
    this.userId = props.userId;
    this.accountId = props.accountId;
    this.categoryId = props.categoryId;
    this.name = props.name.trim();
    this.amount = props.amount;
    this.currency = props.currency || 'USD';
    this.frequency = props.frequency || 'MONTHLY';
    this.customIntervalDays = props.customIntervalDays;
    this.nextDueDate =
      props.nextDueDate instanceof Date
        ? props.nextDueDate
        : new Date(props.nextDueDate);
    this.isActive = props.isActive !== undefined ? props.isActive : true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Calculates next due date based on frequency.
   */
  calculateNextDueDate(): Date {
    const current = new Date(this.nextDueDate);
    const next = new Date(current);

    if (this.frequency === 'WEEKLY') {
      next.setUTCDate(next.getUTCDate() + 7);
    } else if (this.frequency === 'BIWEEKLY') {
      next.setUTCDate(next.getUTCDate() + 14);
    } else if (this.frequency === 'BIMONTHLY') {
      next.setUTCMonth(next.getUTCMonth() + 2);
    } else if (this.frequency === 'QUARTERLY') {
      next.setUTCMonth(next.getUTCMonth() + 3);
    } else if (this.frequency === 'SEMIANNUAL') {
      next.setUTCMonth(next.getUTCMonth() + 6);
    } else if (this.frequency === 'YEARLY') {
      next.setUTCFullYear(next.getUTCFullYear() + 1);
    } else if (this.frequency === 'CUSTOM') {
      const days =
        this.customIntervalDays && this.customIntervalDays > 0
          ? this.customIntervalDays
          : 30;
      next.setUTCDate(next.getUTCDate() + days);
    } else {
      // Default: MONTHLY
      next.setUTCMonth(next.getUTCMonth() + 1);
    }

    return next;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      accountId: this.accountId,
      categoryId: this.categoryId,
      name: this.name,
      amount: this.amount,
      currency: this.currency,
      frequency: this.frequency,
      customIntervalDays: this.customIntervalDays,
      nextDueDate: this.nextDueDate.toISOString(),
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
