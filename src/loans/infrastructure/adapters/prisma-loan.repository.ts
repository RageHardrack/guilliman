import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { CreateLoanDto } from '../dtos/create-loan.dto';
import { UpdateLoanDto } from '../dtos/update-loan.dto';
import { CreateLoanPaymentDto } from '../dtos/create-loan-payment.dto';
import { LoanRepositoryPort } from '../../application/ports/loan.repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  Loan,
  LoanPayment,
  LoanStatus,
  LoanType,
} from '../../domain/loan.entity';

/**
 * Row shapes the adapter reads from Prisma for `loans` and `loan_payments`.
 */
type LoanPaymentRow = {
  id: string;
  loanId: string;
  amount: number;
  date: Date;
  accountId: string | null;
  notes: string | null;
  createdAt: Date;
};

type LoanRow = {
  id: string;
  userId: string;
  personName: string;
  type: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  dueDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LoanWithPaymentsRow = LoanRow & { payments?: LoanPaymentRow[] };

type LoanAccountRow = { id: string; userId: string; balance: number };

/**
 * The part of the client the ownership reads and loan writes need, so the
 * same guards run both on the plain client and inside a transaction.
 */
type LoanClient = Pick<
  Prisma.TransactionClient,
  'loan' | 'loanPayment' | 'account' | 'transaction'
>;

@Injectable()
export class PrismaLoanRepository implements LoanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapPaymentToEntity(p: LoanPaymentRow): LoanPayment {
    return new LoanPayment(
      p.id,
      p.loanId,
      p.amount,
      p.date,
      p.accountId,
      p.notes,
      p.createdAt,
    );
  }

  private mapToEntity(record: LoanWithPaymentsRow): Loan {
    return new Loan(
      record.id,
      record.userId,
      record.personName,
      record.type as LoanType,
      record.amount,
      record.remainingAmount,
      record.currency,
      record.dueDate,
      record.status as LoanStatus,
      record.notes,
      record.createdAt,
      record.updatedAt,
      record.payments
        ? record.payments.map((p) => this.mapPaymentToEntity(p))
        : [],
    );
  }

  /**
   * Reads by { id, userId } so a foreign loan and a missing loan are
   * indistinguishable: the caller gets 404 and no mutation is attempted.
   */
  private async findOwnedLoan(
    client: LoanClient,
    id: string,
    userId: string,
    withPayments = false,
  ): Promise<LoanWithPaymentsRow | null> {
    return withPayments
      ? await client.loan.findFirst({
          where: { id, userId },
          include: { payments: { orderBy: { date: 'desc' } } },
        })
      : await client.loan.findFirst({ where: { id, userId } });
  }

  private async getOwnedLoan(
    client: LoanClient,
    id: string,
    userId: string,
    withPayments = false,
  ): Promise<LoanWithPaymentsRow> {
    const row = await this.findOwnedLoan(client, id, userId, withPayments);

    if (!row) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    return row;
  }

  /**
   * An account the user does not own is rejected before any balance moves,
   * any payment is recorded or any tracking transaction is created.
   */
  private async assertAccountOwned(
    client: LoanClient,
    accountId: string,
    userId: string,
  ): Promise<LoanAccountRow> {
    const account = await client.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new BadRequestException(
        'Referenced account does not belong to the user',
      );
    }

    return account;
  }

  async create(userId: string, dto: CreateLoanDto): Promise<Loan> {
    return await this.prisma.$transaction(async (tx) => {
      // The owner always comes from the token; a userId in the body is
      // ignored. The initial account is validated before any write, so a
      // foreign account leaves no loan, no balance change and no transaction.
      const initialAccount = dto.initialAccountId
        ? await this.assertAccountOwned(tx, dto.initialAccountId, userId)
        : null;

      const initialRemaining = dto.amount;
      const loanRecord = await tx.loan.create({
        data: {
          userId,
          personName: dto.personName,
          type: dto.type,
          amount: dto.amount,
          remainingAmount: initialRemaining,
          currency: dto.currency || 'USD',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          notes: dto.notes || null,
          status: 'PENDING',
        },
        include: {
          payments: true,
        },
      });

      // Si se vinculó una cuenta bancaria inicial, impactar el saldo contable
      if (initialAccount) {
        if (dto.type === 'LENT') {
          // Presté dinero -> Sale dinero de mi cuenta
          await tx.account.update({
            where: { id: initialAccount.id },
            data: { balance: initialAccount.balance - dto.amount },
          });
          await tx.transaction.create({
            data: {
              userId,
              accountId: initialAccount.id,
              amount: dto.amount,
              type: 'EXPENSE',
              date: new Date(),
              note: `Préstamo otorgado a ${dto.personName}`,
            },
          });
        } else {
          // Me prestaron dinero -> Entra dinero a mi cuenta
          await tx.account.update({
            where: { id: initialAccount.id },
            data: { balance: initialAccount.balance + dto.amount },
          });
          await tx.transaction.create({
            data: {
              userId,
              accountId: initialAccount.id,
              amount: dto.amount,
              type: 'INCOME',
              date: new Date(),
              note: `Préstamo recibido de ${dto.personName}`,
            },
          });
        }
      }

      return this.mapToEntity(loanRecord);
    });
  }

  async findById(id: string, userId: string): Promise<Loan> {
    const record = await this.getOwnedLoan(this.prisma, id, userId, true);
    return this.mapToEntity(record);
  }

  async findByUserId(userId: string): Promise<Loan[]> {
    const records = await this.prisma.loan.findMany({
      where: { userId },
      include: {
        payments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToEntity(r));
  }

  async update(id: string, userId: string, dto: UpdateLoanDto): Promise<Loan> {
    const existing = await this.getOwnedLoan(this.prisma, id, userId);

    const dataToUpdate: Prisma.LoanUpdateInput = {};
    if (dto.personName !== undefined) dataToUpdate.personName = dto.personName;
    if (dto.currency !== undefined) dataToUpdate.currency = dto.currency;
    if (dto.dueDate !== undefined)
      dataToUpdate.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.status !== undefined) dataToUpdate.status = dto.status;
    if (dto.notes !== undefined) dataToUpdate.notes = dto.notes;

    if (dto.amount !== undefined && dto.amount !== existing.amount) {
      const diff = dto.amount - existing.amount;
      dataToUpdate.amount = dto.amount;
      dataToUpdate.remainingAmount = Math.max(
        0,
        existing.remainingAmount + diff,
      );
      if (dataToUpdate.remainingAmount <= 0.01) {
        dataToUpdate.status = 'PAID';
      } else if (dataToUpdate.remainingAmount < dto.amount) {
        dataToUpdate.status = 'PARTIALLY_PAID';
      } else {
        dataToUpdate.status = 'PENDING';
      }
    }

    const updated = await this.prisma.loan.update({
      where: { id },
      data: dataToUpdate,
      include: {
        payments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    return this.mapToEntity(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwnedLoan(this.prisma, id, userId);

    await this.prisma.loan.delete({ where: { id } });
  }

  async addPayment(
    loanId: string,
    userId: string,
    dto: CreateLoanPaymentDto,
  ): Promise<{ loan: Loan; payment: LoanPayment }> {
    return await this.prisma.$transaction(async (tx) => {
      const loan = await this.getOwnedLoan(tx, loanId, userId, true);

      if (dto.amount <= 0) {
        throw new BadRequestException(
          'Payment amount must be greater than zero',
        );
      }

      // A foreign account is rejected before the payment or any balance
      // movement is written, so nothing can change on a rejected payment.
      const paymentAccount = dto.accountId
        ? await this.assertAccountOwned(tx, dto.accountId, userId)
        : null;

      const paymentDate = dto.date ? new Date(dto.date) : new Date();
      const paymentRecord = await tx.loanPayment.create({
        data: {
          loanId,
          amount: dto.amount,
          date: paymentDate,
          accountId: dto.accountId || null,
          notes: dto.notes || null,
        },
      });

      const newRemaining = Math.max(
        0,
        Math.round((loan.remainingAmount - dto.amount) * 100) / 100,
      );
      let newStatus: LoanStatus = 'PARTIALLY_PAID';
      if (newRemaining <= 0.01) {
        newStatus = 'PAID';
      } else if (newRemaining === loan.amount) {
        newStatus = 'PENDING';
      }

      const updatedLoanRecord = await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingAmount: newRemaining,
          status: newStatus,
        },
        include: {
          payments: {
            orderBy: { date: 'desc' },
          },
        },
      });

      // Si se vinculó una cuenta bancaria, registrar la transacción contable
      if (paymentAccount) {
        if (loan.type === 'LENT') {
          // Me abonaron dinero que presté -> Entra dinero a mi cuenta
          await tx.account.update({
            where: { id: paymentAccount.id },
            data: { balance: paymentAccount.balance + dto.amount },
          });
          await tx.transaction.create({
            data: {
              userId,
              accountId: paymentAccount.id,
              amount: dto.amount,
              type: 'INCOME',
              date: paymentDate,
              note: `Abono recibido de préstamo a ${loan.personName}`,
            },
          });
        } else {
          // Yo aboné dinero a mi deuda -> Sale dinero de mi cuenta
          await tx.account.update({
            where: { id: paymentAccount.id },
            data: { balance: paymentAccount.balance - dto.amount },
          });
          await tx.transaction.create({
            data: {
              userId,
              accountId: paymentAccount.id,
              amount: dto.amount,
              type: 'EXPENSE',
              date: paymentDate,
              note: `Pago de préstamo a ${loan.personName}`,
            },
          });
        }
      }

      return {
        loan: this.mapToEntity(updatedLoanRecord),
        payment: this.mapPaymentToEntity(paymentRecord),
      };
    });
  }

  async deletePayment(paymentId: string, userId: string): Promise<Loan> {
    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.loanPayment.findUnique({
        where: { id: paymentId },
      });

      // The payment is only reachable through its loan owner: a payment of a
      // foreign loan answers the same 404 as a missing one, without naming
      // the foreign loan, and leaves remainingAmount untouched.
      const loan = payment
        ? await this.findOwnedLoan(tx, payment.loanId, userId, true)
        : null;

      if (!payment || !loan) {
        throw new NotFoundException(
          `Loan payment with id ${paymentId} not found`,
        );
      }

      await tx.loanPayment.delete({ where: { id: paymentId } });

      const newRemaining = Math.min(
        loan.amount,
        Math.round((loan.remainingAmount + payment.amount) * 100) / 100,
      );
      let newStatus: LoanStatus = 'PARTIALLY_PAID';
      if (newRemaining >= loan.amount) {
        newStatus = 'PENDING';
      } else if (newRemaining <= 0.01) {
        newStatus = 'PAID';
      }

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          remainingAmount: newRemaining,
          status: newStatus,
        },
        include: {
          payments: {
            orderBy: { date: 'desc' },
          },
        },
      });

      return this.mapToEntity(updatedLoan);
    });
  }
}
