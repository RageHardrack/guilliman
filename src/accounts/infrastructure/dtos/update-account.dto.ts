import { ApiPropertyOptional } from '@nestjs/swagger';

import type { AccountType } from '../../domain/account.entity';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    example: 'BCP Sueldo y Ahorros',
    description: 'Nombre de la cuenta',
  })
  name?: string;

  @ApiPropertyOptional({
    enum: [
      'CHECKING',
      'SAVINGS',
      'CREDIT_CARD',
      'CASH',
      'INVESTMENT',
      'WALLET',
    ],
    example: 'SAVINGS',
    description: 'Tipo de cuenta',
  })
  type?: AccountType;

  @ApiPropertyOptional({
    example: 2500.5,
    description: 'Saldo actual o ajustado',
  })
  balance?: number;

  @ApiPropertyOptional({
    example: 'PEN',
    description: 'Código ISO de la moneda',
  })
  currency?: string;
}
