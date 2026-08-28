import { Loan, LoanPayment } from '../../domain/loan.entity';
import { CreateLoanDto } from '../../infrastructure/dtos/create-loan.dto';
import { CreateLoanPaymentDto } from '../../infrastructure/dtos/create-loan-payment.dto';
import { UpdateLoanDto } from '../../infrastructure/dtos/update-loan.dto';

export abstract class LoanRepositoryPort {
  abstract create(dto: CreateLoanDto): Promise<Loan>;
  abstract findById(id: string): Promise<Loan | null>;
  abstract findByUserId(userId: string): Promise<Loan[]>;
  abstract update(id: string, dto: UpdateLoanDto): Promise<Loan>;
  abstract delete(id: string): Promise<void>;
  abstract addPayment(loanId: string, dto: CreateLoanPaymentDto): Promise<{ loan: Loan; payment: LoanPayment }>;
  abstract deletePayment(paymentId: string): Promise<Loan>;
}
