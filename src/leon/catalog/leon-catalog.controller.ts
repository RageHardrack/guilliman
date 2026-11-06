import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { LeonRole } from '@prisma/client';

import { LeonRoles } from '../guards/leon-roles.decorator';
import { LeonRolesGuard } from '../guards/leon-roles.guard';
import { LeonCatalogService } from './leon-catalog.service';
import { LeonJwtAuthGuard } from '../guards/leon-jwt-auth.guard';
import {
  LeonCatalogImportBodyDto,
  LeonCatalogImportResultDto,
  LeonCatalogIndexDto,
} from './dtos/leon-catalog.dto';

/**
 * Serves the 11th edition catalog stored in the database.
 *
 * Reads are open to any authenticated Leon user; writing is restricted to
 * administrators, because an import replaces the data every client consumes.
 */
@ApiTags('Leon Catalog')
@ApiBearerAuth()
@UseGuards(LeonJwtAuthGuard)
@Controller('leon/catalog')
export class LeonCatalogController {
  constructor(private readonly catalogService: LeonCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Read the catalog index (version, freshness and factions)',
  })
  @ApiOkResponse({ type: LeonCatalogIndexDto })
  async getIndex(): Promise<LeonCatalogIndexDto> {
    return this.catalogService.getIndex();
  }

  @Get('factions/:id')
  @ApiOperation({ summary: 'Read the package of one faction' })
  @ApiParam({
    name: 'id',
    example: 'SM',
    description: 'Faction id from the catalog index',
  })
  async getFaction(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.catalogService.getFaction(id);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Import or refresh a batch of faction packages (admin only)',
  })
  @ApiBody({ type: LeonCatalogImportBodyDto })
  @ApiOkResponse({ type: LeonCatalogImportResultDto })
  @UseGuards(LeonRolesGuard)
  @LeonRoles(LeonRole.ADMIN)
  async importCatalog(
    @Body() body: unknown,
  ): Promise<LeonCatalogImportResultDto> {
    return this.catalogService.importCatalog(body);
  }
}
