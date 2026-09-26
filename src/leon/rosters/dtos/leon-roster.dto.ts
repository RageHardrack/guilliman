import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeonRosterDto {
  @ApiProperty({ example: 'Strike Force Gladius', description: 'Roster name' })
  name!: string;

  @ApiPropertyOptional({ example: '40k-10e', default: '40k-10e', description: 'Game system' })
  gameSystem?: string;

  @ApiPropertyOptional({ example: 'Space Marines', description: 'Faction / Army' })
  faction?: string;

  @ApiPropertyOptional({ example: 'Gladius Task Force', description: 'Detachment name' })
  detachment?: string;

  @ApiPropertyOptional({ example: 2000, default: 2000, description: 'Points limit' })
  pointsLimit?: number;

  @ApiPropertyOptional({ example: 1995, default: 0, description: 'Total points calculated' })
  pointsTotal?: number;

  @ApiPropertyOptional({
    example: { units: [{ name: 'Captain in Terminator Armour', points: 95 }] },
    description: 'Dynamic JSON content of the roster',
  })
  content?: Record<string, any>;
}

export class UpdateLeonRosterDto {
  @ApiPropertyOptional({ example: 'Updated Strike Force Gladius', description: 'Roster name' })
  name?: string;

  @ApiPropertyOptional({ example: 'Space Marines', description: 'Faction / Army' })
  faction?: string;

  @ApiPropertyOptional({ example: 'Ironstorm Spearhead', description: 'Detachment name' })
  detachment?: string;

  @ApiPropertyOptional({ example: 2000, description: 'Points limit' })
  pointsLimit?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Total points calculated' })
  pointsTotal?: number;

  @ApiPropertyOptional({
    example: { units: [] },
    description: 'Dynamic JSON content of the roster',
  })
  content?: Record<string, any>;
}
