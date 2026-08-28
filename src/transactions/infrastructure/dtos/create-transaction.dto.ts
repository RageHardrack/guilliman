import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { TransactionType } from '../../domain/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'd8c48a73-98fe-4a4b-97e3-059adfbff04a',
    description: 'ID del usuario propietario',
  })
  userId: string;

  @ApiProperty({
    example: 'c1c48a73-98fe-4a4b-97e3-059adfbff02b',
    description: 'ID de la cuenta de origen',
  })
  accountId: string;

  @ApiPropertyOptional({
    example: 'e3c48a73-98fe-4a4b-97e3-059adfbff03c',
    description: 'ID de la cuenta destino (solo para transferencias)',
  })
  destinationAccountId?: string;

  @ApiPropertyOptional({
    example: 'f4c48a73-98fe-4a4b-97e3-059adfbff04d',
    description: 'ID de la categoría asociada',
  })
  categoryId?: string;

  @ApiProperty({
    example: 45.99,
    description: 'Monto de la transacción',
  })
  amount: number;

  @ApiProperty({
    enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
    example: 'EXPENSE',
    description: 'Tipo de movimiento (INCOME, EXPENSE, TRANSFER)',
  })
  type: TransactionType;

  @ApiPropertyOptional({
    example: '2026-08-23T14:30:00.000Z',
    description: 'Fecha del movimiento',
    default: 'Fecha actual',
  })
  date?: Date;

  @ApiPropertyOptional({
    example: 'Supermercado semanal',
    description: 'Nota descriptiva u observación',
  })
  note?: string;

  @ApiPropertyOptional({
    enum: ['NONE', 'FOURTH_CATEGORY_INCOME', 'FIFTH_CATEGORY_INCOME', 'DEDUCTIBLE_EXPENSE_3UIT'],
    example: 'FOURTH_CATEGORY_INCOME',
    description: 'Categoría tributaria (SUNAT)',
  })
  taxCategory?: 'NONE' | 'FOURTH_CATEGORY_INCOME' | 'FIFTH_CATEGORY_INCOME' | 'DEDUCTIBLE_EXPENSE_3UIT';

  @ApiPropertyOptional({
    enum: ['NONE', 'RXH', 'FACTURA', 'BOLETA', 'PAYROLL_SLIP', 'OTHER'],
    example: 'RXH',
    description: 'Tipo de comprobante tributario',
  })
  taxDocumentType?: 'NONE' | 'RXH' | 'FACTURA' | 'BOLETA' | 'PAYROLL_SLIP' | 'OTHER';

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
    enum: ['NONE', 'RESTAURANT_BAR', 'HOTEL', 'RENTAL', 'PROFESSIONAL_SERVICE', 'DOMESTIC_WORKER'],
    example: 'RESTAURANT_BAR',
    description: 'Tipo de deducción adicional 3 UIT',
  })
  taxDeductionType?: 'NONE' | 'RESTAURANT_BAR' | 'HOTEL' | 'RENTAL' | 'PROFESSIONAL_SERVICE' | 'DOMESTIC_WORKER';
}
