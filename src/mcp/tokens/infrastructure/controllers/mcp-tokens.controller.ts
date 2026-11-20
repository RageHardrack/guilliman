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
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Role } from '@prisma/client';

import { Roles } from '../../../../auth/roles.decorator';
import { RolesGuard } from '../../../../auth/roles.guard';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { CreateMcpTokenDto } from '../dtos/create-mcp-token.dto';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { McpTokenService } from '../../application/mcp-token.service';

interface AuthenticatedUser {
  userId: string;
}

/**
 * MCP access token management for an authenticated ADMIN (S3). The owner is
 * always the JWT subject; a userId in the body is ignored.
 */
@ApiTags('MCP tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('mcp/tokens')
export class McpTokensController {
  constructor(private readonly tokens: McpTokenService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un token MCP (el valor en claro se muestra una sola vez)',
  })
  @ApiResponse({
    status: 201,
    description: 'Token creado; incluye `token` en claro',
  })
  @ApiResponse({ status: 400, description: 'Nombre de token inválido' })
  @ApiResponse({ status: 401, description: 'Sin JWT de sesión' })
  @ApiResponse({ status: 403, description: 'JWT sin rol ADMIN' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMcpTokenDto,
  ) {
    return this.tokens.create(user.userId, dto.name);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar los tokens MCP del usuario (sin valor ni hash)',
  })
  @ApiResponse({ status: 200, description: 'Tokens del usuario' })
  @ApiResponse({ status: 401, description: 'Sin JWT de sesión' })
  @ApiResponse({ status: 403, description: 'JWT sin rol ADMIN' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.tokens.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar un token MCP propio' })
  @ApiResponse({ status: 200, description: 'Token revocado' })
  @ApiResponse({
    status: 404,
    description: 'Token inexistente o de otro usuario',
  })
  @ApiResponse({ status: 401, description: 'Sin JWT de sesión' })
  @ApiResponse({ status: 403, description: 'JWT sin rol ADMIN' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tokens.revoke(user.userId, id);
  }
}
