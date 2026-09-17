import { ApiPropertyOptional } from '@nestjs/swagger';

export class RecordSubscriptionPaymentDto {
  @ApiPropertyOptional({
    description: 'Fecha efectiva en que se realizó el pago',
    example: '2026-09-17T12:00:00.000Z',
  })
  paymentDate?: string;

  @ApiPropertyOptional({
    description: 'Monto real debitado de la cuenta en la moneda de dicha cuenta',
    example: 39.0,
  })
  debitedAmount?: number;

  @ApiPropertyOptional({
    description: 'Tasa de cambio implícita o aplicada para el pago',
    example: 3.25,
  })
  exchangeRate?: number;

  @ApiPropertyOptional({
    description: 'Monto nominal original de la suscripción',
    example: 12.0,
  })
  destinationAmount?: number;

  @ApiPropertyOptional({
    description:
      'Cuenta desde la cual se efectuó el débito (si difiere de la cuenta predeterminada)',
    example: 'acc-uuid-123',
  })
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Nota o descripción personalizada del movimiento',
    example: 'Pago recurrente: Netflix ($12.00 USD @ 3.25)',
  })
  note?: string;
}
