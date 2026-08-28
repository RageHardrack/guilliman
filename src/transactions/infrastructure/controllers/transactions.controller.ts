import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import { UpdateTransactionDto } from '../dtos/update-transaction.dto';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';

@ApiTags('Transactions')
@ApiBearerAuth()
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
  async create(@Body() dto: CreateTransactionDto) {
    const transaction = await this.transactionRepository.create(dto);
    return transaction.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar transacciones por ID de usuario' })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID del usuario propietario',
  })
  @ApiResponse({ status: 200, description: 'Lista de transacciones' })
  async findByUserId(@Query('userId') userId: string) {
    if (!userId) {
      return [];
    }
    const transactions = await this.transactionRepository.findByUserId(userId);
    return transactions.map((t) => t.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una transacción por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la transacción' })
  @ApiResponse({ status: 404, description: 'Transacción no encontrada' })
  async findById(@Param('id') id: string) {
    const transaction = await this.transactionRepository.findById(id);
    return transaction ? transaction.toJSON() : null;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una transacción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Transacción actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Transacción no encontrada' })
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    const transaction = await this.transactionRepository.update(id, {
      ...dto,
      date: dto.date ? new Date(dto.date) : undefined,
    });
    return transaction.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una transacción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Transacción eliminada exitosamente',
  })
  async delete(@Param('id') id: string) {
    const success = await this.transactionRepository.delete(id);
    return { success };
  }
}
