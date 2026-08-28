import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaxProfileDto {
  @ApiProperty({
    example: true,
    description: 'Activar o desactivar el módulo tributario para este usuario',
  })
  taxProfileEnabled: boolean;

  @ApiPropertyOptional({
    example: 'PE',
    description: 'Código de país del régimen tributario (por defecto PE)',
    default: 'PE',
  })
  taxCountry?: string;

  @ApiPropertyOptional({
    example: '15548932014',
    description: 'RUC de la persona natural (ej. RUC 10 o 15 para extranjeros)',
  })
  taxRuc?: string;
}
