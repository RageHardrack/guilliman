import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import { UpdateTransactionDto } from '../dtos/update-transaction.dto';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva transacción o movimiento' })
  @ApiResponse({
    status: 201,
    description: 'Transacción registrada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos de transacción inválidos' })
  @ApiResponse({ status: 401, description: 'Falta el token de acceso' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateTransactionDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    const transaction = await this.transactionRepository.create({
      userId: user.userId,
      accountId: dto.accountId,
      destinationAccountId: dto.destinationAccountId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      destinationAmount: dto.destinationAmount,
      exchangeRate: dto.exchangeRate,
      type: dto.type,
      date: dto.date,
      note: dto.note,
      taxCategory: dto.taxCategory,
      taxDocumentType: dto.taxDocumentType,
      taxDocumentNumber: dto.taxDocumentNumber,
      taxWithholdingAmount: dto.taxWithholdingAmount,
      taxDeductionType: dto.taxDeductionType,
    });
    return transaction.toJSON();
  }

  @Get()
  @ApiOperation({
    summary: 'Listar las transacciones del usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Lista de transacciones' })
  @ApiResponse({ status: 401, description: 'Falta el token de acceso' })
  async findByUserId(@CurrentUser() user: { userId: string }) {
    // The userId query parameter is still accepted for compatibility but
    // ignored: only the token user's transactions are listed.
    const transactions = await this.transactionRepository.findByUserId(
      user.userId,
    );
    return transactions.map((t) => t.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una transacción por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la transacción' })
  @ApiResponse({ status: 404, description: 'Transacción no encontrada' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const transaction = await this.transactionRepository.findById(
      id,
      user.userId,
    );
    return transaction.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una transacción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Transacción actualizada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos de transacción inválidos' })
  @ApiResponse({ status: 404, description: 'Transacción no encontrada' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateTransactionDto,
  ) {
    const transaction = await this.transactionRepository.update(
      id,
      user.userId,
      {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    );
    return transaction.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una transacción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Transacción eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Transacción no encontrada' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.transactionRepository.delete(id, user.userId);
    return { success: true };
  }
}
