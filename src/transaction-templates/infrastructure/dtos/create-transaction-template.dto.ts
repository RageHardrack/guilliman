import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionTemplateDto {
  @ApiProperty({
    description: 'Nombre de la plantilla (obligatorio, no vacío)',
    example: 'Transporte público',
  })
  name: string;

  @ApiProperty({
    enum: ['EXPENSE', 'INCOME', 'TRANSFER'],
    description: 'Tipo de movimiento de la plantilla',
    example: 'EXPENSE',
  })
  type: string;

  @ApiProperty({
    description: 'ID de la cuenta origen (debe pertenecer al usuario)',
    example: 'c1c48a73-98fe-4a4b-97e3-059adfbff02b',
  })
  accountId: string;

  @ApiPropertyOptional({
    description:
      'ID de la cuenta destino (obligatorio y distinto del origen solo para TRANSFER)',
    example: 'e3c48a73-98fe-4a4b-97e3-059adfbff03c',
  })
  destinationAccountId?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría asociada (opcional, del usuario)',
    example: 'f4c48a73-98fe-4a4b-97e3-059adfbff04d',
  })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Monto por defecto; si se envía debe ser un número mayor a 0',
    example: 3,
  })
  defaultAmount?: number;

  @ApiPropertyOptional({
    description: 'Nota precargada al usar la plantilla',
    example: 'Metro diario',
  })
  note?: string;
}
