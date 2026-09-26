import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeonRole } from '@prisma/client';

export class CreateLeonUserDto {
  @ApiProperty({ example: 'player@example.com', description: 'Leon user email' })
  email!: string;

  @ApiProperty({ example: 'password123', description: 'Leon user password' })
  password!: string;

  @ApiPropertyOptional({ example: 'Brother Corvus', description: 'Leon user name' })
  name?: string;

  @ApiPropertyOptional({ enum: LeonRole, default: LeonRole.USER, description: 'Role' })
  role?: LeonRole;
}

export class UpdateLeonUserDto {
  @ApiPropertyOptional({ example: 'Brother Corvus Updated', description: 'Leon user name' })
  name?: string;

  @ApiPropertyOptional({ enum: LeonRole, description: 'Role' })
  role?: LeonRole;

  @ApiPropertyOptional({ example: true, description: 'Account status' })
  isActive?: boolean;
}

export class ResetLeonPasswordDto {
  @ApiProperty({ example: 'newPassword123!', description: 'New password to set for the user' })
  newPassword!: string;
}
