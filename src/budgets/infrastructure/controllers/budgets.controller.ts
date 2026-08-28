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

import { CreateBudgetDto } from '../dtos/create-budget.dto';
import { BudgetRepositoryPort } from '../../application/ports/budget.repository.port';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetRepository: BudgetRepositoryPort) {}

  @Post()
  @ApiOperation({
    summary: 'Crear o actualizar un presupuesto mensual por categoría',
  })
  @ApiResponse({
    status: 201,
    description: 'Presupuesto configurado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos de presupuesto inválidos' })
  async create(@Body() dto: CreateBudgetDto) {
    const budget = await this.budgetRepository.create(dto);
    return budget.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar presupuestos por ID de usuario' })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID del usuario propietario de los presupuestos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de presupuestos configurados',
  })
  async findByUserId(@Query('userId') userId: string) {
    if (!userId) {
      return [];
    }
    const budgets = await this.budgetRepository.findByUserId(userId);
    return budgets.map((b) => b.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un presupuesto por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del presupuesto' })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  async findById(@Param('id') id: string) {
    const budget = await this.budgetRepository.findById(id);
    return budget ? budget.toJSON() : null;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un presupuesto por ID' })
  @ApiResponse({ status: 200, description: 'Presupuesto actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      amount?: number;
      currency?: string;
      period?: string;
    },
  ) {
    const budget = await this.budgetRepository.update(id, dto);
    return budget.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un presupuesto por ID' })
  @ApiResponse({
    status: 200,
    description: 'Presupuesto eliminado exitosamente',
  })
  async delete(@Param('id') id: string) {
    const success = await this.budgetRepository.delete(id);
    return { success };
  }
}
