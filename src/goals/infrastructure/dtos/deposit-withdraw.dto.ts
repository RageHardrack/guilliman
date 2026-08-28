import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepositWithdrawDto {
  @ApiProperty({ description: 'Monto a transferir', example: 100.0 })
  amount: number;

  @ApiPropertyOptional({ description: 'ID de la cuenta bancaria origen/destino', example: 'acc-uuid-1234' })
  accountId?: string;
}
