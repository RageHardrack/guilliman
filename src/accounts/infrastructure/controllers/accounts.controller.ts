import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreateAccountDto } from '../dtos/create-account.dto';
import { UpdateAccountDto } from '../dtos/update-account.dto';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { AccountRepositoryPort } from '../../application/ports/account.repository.port';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountRepository: AccountRepositoryPort) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cuenta o billetera' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de cuenta inválidos' })
  @ApiResponse({ status: 401, description: 'Autenticación requerida' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateAccountDto,
  ) {
    // userId always comes from the JWT; any userId in the body is ignored.
    const { userId: _ignoredUserId, ...data } = dto;
    const account = await this.accountRepository.create({
      ...data,
      userId: user.userId,
    });
    return account.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar las cuentas del usuario autenticado' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Ignorado: el propietario siempre sale del token',
  })
  @ApiResponse({ status: 200, description: 'Lista de cuentas del usuario' })
  @ApiResponse({ status: 401, description: 'Autenticación requerida' })
  async findByUserId(
    @CurrentUser() user: { userId: string },
    @Query('userId') _queryUserId?: string,
  ) {
    const accounts = await this.accountRepository.findByUserId(user.userId);
    return accounts.map((acc) => acc.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una cuenta por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la cuenta' })
  @ApiResponse({
    status: 404,
    description: 'Cuenta no encontrada o de otro usuario',
  })
  @ApiResponse({ status: 401, description: 'Autenticación requerida' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const account = await this.accountRepository.findById(id, user.userId);
    return account.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una cuenta o billetera por ID' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada exitosamente' })
  @ApiResponse({
    status: 404,
    description: 'Cuenta no encontrada o de otro usuario',
  })
  @ApiResponse({ status: 401, description: 'Autenticación requerida' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateAccountDto,
  ) {
    const account = await this.accountRepository.update(id, user.userId, dto);
    return account.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cuenta por ID' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada exitosamente' })
  @ApiResponse({
    status: 404,
    description: 'Cuenta no encontrada o de otro usuario',
  })
  @ApiResponse({ status: 401, description: 'Autenticación requerida' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const success = await this.accountRepository.delete(id, user.userId);
    return { success };
  }

  @Post(':id/reconcile')
  @ApiOperation({ summary: 'Conciliar y ajustar el saldo real de la cuenta' })
  @ApiResponse({
    status: 200,
    description: 'Cuenta conciliada y saldo ajustado',
  })
  @ApiResponse({
    status: 404,
    description: 'Cuenta no encontrada o de otro usuario',
  })
  @ApiResponse({ status: 401, description: 'Autenticación requerida' })
  async reconcile(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: { realBalance: number; note?: string },
  ) {
    const result = await this.accountRepository.reconcile(
      id,
      user.userId,
      dto.realBalance,
      dto.note,
    );
    return {
      account: result.account.toJSON(),
      discrepancy: result.discrepancy,
    };
  }
}
