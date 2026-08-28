import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { LoanRepositoryPort } from '../../application/ports/loan.repository.port';
import { CreateLoanDto } from '../dtos/create-loan.dto';
import { CreateLoanPaymentDto } from '../dtos/create-loan-payment.dto';
import { UpdateLoanDto } from '../dtos/update-loan.dto';

@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loanRepository: LoanRepositoryPort) {}

  @Post()
  async create(@Body() dto: CreateLoanDto) {
    return await this.loanRepository.create(dto);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return await this.loanRepository.findByUserId(userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.loanRepository.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return await this.loanRepository.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.loanRepository.delete(id);
    return { success: true };
  }

  @Post(':id/payments')
  async addPayment(@Param('id') loanId: string, @Body() dto: CreateLoanPaymentDto) {
    return await this.loanRepository.addPayment(loanId, dto);
  }

  @Delete('payments/:paymentId')
  async deletePayment(@Param('paymentId') paymentId: string) {
    return await this.loanRepository.deletePayment(paymentId);
  }
}
