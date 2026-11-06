import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { TaxService } from '../../tax.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
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
  async getProfile(
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
  ) {
    this.assertRouteUser(user, userId);
    return this.taxService.getProfile(userId);
  }

  @Patch('profile/:userId')
  @ApiOperation({
    summary: 'Actualizar perfil tributario (activar/desactivar, país, RUC)',
  })
  async updateProfile(
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
    @Body() dto: UpdateTaxProfileDto,
  ) {
    this.assertRouteUser(user, userId);
    return this.taxService.updateProfile(userId, dto);
  }

  @Get('projection/:userId')
  @ApiOperation({
    summary:
      'Obtener proyección y cálculo del Impuesto a la Renta de 4ta y 5ta Categoría',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  async getProjection(
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    this.assertRouteUser(user, userId);
    const fiscalYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.taxService.calculateProjection(userId, fiscalYear);
  }

  @Get('deductibles/:userId')
  @ApiOperation({
    summary: 'Listar gastos deducibles computados para las 3 UIT adicionales',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  async getDeductibles(
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    this.assertRouteUser(user, userId);
    const fiscalYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.taxService.getDeductibleItems(userId, fiscalYear);
  }

  /**
   * The :userId in the route is kept for compatibility; it may only ever
   * point at the token user, otherwise the request is refused with 403 and
   * the service is never called.
   */
  private assertRouteUser(user: { userId: string }, userId: string): void {
    if (userId !== user.userId) {
      throw new ForbiddenException(
        'The userId in the route does not match the authenticated user',
      );
    }
  }
}
