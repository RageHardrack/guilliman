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
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { DepositWithdrawDto } from '../dtos/deposit-withdraw.dto';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { CreateSavingsGoalDto } from '../dtos/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from '../dtos/update-savings-goal.dto';
import type { SavingsGoalRepositoryPort } from '../../application/ports/savings-goal.repository.port';

@ApiTags('SavingsGoals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(
    @Inject('SAVINGS_GOAL_REPOSITORY_PORT')
    private readonly repository: SavingsGoalRepositoryPort,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva meta de ahorro' })
  @ApiResponse({ status: 201, description: 'Meta de ahorro creada con éxito' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSavingsGoalDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    return this.repository.create({
      userId: user.userId,
      name: dto.name,
      targetAmount: dto.targetAmount,
      currentAmount: dto.currentAmount,
      currency: dto.currency,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      color: dto.color,
      icon: dto.icon,
      priority: dto.priority,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las metas de ahorro del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de metas de ahorro' })
  async findAll(@CurrentUser() user: { userId: string }) {
    return this.repository.findAllByUserId(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una meta de ahorro por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la meta de ahorro' })
  @ApiResponse({ status: 404, description: 'Meta no encontrada' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repository.findById(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una meta de ahorro existente' })
  @ApiResponse({ status: 200, description: 'Meta actualizada con éxito' })
  @ApiResponse({ status: 404, description: 'Meta no encontrada' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    // Only the documented fields are forwarded, so a userId coming from the
    // body can never repoint the goal at another user.
    return this.repository.update(id, user.userId, {
      name: dto.name,
      targetAmount: dto.targetAmount,
      currentAmount: dto.currentAmount,
      currency: dto.currency,
      // null clears the date; an absent field leaves it as it is.
      targetDate:
        dto.targetDate === null
          ? null
          : dto.targetDate
            ? new Date(dto.targetDate)
            : undefined,
      color: dto.color,
      icon: dto.icon,
      priority: dto.priority,
      isCompleted: dto.isCompleted,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una meta de ahorro' })
  @ApiResponse({ status: 200, description: 'Meta eliminada con éxito' })
  @ApiResponse({ status: 404, description: 'Meta no encontrada' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.repository.delete(id, user.userId);
    return { success: true };
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Abonar fondos a una meta de ahorro' })
  @ApiResponse({ status: 200, description: 'Abono realizado con éxito' })
  @ApiResponse({
    status: 400,
    description: 'La cuenta no pertenece al usuario',
  })
  @ApiResponse({ status: 404, description: 'Meta no encontrada' })
  async deposit(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: DepositWithdrawDto,
  ) {
    return this.repository.deposit(id, user.userId, dto.amount, dto.accountId);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Retirar fondos de una meta de ahorro' })
  @ApiResponse({ status: 200, description: 'Retiro realizado con éxito' })
  @ApiResponse({
    status: 400,
    description: 'La cuenta no pertenece al usuario',
  })
  @ApiResponse({ status: 404, description: 'Meta no encontrada' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: DepositWithdrawDto,
  ) {
    return this.repository.withdraw(id, user.userId, dto.amount, dto.accountId);
  }
}
