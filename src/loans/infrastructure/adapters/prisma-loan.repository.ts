import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

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

@Injectable()
export class PrismaLoanRepository implements LoanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapPaymentToEntity(p: any): LoanPayment {
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

  private mapToEntity(record: any): Loan {
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
        ? record.payments.map((p: any) => this.mapPaymentToEntity(p))
        : [],
    );
  }

  async create(dto: CreateLoanDto): Promise<Loan> {
    return await this.prisma.$transaction(async (tx: any) => {
      const initialRemaining = dto.amount;
      const loanRecord = await tx.loan.create({
        data: {
          userId: dto.userId,
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
      if (dto.initialAccountId) {
        const account = await tx.account.findUnique({
          where: { id: dto.initialAccountId },
        });

        if (account) {
          if (dto.type === 'LENT') {
            // Presté dinero -> Sale dinero de mi cuenta
            await tx.account.update({
              where: { id: account.id },
              data: { balance: account.balance - dto.amount },
            });
            await tx.transaction.create({
              data: {
                userId: dto.userId,
                accountId: account.id,
                amount: dto.amount,
                type: 'EXPENSE',
                date: new Date(),
                note: `Préstamo otorgado a ${dto.personName}`,
              },
            });
          } else {
            // Me prestaron dinero -> Entra dinero a mi cuenta
            await tx.account.update({
              where: { id: account.id },
              data: { balance: account.balance + dto.amount },
            });
            await tx.transaction.create({
              data: {
                userId: dto.userId,
                accountId: account.id,
                amount: dto.amount,
                type: 'INCOME',
                date: new Date(),
                note: `Préstamo recibido de ${dto.personName}`,
              },
            });
          }
        }
      }

      return this.mapToEntity(loanRecord);
    });
  }

  async findById(id: string): Promise<Loan | null> {
    const record = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!record) return null;
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

    return records.map((r: any) => this.mapToEntity(r));
  }

  async update(id: string, dto: UpdateLoanDto): Promise<Loan> {
    const existing = await this.prisma.loan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    const dataToUpdate: any = {};
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

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.loan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    await this.prisma.loan.delete({ where: { id } });
  }

  async addPayment(
    loanId: string,
    dto: CreateLoanPaymentDto,
  ): Promise<{ loan: Loan; payment: LoanPayment }> {
    return await this.prisma.$transaction(async (tx: any) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { payments: true },
      });

      if (!loan) {
        throw new NotFoundException(`Loan with id ${loanId} not found`);
      }

      if (dto.amount <= 0) {
        throw new BadRequestException(
          'Payment amount must be greater than zero',
        );
      }

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
      if (dto.accountId) {
        const account = await tx.account.findUnique({
          where: { id: dto.accountId },
        });

        if (account) {
          if (loan.type === 'LENT') {
            // Me abonaron dinero que presté -> Entra dinero a mi cuenta
            await tx.account.update({
              where: { id: account.id },
              data: { balance: account.balance + dto.amount },
            });
            await tx.transaction.create({
              data: {
                userId: loan.userId,
                accountId: account.id,
                amount: dto.amount,
                type: 'INCOME',
                date: paymentDate,
                note: `Abono recibido de préstamo a ${loan.personName}`,
              },
            });
          } else {
            // Yo aboné dinero a mi deuda -> Sale dinero de mi cuenta
            await tx.account.update({
              where: { id: account.id },
              data: { balance: account.balance - dto.amount },
            });
            await tx.transaction.create({
              data: {
                userId: loan.userId,
                accountId: account.id,
                amount: dto.amount,
                type: 'EXPENSE',
                date: paymentDate,
                note: `Pago de préstamo a ${loan.personName}`,
              },
            });
          }
        }
      }

      return {
        loan: this.mapToEntity(updatedLoanRecord),
        payment: this.mapPaymentToEntity(paymentRecord),
      };
    });
  }

  async deletePayment(paymentId: string): Promise<Loan> {
    return await this.prisma.$transaction(async (tx: any) => {
      const payment = await tx.loanPayment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException(
          `Loan payment with id ${paymentId} not found`,
        );
      }

      const loan = await tx.loan.findUnique({
        where: { id: payment.loanId },
        include: { payments: true },
      });

      if (!loan) {
        throw new NotFoundException(`Associated loan not found`);
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
