import { ApiProperty } from '@nestjs/swagger';

export class LeonLoginDto {
  @ApiProperty({
    example: 'player@example.com',
    description: 'Leon user email',
  })
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Leon user password',
  })
  password!: string;
}
