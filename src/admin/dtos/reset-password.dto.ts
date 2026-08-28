import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'NuevaClaveSegura123!',
    description: 'Nueva contraseña para el usuario',
  })
  password: string;
}
