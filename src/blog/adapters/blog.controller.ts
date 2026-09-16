import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BlogService } from '../application/blog.service';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los artículos del blog' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Código de idioma (ej. es, en)',
  })
  @ApiResponse({ status: 200, description: 'Lista de artículos' })
  async findAll(@Query('lang') lang?: string) {
    const posts = await this.blogService.findAll(lang);
    return { posts };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener artículo por slug' })
  @ApiResponse({ status: 200, description: 'Detalle del artículo' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }
}
