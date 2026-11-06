import { Loan, LoanPayment } from '../../domain/loan.entity';
import { CreateLoanDto } from '../../infrastructure/dtos/create-loan.dto';
import { UpdateLoanDto } from '../../infrastructure/dtos/update-loan.dto';
import { CreateLoanPaymentDto } from '../../infrastructure/dtos/create-loan-payment.dto';

/**
 * Every method except findByUserId is scoped by userId: a loan that does not
 * exist or belongs to another user must be indistinguishable (404, no
 * mutation). The userId always comes from the authenticated user; any userId
 * inside the DTOs is ignored.
 */
export abstract class LoanRepositoryPort {
  abstract create(userId: string, dto: CreateLoanDto): Promise<Loan>;
  abstract findById(id: string, userId: string): Promise<Loan>;
  abstract findByUserId(userId: string): Promise<Loan[]>;
  abstract update(
    id: string,
    userId: string,
    dto: UpdateLoanDto,
  ): Promise<Loan>;
  abstract delete(id: string, userId: string): Promise<void>;
  abstract addPayment(
    loanId: string,
    userId: string,
    dto: CreateLoanPaymentDto,
  ): Promise<{ loan: Loan; payment: LoanPayment }>;
  abstract deletePayment(paymentId: string, userId: string): Promise<Loan>;
}
