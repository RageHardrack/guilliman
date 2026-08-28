import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BlogService } from '../application/blog.service';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los artículos del blog' })
  @ApiResponse({ status: 200, description: 'Lista de artículos' })
  async findAll() {
    const posts = await this.blogService.findAll();
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
