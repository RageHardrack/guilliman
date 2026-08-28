import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Correo electrónico del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Contraseña del usuario',
  })
  password: string;

  @ApiPropertyOptional({
    example: 'Daniel Colmenares',
    description: 'Nombre completo',
  })
  name?: string;
}
