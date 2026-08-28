import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LinksService } from '../application/links.service';

@ApiTags('Links')
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de enlaces públicos' })
  @ApiResponse({ status: 200, description: 'Lista de enlaces' })
  async findAll() {
    return this.linksService.findAll();
  }
}
