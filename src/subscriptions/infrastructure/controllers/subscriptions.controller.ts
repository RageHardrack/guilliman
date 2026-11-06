import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { RecurrenceFrequency } from '../../domain/subscription.entity';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { RecordSubscriptionPaymentDto } from '../dtos/record-subscription-payment.dto';
import { SubscriptionRepositoryPort } from '../../application/ports/subscription.repository.port';

interface UpdateSubscriptionBody {
  accountId?: string;
  categoryId?: string | null;
  name?: string;
  amount?: number;
  currency?: string;
  frequency?: RecurrenceFrequency;
  customIntervalDays?: number | null;
  nextDueDate?: string;
  isActive?: boolean;
}

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiResponse({ status: 400, description: 'Referencias inválidas' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSubscriptionDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    const sub = await this.subscriptionRepository.create({
      userId: user.userId,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      name: dto.name,
      amount: dto.amount,
      currency: dto.currency,
      frequency: dto.frequency,
      customIntervalDays: dto.customIntervalDays,
      nextDueDate: new Date(dto.nextDueDate),
    });
    return sub.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar las suscripciones del usuario' })
  @ApiQuery({
    name: 'userId',
    required: false,
    deprecated: true,
    description:
      'Ignorado: el propietario de la lista sale siempre del token JWT',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de suscripciones ordenadas por fecha de vencimiento',
  })
  async findByUserId(
    @CurrentUser() user: { userId: string },
    @Query('userId') _userId?: string,
  ) {
    // The query userId is accepted for backwards compatibility but ignored.
    const subs = await this.subscriptionRepository.findByUserId(user.userId);
    return subs.map((s) => s.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una suscripción por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la suscripción' })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const sub = await this.subscriptionRepository.findById(id, user.userId);
    return sub.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una suscripción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción actualizada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Referencias inválidas' })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body()
    dto: UpdateSubscriptionBody,
  ) {
    const sub = await this.subscriptionRepository.update(id, user.userId, {
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
  @ApiResponse({
    status: 400,
    description: 'La cuenta indicada no es del usuario',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async pay(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto?: RecordSubscriptionPaymentDto,
  ) {
    const result = await this.subscriptionRepository.recordPayment(
      id,
      user.userId,
      {
        paymentDate: dto?.paymentDate ? new Date(dto.paymentDate) : undefined,
        debitedAmount: dto?.debitedAmount,
        exchangeRate: dto?.exchangeRate,
        destinationAmount: dto?.destinationAmount,
        accountId: dto?.accountId,
        note: dto?.note,
      },
    );
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
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.subscriptionRepository.delete(id, user.userId);
    return { success: true };
  }
}
