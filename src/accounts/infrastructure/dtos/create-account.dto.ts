import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { AccountType } from '../../domain/account.entity';

export class CreateAccountDto {
  @ApiProperty({
    example: 'd8c48a73-98fe-4a4b-97e3-059adfbff04a',
    description: 'ID del usuario propietario',
  })
  userId: string;

  @ApiProperty({
    example: 'Cuenta Principal',
    description: 'Nombre descriptivo de la cuenta',
  })
  name: string;

  @ApiProperty({
    enum: [
      'CHECKING',
      'SAVINGS',
      'CREDIT_CARD',
      'CASH',
      'INVESTMENT',
      'WALLET',
    ],
    example: 'CHECKING',
    description: 'Tipo de cuenta',
  })
  type: AccountType;

  @ApiPropertyOptional({
    example: 1500.5,
    description: 'Saldo inicial',
    default: 0,
  })
  balance?: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Moneda de la cuenta',
    default: 'USD',
  })
  currency?: string;
}
