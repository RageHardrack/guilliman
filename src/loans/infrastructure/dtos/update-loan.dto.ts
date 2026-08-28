import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLoanDto {
  @ApiPropertyOptional({ description: 'Nombre de la persona o contacto' })
  personName?: string;

  @ApiPropertyOptional({ description: 'Monto total pactado' })
  amount?: number;

  @ApiPropertyOptional({ description: 'Moneda del préstamo' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Estado del préstamo',
    enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
  })
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

  @ApiPropertyOptional({ description: 'Notas' })
  notes?: string;
}
