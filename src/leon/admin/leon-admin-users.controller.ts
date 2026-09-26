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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeonRole } from '@prisma/client';

import { LeonAdminUsersService } from './leon-admin-users.service';
import {
  CreateLeonUserDto,
  ResetLeonPasswordDto,
  UpdateLeonUserDto,
} from './dtos/leon-admin-user.dto';
import { LeonRoles } from '../guards/leon-roles.decorator';
import { LeonRolesGuard } from '../guards/leon-roles.guard';
import { LeonJwtAuthGuard } from '../guards/leon-jwt-auth.guard';
import { CurrentLeonUser } from '../auth/current-leon-user.decorator';
import type { CurrentLeonUserData } from '../auth/current-leon-user.decorator';

@ApiTags('Leon Admin')
@ApiBearerAuth()
@UseGuards(LeonJwtAuthGuard, LeonRolesGuard)
@LeonRoles(LeonRole.ADMIN)
@Controller('leon/admin/users')
export class LeonAdminUsersController {
  constructor(private readonly adminUsersService: LeonAdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all Leon users (Superadmin only)' })
  async listUsers() {
    return this.adminUsersService.listUsers();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Leon user (Superadmin only)' })
  async createUser(@Body() dto: CreateLeonUserDto) {
    return this.adminUsersService.createUser(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role, name or status of a Leon user' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateLeonUserDto,
    @CurrentLeonUser() user: CurrentLeonUserData,
  ) {
    return this.adminUsersService.updateUser(user.userId, id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Reset password of a Leon user (Superadmin only)' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetLeonPasswordDto,
  ) {
    return this.adminUsersService.resetPassword(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Leon user (Superadmin only)' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentLeonUser() user: CurrentLeonUserData,
  ) {
    return this.adminUsersService.deleteUser(user.userId, id);
  }
}
