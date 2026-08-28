import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'ID del usuario propietario del presupuesto',
    example: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0',
  })
  userId!: string;

  @ApiProperty({
    description: 'ID de la categoría a la que aplica el presupuesto',
    example: 'cat-uuid-123',
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Límite máximo de gasto asignado al presupuesto',
    example: 450.0,
  })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Moneda del presupuesto (ej. USD, PEN, VES)',
    example: 'PEN',
    default: 'USD',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Periodo de vigencia del presupuesto (ej. MONTHLY)',
    example: 'MONTHLY',
    default: 'MONTHLY',
  })
  period?: string;
}
