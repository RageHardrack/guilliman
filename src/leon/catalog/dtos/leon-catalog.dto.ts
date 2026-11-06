import { ApiProperty } from '@nestjs/swagger';

export class LeonCatalogFactionSummaryDto {
  @ApiProperty({
    example: 'SM',
    description: 'Faction id used by the roster editor',
  })
  id!: string;

  @ApiProperty({
    example: 'Space Marines (Adeptus Astartes)',
    description: 'Faction name',
  })
  name!: string;

  @ApiProperty({
    example: 120,
    description: 'Units available in this faction package',
  })
  units!: number;

  @ApiProperty({
    example: 8,
    description: 'Detachments available in this faction package',
  })
  detachments!: number;
}

export class LeonCatalogIndexDto {
  @ApiProperty({ example: 'wh40k-11e' })
  gameSystem!: string;

  @ApiProperty({ example: '11th' })
  edition!: string;

  @ApiProperty({
    example: '11.0.20261021',
    description: 'Version derived from the source stamp',
  })
  version!: string;

  @ApiProperty({
    example: '2026-10-21',
    description: 'Date the source data was last updated',
  })
  updatedDate!: string;

  @ApiProperty({ type: [LeonCatalogFactionSummaryDto] })
  factions!: LeonCatalogFactionSummaryDto[];
}

export class LeonCatalogImportBodyMetaDto {
  @ApiProperty({ example: 'wh40k-11e' })
  gameSystem!: string;

  @ApiProperty({ example: '11th' })
  edition!: string;

  @ApiProperty({ example: '11.0.20261021' })
  version!: string;

  @ApiProperty({ example: '2026-10-21' })
  updatedDate!: string;
}

export class LeonCatalogImportBodyFactionDto {
  @ApiProperty({ example: 'SM' })
  id!: string;

  @ApiProperty({ example: 'Space Marines (Adeptus Astartes)' })
  name!: string;

  @ApiProperty({
    description:
      'A full faction package: shared metadata, global stratagems and one faction',
    example: {
      gameSystem: 'wh40k-11e',
      factions: [{ id: 'SM', units: [], detachments: [] }],
    },
  })
  package!: Record<string, unknown>;
}

/**
 * Documentation-only shape of the import body: the runtime contract is enforced
 * by `parseCatalogImport`, because the project has no global validation pipe.
 */
export class LeonCatalogImportBodyDto {
  @ApiProperty({ type: LeonCatalogImportBodyMetaDto })
  meta!: LeonCatalogImportBodyMetaDto;

  @ApiProperty({ type: [LeonCatalogImportBodyFactionDto] })
  factions!: LeonCatalogImportBodyFactionDto[];
}

export class LeonCatalogImportResultDto {
  @ApiProperty({
    example: ['SM', 'ORK'],
    description: 'Faction ids written by this batch',
  })
  synced!: string[];

  @ApiProperty({ example: '11.0.20261021' })
  version!: string;
}
