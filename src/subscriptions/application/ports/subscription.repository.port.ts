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

/**
 * Raw creation payload as accepted by the API. `userId` always comes from
 * the JWT, never from the request body.
 */
export interface CreateSubscriptionData {
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
}

/**
 * Partial replacement body for PUT (same shape as create, minus
 * ownership).
 */
export type UpdateSubscriptionData = Partial<
  Omit<CreateSubscriptionData, 'userId'>
>;

/**
 * Every method is scoped by userId: a subscription that does not exist or
 * belongs to another user must be indistinguishable (404, no mutation).
 */
export abstract class SubscriptionRepositoryPort {
  abstract create(data: CreateSubscriptionData): Promise<Subscription>;

  abstract findByUserId(userId: string): Promise<Subscription[]>;

  abstract findById(id: string, userId: string): Promise<Subscription>;

  abstract update(
    id: string,
    userId: string,
    data: UpdateSubscriptionData,
  ): Promise<Subscription>;

  abstract recordPayment(
    id: string,
    userId: string,
    options?: RecordPaymentOptions,
  ): Promise<{ subscription: Subscription; transactionId: string }>;

  abstract delete(id: string, userId: string): Promise<void>;
}
