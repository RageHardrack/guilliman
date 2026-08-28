import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { CategoryRepositoryPort } from '../../application/ports/category.repository.port';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryRepository: CategoryRepositoryPort) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva categoría de transacción' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de categoría inválidos' })
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoryRepository.create(dto);
    return category.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorías por ID de usuario' })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID del usuario propietario',
  })
  @ApiResponse({ status: 200, description: 'Lista de categorías del usuario' })
  async findByUserId(@Query('userId') userId: string) {
    if (!userId) {
      return [];
    }
    const categories = await this.categoryRepository.findByUserId(userId);
    return categories.map((cat) => cat.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una categoría por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la categoría' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findById(@Param('id') id: string) {
    const category = await this.categoryRepository.findById(id);
    return category ? category.toJSON() : null;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una categoría de transacción por ID' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.update(id, dto);
    return category.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una categoría por ID' })
  @ApiResponse({ status: 200, description: 'Categoría eliminada exitosamente' })
  async delete(@Param('id') id: string) {
    const success = await this.categoryRepository.delete(id);
    return { success };
  }
}
