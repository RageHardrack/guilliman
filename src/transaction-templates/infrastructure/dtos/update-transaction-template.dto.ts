import { ApiProperty } from '@nestjs/swagger';

import { CreateTransactionTemplateDto } from './create-transaction-template.dto';

/**
 * PUT carries the full create body again; no partial updates.
 */
export class UpdateTransactionTemplateDto extends CreateTransactionTemplateDto {
  @ApiProperty({
    description: 'Nombre de la plantilla (obligatorio, no vacío)',
    example: 'Transporte público',
  })
  declare name: string;

  @ApiProperty({
    enum: ['EXPENSE', 'INCOME', 'TRANSFER'],
    description: 'Tipo de movimiento de la plantilla',
    example: 'EXPENSE',
  })
  declare type: string;

  @ApiProperty({
    description: 'ID de la cuenta origen (debe pertenecer al usuario)',
    example: 'c1c48a73-98fe-4a4b-97e3-059adfbff02b',
  })
  declare accountId: string;
}
