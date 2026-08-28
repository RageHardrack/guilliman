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

import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { SubscriptionRepositoryPort } from '../../application/ports/subscription.repository.port';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una nueva suscripción o pago recurrente',
  })
  @ApiResponse({
    status: 201,
    description: 'Suscripción registrada exitosamente',
  })
  async create(@Body() dto: CreateSubscriptionDto) {
    const sub = await this.subscriptionRepository.create({
      ...dto,
      nextDueDate: new Date(dto.nextDueDate),
    });
    return sub.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar suscripciones por ID de usuario' })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID del usuario propietario de las suscripciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de suscripciones ordenadas por fecha de vencimiento',
  })
  async findByUserId(@Query('userId') userId: string) {
    if (!userId) {
      return [];
    }
    const subs = await this.subscriptionRepository.findByUserId(userId);
    return subs.map((s) => s.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una suscripción por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la suscripción' })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async findById(@Param('id') id: string) {
    const sub = await this.subscriptionRepository.findById(id);
    return sub ? sub.toJSON() : null;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una suscripción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      accountId?: string;
      categoryId?: string | null;
      name?: string;
      amount?: number;
      currency?: string;
      frequency?: any;
      nextDueDate?: string;
      isActive?: boolean;
    },
  ) {
    const sub = await this.subscriptionRepository.update(id, {
      ...dto,
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
    });
    return sub.toJSON();
  }

  @Post(':id/pay')
  @ApiOperation({
    summary:
      'Registrar el pago de la suscripción (crea transacción, debita saldo y avanza fecha)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pago registrado y suscripción actualizada',
  })
  async pay(@Param('id') id: string) {
    const result = await this.subscriptionRepository.recordPayment(id);
    return {
      transactionId: result.transactionId,
      subscription: result.subscription.toJSON(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una suscripción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción eliminada exitosamente',
  })
  async delete(@Param('id') id: string) {
    const success = await this.subscriptionRepository.delete(id);
    return { success };
  }
}
