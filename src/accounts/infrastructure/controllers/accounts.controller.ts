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

import { CreateAccountDto } from '../dtos/create-account.dto';
import { UpdateAccountDto } from '../dtos/update-account.dto';
import { AccountRepositoryPort } from '../../application/ports/account.repository.port';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountRepository: AccountRepositoryPort) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cuenta o billetera' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de cuenta inválidos' })
  async create(@Body() dto: CreateAccountDto) {
    const account = await this.accountRepository.create(dto);
    return account.toJSON();
  }

  @Get()
  @ApiOperation({ summary: 'Listar cuentas por ID de usuario' })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID del usuario propietario',
  })
  @ApiResponse({ status: 200, description: 'Lista de cuentas del usuario' })
  async findByUserId(@Query('userId') userId: string) {
    if (!userId) {
      return [];
    }
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((acc) => acc.toJSON());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una cuenta por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la cuenta' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async findById(@Param('id') id: string) {
    const account = await this.accountRepository.findById(id);
    return account ? account.toJSON() : null;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una cuenta o billetera por ID' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const account = await this.accountRepository.update(id, dto);
    return account.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cuenta por ID' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada exitosamente' })
  async delete(@Param('id') id: string) {
    const success = await this.accountRepository.delete(id);
    return { success };
  }

  @Post(':id/reconcile')
  @ApiOperation({ summary: 'Conciliar y ajustar el saldo real de la cuenta' })
  @ApiResponse({ status: 200, description: 'Cuenta conciliada y saldo ajustado' })
  async reconcile(
    @Param('id') id: string,
    @Body() dto: { realBalance: number; note?: string },
  ) {
    const result = await this.accountRepository.reconcile(id, dto.realBalance, dto.note);
    return {
      account: result.account.toJSON(),
      discrepancy: result.discrepancy,
    };
  }
}
