import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PortfolioService } from '../application/portfolio.service';

@ApiTags('Portfolio')
@Controller()
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('portfolio')
  @ApiOperation({ summary: 'Obtener resumen del portfolio' })
  @ApiResponse({ status: 200, description: 'Resumen de proyectos y perfil' })
  async getPortfolio() {
    return this.portfolioService.getPortfolio();
  }

  @Get('projects/:slug')
  @ApiOperation({ summary: 'Obtener detalle de proyecto por slug' })
  @ApiResponse({ status: 200, description: 'Detalle del proyecto' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getProjectDetail(@Param('slug') slug: string) {
    return this.portfolioService.getProjectDetail(slug);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Obtener listado de habilidades técnicas' })
  @ApiResponse({ status: 200, description: 'Lista de habilidades' })
  async getSkills() {
    return this.portfolioService.getSkills();
  }

  @Get('experience')
  @ApiOperation({ summary: 'Obtener historial de experiencia laboral' })
  @ApiResponse({ status: 200, description: 'Lista de experiencias' })
  async getExperience() {
    return this.portfolioService.getExperience();
  }
}
