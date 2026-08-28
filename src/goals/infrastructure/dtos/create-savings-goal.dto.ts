import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSavingsGoalDto {
  @ApiProperty({ description: 'Nombre de la meta de ahorro', example: 'Fondo de Emergencia' })
  name: string;

  @ApiProperty({ description: 'Monto objetivo a alcanzar', example: 5000.0 })
  targetAmount: number;

  @ApiPropertyOptional({ description: 'Monto inicial ahorrado', example: 500.0, default: 0.0 })
  currentAmount?: number;

  @ApiPropertyOptional({ description: 'Moneda de la meta', example: 'USD', default: 'USD' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Fecha límite estimada', example: '2026-12-31T00:00:00.000Z' })
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Color hexadecimal identificativo', example: '#10B981' })
  color?: string;

  @ApiPropertyOptional({ description: 'Icono representativo', example: 'i-heroicons-shield-check' })
  icon?: string;
}
