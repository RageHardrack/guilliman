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
  Inject,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { CreateTransactionTemplateDto } from '../dtos/create-transaction-template.dto';
import { UpdateTransactionTemplateDto } from '../dtos/update-transaction-template.dto';
import type { TransactionTemplateRepositoryPort } from '../../application/ports/transaction-template.repository.port';

@ApiTags('TransactionTemplates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transaction-templates')
export class TransactionTemplatesController {
  constructor(
    @Inject('TRANSACTION_TEMPLATE_REPOSITORY_PORT')
    private readonly repository: TransactionTemplateRepositoryPort,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una plantilla de transacción' })
  @ApiResponse({ status: 201, description: 'Plantilla creada con éxito' })
  @ApiResponse({ status: 400, description: 'Datos de plantilla inválidos' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateTransactionTemplateDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    const template = await this.repository.create({
      userId: user.userId,
      name: dto.name,
      type: dto.type,
      accountId: dto.accountId,
      destinationAccountId: dto.destinationAccountId,
      categoryId: dto.categoryId,
      defaultAmount: dto.defaultAmount,
      note: dto.note,
    });

    return template.toJSON();
  }

  @Get()
  @ApiOperation({
    summary: 'Listar las plantillas del usuario (uso reciente primero)',
  })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  async findAll(@CurrentUser() user: { userId: string }) {
    const templates = await this.repository.findAllByUserId(user.userId);
    return templates.map((template) => template.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una plantilla por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la plantilla' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const template = await this.repository.findById(id, user.userId);
    return template.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una plantilla existente' })
  @ApiResponse({ status: 200, description: 'Plantilla actualizada con éxito' })
  @ApiResponse({ status: 400, description: 'Datos de plantilla inválidos' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateTransactionTemplateDto,
  ) {
    const template = await this.repository.update(id, user.userId, {
      name: dto.name,
      type: dto.type,
      accountId: dto.accountId,
      destinationAccountId: dto.destinationAccountId,
      categoryId: dto.categoryId,
      defaultAmount: dto.defaultAmount,
      note: dto.note,
    });

    return template.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una plantilla' })
  @ApiResponse({ status: 200, description: 'Plantilla eliminada con éxito' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.repository.delete(id, user.userId);
    return { success: true };
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar una plantilla como usada (registro rápido)',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla con lastUsedAt actualizado',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async use(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    const template = await this.repository.markUsed(id, user.userId);
    return template.toJSON();
  }
}
