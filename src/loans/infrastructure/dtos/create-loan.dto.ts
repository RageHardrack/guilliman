import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoanDto {
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Ignorado: el propietario siempre es el usuario del token. Se acepta solo por compatibilidad.',
  })
  userId?: string;

  @ApiProperty({
    description: 'Nombre de la persona o contacto',
    example: 'Carlos Gomez',
  })
  personName!: string;

  @ApiProperty({
    description: 'Tipo de préstamo: LENT (presté) | BORROWED (me prestaron)',
    enum: ['LENT', 'BORROWED'],
  })
  type!: 'LENT' | 'BORROWED';

  @ApiProperty({ description: 'Monto total pactado', example: 500.0 })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Moneda del préstamo',
    example: 'USD',
    default: 'USD',
  })
  currency?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento pactada' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Notas o comentarios' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Cuenta bancaria para impactar el saldo inicial',
  })
  initialAccountId?: string;
}
