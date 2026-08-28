import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReconcileAccountDto {
  @ApiProperty({
    example: 1850.75,
    description: 'Saldo real verificado en el banco / billetera',
  })
  realBalance: number;

  @ApiPropertyOptional({
    example: 'Ajuste por cobro de comisiones bancarias',
    description: 'Nota explicativa del ajuste',
  })
  note?: string;
}
