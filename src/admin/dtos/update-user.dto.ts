import { ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '@prisma/client';

export class UpdateAdminUserDto {
  @ApiPropertyOptional({
    example: 'Carlos Colmenares',
    description: 'Nombre o alias del usuario',
  })
  name?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: 'ADMIN',
    description: 'Rol del usuario en el sistema',
  })
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado de habilitación de la cuenta (activo/inactivo)',
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Habilita el perfil tributario de SUNAT Perú',
  })
  taxProfileEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'PE',
    description: 'País del régimen tributario',
  })
  taxCountry?: string;

  @ApiPropertyOptional({
    example: '10456789012',
    description: 'Número de RUC o identificación tributaria',
  })
  taxRuc?: string;
}
