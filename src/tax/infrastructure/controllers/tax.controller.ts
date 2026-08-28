import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { TaxService } from '../../tax.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { UpdateTaxProfileDto } from '../dtos/update-tax-profile.dto';

@ApiTags('Tax (Impuestos & SUNAT)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('profile/:userId')
  @ApiOperation({
    summary: 'Obtener configuración del perfil tributario del usuario',
  })
  async getProfile(@Param('userId') userId: string) {
    return this.taxService.getProfile(userId);
  }

  @Patch('profile/:userId')
  @ApiOperation({
    summary: 'Actualizar perfil tributario (activar/desactivar, país, RUC)',
  })
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateTaxProfileDto,
  ) {
    return this.taxService.updateProfile(userId, dto);
  }

  @Get('projection/:userId')
  @ApiOperation({
    summary:
      'Obtener proyección y cálculo del Impuesto a la Renta de 4ta y 5ta Categoría',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  async getProjection(
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    const fiscalYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.taxService.calculateProjection(userId, fiscalYear);
  }

  @Get('deductibles/:userId')
  @ApiOperation({
    summary: 'Listar gastos deducibles computados para las 3 UIT adicionales',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  async getDeductibles(
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    const fiscalYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.taxService.getDeductibleItems(userId, fiscalYear);
  }
}
