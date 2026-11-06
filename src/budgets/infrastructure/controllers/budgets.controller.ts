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
import { CreateBudgetDto } from '../dtos/create-budget.dto';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { BudgetRepositoryPort } from '../../application/ports/budget.repository.port';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateBudgetDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    const budget = await this.budgetRepository.create({
      userId: user.userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      currency: dto.currency,
      period: dto.period,
    });
    return budget.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar los presupuestos del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de presupuestos configurados',
  })
  async findByUserId(@CurrentUser() user: { userId: string }) {
    const budgets = await this.budgetRepository.findByUserId(user.userId);
    return budgets.map((b) => b.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un presupuesto por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del presupuesto' })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const budget = await this.budgetRepository.findById(id, user.userId);
    return budget.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un presupuesto por ID' })
  @ApiResponse({
    status: 200,
    description: 'Presupuesto actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body()
    dto: {
      amount?: number;
      currency?: string;
      period?: string;
    },
  ) {
    const budget = await this.budgetRepository.update(id, user.userId, {
      amount: dto.amount,
      currency: dto.currency,
      period: dto.period,
    });
    return budget.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un presupuesto por ID' })
  @ApiResponse({
    status: 200,
    description: 'Presupuesto eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.budgetRepository.delete(id, user.userId);
    return { success: true };
  }
}
