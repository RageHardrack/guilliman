import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { CategoryRepositoryPort } from '../../application/ports/category.repository.port';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryRepository: CategoryRepositoryPort) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva categoría de transacción' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de categoría inválidos' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCategoryDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    const category = await this.categoryRepository.create({
      userId: user.userId,
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      parentId: dto.parentId,
      taxCategory: dto.taxCategory,
      taxDeductionType: dto.taxDeductionType,
      budgetGroup: dto.budgetGroup,
    });
    return category.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar las categorías del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de categorías del usuario' })
  async findByUserId(@CurrentUser() user: { userId: string }) {
    const categories = await this.categoryRepository.findByUserId(user.userId);
    return categories.map((cat) => cat.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una categoría por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la categoría' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const category = await this.categoryRepository.findById(id, user.userId);
    return category.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una categoría de transacción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos de categoría inválidos' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.categoryRepository.update(id, user.userId, {
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      parentId: dto.parentId,
      taxCategory: dto.taxCategory,
      taxDeductionType: dto.taxDeductionType,
      budgetGroup: dto.budgetGroup,
    });
    return category.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una categoría por ID' })
  @ApiResponse({ status: 200, description: 'Categoría eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.categoryRepository.delete(id, user.userId);
    return { success: true };
  }
}
