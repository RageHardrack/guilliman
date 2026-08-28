import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '@prisma/client';

export class CreateAdminUserDto {
  @ApiProperty({
    example: 'familiar@lascar.dev',
    description: 'Correo electrónico único del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'ClaveSegura123!',
    description: 'Contraseña de acceso inicial (mínimo 6 caracteres)',
  })
  password: string;

  @ApiPropertyOptional({
    example: 'Carlos Colmenares',
    description: 'Nombre o alias del usuario',
  })
  name?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: 'USER',
    description: 'Rol del usuario en el sistema',
    default: 'USER',
  })
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado de habilitación de la cuenta',
    default: true,
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Habilita el perfil tributario de SUNAT Perú',
    default: false,
  })
  taxProfileEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'PE',
    description: 'País del régimen tributario',
    default: 'PE',
  })
  taxCountry?: string;

  @ApiPropertyOptional({
    example: '10456789012',
    description: 'Número de RUC o identificación tributaria',
  })
  taxRuc?: string;
}
