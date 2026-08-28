import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoanPaymentDto {
  @ApiProperty({ description: 'Monto del abono', example: 100.0 })
  amount!: number;

  @ApiPropertyOptional({ description: 'Fecha del abono' })
  date?: string;

  @ApiPropertyOptional({
    description: 'ID de la cuenta bancaria para conciliar el abono',
  })
  accountId?: string;

  @ApiPropertyOptional({ description: 'Notas del abono' })
  notes?: string;
}
