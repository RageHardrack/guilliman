import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateLoanDto } from '../dtos/create-loan.dto';
import { UpdateLoanDto } from '../dtos/update-loan.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { CreateLoanPaymentDto } from '../dtos/create-loan-payment.dto';
import { LoanRepositoryPort } from '../../application/ports/loan.repository.port';

@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loanRepository: LoanRepositoryPort) {}

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateLoanDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    return await this.loanRepository.create(user.userId, dto);
  }

  @Get('user/:userId')
  async findByUserId(
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
  ) {
    // The route :userId is kept for compatibility; it may only ever point at
    // the token user, otherwise the request is refused with 403.
    this.assertRouteUser(user, userId);
    return await this.loanRepository.findByUserId(user.userId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return await this.loanRepository.findById(id, user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateLoanDto,
  ) {
    return await this.loanRepository.update(id, user.userId, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.loanRepository.delete(id, user.userId);
    return { success: true };
  }

  @Post(':id/payments')
  async addPayment(
    @Param('id') loanId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateLoanPaymentDto,
  ) {
    return await this.loanRepository.addPayment(loanId, user.userId, dto);
  }

  @Delete('payments/:paymentId')
  async deletePayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return await this.loanRepository.deletePayment(paymentId, user.userId);
  }

  private assertRouteUser(user: { userId: string }, userId: string): void {
    if (userId !== user.userId) {
      throw new ForbiddenException(
        'The userId in the route does not match the authenticated user',
      );
    }
  }
}
