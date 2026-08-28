import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AboutService } from '../application/about.service';

@ApiTags('About')
@Controller('about-me')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener información sobre mí' })
  @ApiResponse({ status: 200, description: 'Contenido del perfil' })
  async getAboutContent() {
    return this.aboutService.getAboutContent();
  }
}
