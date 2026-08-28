import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Role } from '@prisma/client';

import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAdminUserDto } from './dtos/create-user.dto';
import { UpdateAdminUserDto } from './dtos/update-user.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResetPasswordDto } from './dtos/reset-password.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios del sistema (Admin)' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario con rol asignado (Admin)' })
  async createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar rol, estado o perfil de un usuario (Admin)',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    return this.adminService.updateUser(user.userId, id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Restablecer contraseña de un usuario (Admin)' })
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.adminService.resetPassword(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un usuario y sus datos asociados (Admin)',
  })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    return this.adminService.deleteUser(user.userId, id);
  }
}
