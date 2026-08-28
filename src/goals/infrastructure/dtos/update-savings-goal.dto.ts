import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSavingsGoalDto {
  @ApiPropertyOptional({ description: 'Nombre de la meta de ahorro' })
  name?: string;

  @ApiPropertyOptional({ description: 'Monto objetivo a alcanzar' })
  targetAmount?: number;

  @ApiPropertyOptional({ description: 'Monto actual ahorrado' })
  currentAmount?: number;

  @ApiPropertyOptional({ description: 'Moneda de la meta' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Fecha límite estimada' })
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Color hexadecimal identificativo' })
  color?: string;

  @ApiPropertyOptional({ description: 'Icono representativo' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Indica si la meta se ha completado' })
  isCompleted?: boolean;
}
