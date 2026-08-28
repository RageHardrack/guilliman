import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Correo electrónico',
  })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Contraseña',
  })
  password: string;
}
