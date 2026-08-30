import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetExchangeRatesUseCase } from '../application/use-cases/get-exchange-rates.use-case';
import { SyncOfficialRatesUseCase } from '../application/use-cases/sync-official-rates.use-case';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Exchange Rates')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly getExchangeRatesUseCase: GetExchangeRatesUseCase,
    private readonly syncOfficialRatesUseCase: SyncOfficialRatesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener tasas de cambio oficiales actuales',
    description: 'Devuelve las tasas de cambio base USD a PEN (SUNAT) y VES (BCV) con timestamps y fuentes.',
  })
  @ApiResponse({ status: 200, description: 'Tasas de cambio oficiales obtenidas con éxito.' })
  async getRates() {
    return this.getExchangeRatesUseCase.execute();
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sincronizar manualmente las tasas con fuentes oficiales (SUNAT y BCV)',
    description: 'Dispara la consulta directa a las fuentes oficiales y actualiza la base de datos.',
  })
  @ApiResponse({ status: 200, description: 'Sincronización completada.' })
  async syncRates() {
    return this.syncOfficialRatesUseCase.execute();
  }
}
