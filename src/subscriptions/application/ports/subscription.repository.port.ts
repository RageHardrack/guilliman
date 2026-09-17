import {
  RecurrenceFrequency,
  Subscription,
} from '../../domain/subscription.entity';

export interface RecordPaymentOptions {
  paymentDate?: Date;
  debitedAmount?: number;
  exchangeRate?: number;
  destinationAmount?: number;
  accountId?: string;
  note?: string;
}

export abstract class SubscriptionRepositoryPort {
  abstract create(subscription: {
    userId: string;
    accountId: string;
    categoryId?: string | null;
    name: string;
    amount: number;
    currency?: string;
    frequency?: RecurrenceFrequency;
    customIntervalDays?: number | null;
    nextDueDate: Date;
    isActive?: boolean;
  }): Promise<Subscription>;

  abstract findByUserId(userId: string): Promise<Subscription[]>;

  abstract findById(id: string): Promise<Subscription | null>;

  abstract update(
    id: string,
    subscription: Partial<{
      accountId: string;
      categoryId?: string | null;
      name: string;
      amount: number;
      currency: string;
      frequency: RecurrenceFrequency;
      customIntervalDays?: number | null;
      nextDueDate: Date;
      isActive: boolean;
    }>,
  ): Promise<Subscription>;

  abstract recordPayment(
    id: string,
    options?: RecordPaymentOptions,
  ): Promise<{ subscription: Subscription; transactionId: string }>;

  abstract delete(id: string): Promise<boolean>;
}
