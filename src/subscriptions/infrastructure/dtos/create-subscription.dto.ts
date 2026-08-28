import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { RecurrenceFrequency } from '../../domain/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'ID del usuario propietario de la suscripción',
    example: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0',
  })
  userId!: string;

  @ApiProperty({
    description: 'ID de la cuenta bancaria donde se debita la suscripción',
    example: 'acc-uuid-123',
  })
  accountId!: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría asociada al gasto recurrente',
    example: 'cat-uuid-456',
  })
  categoryId?: string;

  @ApiProperty({
    description: 'Nombre del servicio o pago recurrente',
    example: 'Netflix 4K',
  })
  name!: string;

  @ApiProperty({
    description: 'Monto recurrente a pagar',
    example: 15.99,
  })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Moneda de la suscripción',
    example: 'USD',
    default: 'USD',
  })
  currency?: string;

  @ApiPropertyOptional({
    enum: [
      'WEEKLY',
      'BIWEEKLY',
      'MONTHLY',
      'BIMONTHLY',
      'QUARTERLY',
      'SEMIANNUAL',
      'YEARLY',
      'CUSTOM',
    ],
    description: 'Frecuencia de cobro recurrente',
    example: 'MONTHLY',
    default: 'MONTHLY',
  })
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({
    description: 'Días de intervalo para frecuencia personalizada (CUSTOM)',
    example: 45,
  })
  customIntervalDays?: number;

  @ApiProperty({
    description: 'Próxima fecha límite o día de cobro de la suscripción',
    example: '2026-09-01T00:00:00.000Z',
  })
  nextDueDate!: string;
}
