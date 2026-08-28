import { ApiPropertyOptional } from '@nestjs/swagger';

import type { TransactionType } from '../../domain/transaction.entity';

export class UpdateTransactionDto {
  @ApiPropertyOptional({
    example: 'acc-uuid',
    description: 'ID de la cuenta de origen',
  })
  accountId?: string;

  @ApiPropertyOptional({
    example: 'acc-dest-uuid',
    description: 'ID de la cuenta de destino (para transferencias)',
  })
  destinationAccountId?: string;

  @ApiPropertyOptional({
    example: 'cat-uuid',
    description: 'ID de la categoría asociada',
  })
  categoryId?: string;

  @ApiPropertyOptional({
    example: 75.5,
    description: 'Monto de la transacción',
  })
  amount?: number;

  @ApiPropertyOptional({
    enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
    example: 'EXPENSE',
    description: 'Tipo de transacción',
  })
  type?: TransactionType;

  @ApiPropertyOptional({
    example: '2026-08-24T12:00:00.000Z',
    description: 'Fecha de la transacción',
  })
  date?: Date;

  @ApiPropertyOptional({
    example: 'Compra de víveres',
    description: 'Nota o descripción de la transacción',
  })
  note?: string;

  @ApiPropertyOptional({
    enum: [
      'NONE',
      'FOURTH_CATEGORY_INCOME',
      'FIFTH_CATEGORY_INCOME',
      'DEDUCTIBLE_EXPENSE_3UIT',
    ],
    example: 'FOURTH_CATEGORY_INCOME',
    description: 'Categoría tributaria (SUNAT)',
  })
  taxCategory?:
    | 'NONE'
    | 'FOURTH_CATEGORY_INCOME'
    | 'FIFTH_CATEGORY_INCOME'
    | 'DEDUCTIBLE_EXPENSE_3UIT';

  @ApiPropertyOptional({
    enum: ['NONE', 'RXH', 'FACTURA', 'BOLETA', 'PAYROLL_SLIP', 'OTHER'],
    example: 'RXH',
    description: 'Tipo de comprobante tributario',
  })
  taxDocumentType?:
    'NONE' | 'RXH' | 'FACTURA' | 'BOLETA' | 'PAYROLL_SLIP' | 'OTHER';

  @ApiPropertyOptional({
    example: 'E001-45',
    description: 'Número de comprobante tributario o recibo',
  })
  taxDocumentNumber?: string;

  @ApiPropertyOptional({
    example: 240.0,
    description: 'Monto retenido en la fuente (ej: 8% 4ta categoría)',
  })
  taxWithholdingAmount?: number;

  @ApiPropertyOptional({
    enum: [
      'NONE',
      'RESTAURANT_BAR',
      'HOTEL',
      'RENTAL',
      'PROFESSIONAL_SERVICE',
      'DOMESTIC_WORKER',
    ],
    example: 'RESTAURANT_BAR',
    description: 'Tipo de deducción adicional 3 UIT',
  })
  taxDeductionType?:
    | 'NONE'
    | 'RESTAURANT_BAR'
    | 'HOTEL'
    | 'RENTAL'
    | 'PROFESSIONAL_SERVICE'
    | 'DOMESTIC_WORKER';
}
